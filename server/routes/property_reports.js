const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { OpenAI } = require('openai');
const { query, run } = require('../db/helpers');
const { logActivity } = require('../utils/activity');
const { saveDB } = require('../db/database');

// Helper to mock rich property data that would normally come from MLS / Zillow / public records
function fetchMockPropertyData(addressText) {
  // Generate deterministic variations based on string length to simulate real data
  const seed = addressText ? addressText.length : 42;
  const baseValue = 350000 + (seed * 15000);
  
  return {
    public_records: {
      last_sale_date: `201${seed % 8 + 2}-0${seed % 8 + 1}-15`,
      last_sale_price: Math.floor(baseValue * 0.65),
      year_built: 1980 + (seed % 40),
      tax_assessed_value: Math.floor(baseValue * 0.8),
      zoning: 'Residential - Single Family',
      flood_zone: (seed % 5 === 0) ? 'AE' : 'X',
    },
    comps: [
      { address: '123 Nearby St', distance_miles: 0.2, sale_price: baseValue + 15000, sale_date: '2 months ago', difference_reason: 'Updated kitchen' },
      { address: '456 Adjacent Blvd', distance_miles: 0.5, sale_price: baseValue - 25000, sale_date: '4 months ago', difference_reason: 'Needs roof replacement' },
      { address: '789 Parallel Ln', distance_miles: 0.8, sale_price: baseValue + 5000, sale_date: '1 month ago', difference_reason: 'Similar condition' },
    ],
    market_metrics: {
      avg_days_on_market: 24 + (seed % 20),
      inventory_trend: (seed % 2 === 0) ? 'Increasing' : 'Decreasing',
      median_rent_local: Math.floor(baseValue * 0.0075),
      rent_growth_yoy_pct: 3.5 + (seed % 5),
    },
    neighborhood_demographics: {
      school_rating_avg: 6 + (seed % 4), // out of 10
      crime_index: (seed % 2 === 0) ? 'Low' : 'Moderate',
      walk_score: 40 + (seed % 50),
      transit_score: 30 + (seed % 40),
    }
  };
}

// ─── GET ALL REPORTS ────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const reports = query(db, `SELECT * FROM property_reports ORDER BY created_at DESC`);
  res.json(reports);
});

// ─── GET REPORTS FOR A SPECIFIC PROPERTY ────────────────────────────────────
router.get('/property/:property_id', (req, res) => {
  const db = req.app.locals.db;
  const reports = query(db, `SELECT * FROM property_reports WHERE property_id = ? ORDER BY created_at DESC`, [req.params.property_id]);
  res.json(reports);
});

// ─── GET A SPECIFIC REPORT ──────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const reports = query(db, `SELECT * FROM property_reports WHERE id = ?`, [req.params.id]);
  if (!reports.length) return res.status(404).json({ error: 'Report not found' });
  res.json(reports[0]);
});

// ─── GENERATE NEW REPORT (AI ENGINE) ────────────────────────────────────────
router.post('/generate', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { property_id, address, city, state, zip, beds, baths, sqft, property_type } = req.body;

    // 1. Gather Context
    let propertyRecord = null;
    let addressContext = '';
    
    if (property_id) {
      const records = query(db, `SELECT * FROM properties WHERE id = ?`, [property_id]);
      if (records.length) {
        propertyRecord = records[0];
        addressContext = `${propertyRecord.address || ''}, ${propertyRecord.city || ''}, ${propertyRecord.state || ''} ${propertyRecord.zip || ''}`.trim();
        // Fallback names
        if (addressContext === ',  ') addressContext = propertyRecord.name || `Property ID ${property_id}`;
      }
    } else {
      addressContext = `${address || ''}, ${city || ''}, ${state || ''} ${zip || ''}`.trim();
    }

    if (!addressContext || addressContext.length < 5) {
      if (propertyRecord && propertyRecord.name) {
        addressContext = propertyRecord.name;
      } else {
        return res.status(400).json({ error: 'Valid address or property identification is required to generate a report.' });
      }
    }

    // 2. Fetch "Mock" Real Estate Data API Context
    const mockData = fetchMockPropertyData(addressContext);
    
    // Construct the data payload for the AI
    const rawDataPayload = {
      target_property: {
        address: addressContext,
        beds: beds || propertyRecord?.bedrooms || 'Unknown',
        baths: baths || propertyRecord?.bathrooms || 'Unknown',
        sqft: sqft || propertyRecord?.sqft || 'Unknown',
        property_type: property_type || propertyRecord?.property_type || 'Unknown',
        asking_price: propertyRecord?.asking_price || 'Not Listed/Unknown',
      },
      public_records_data: mockData.public_records,
      comparable_sales: mockData.comps,
      market_trends: mockData.market_metrics,
      neighborhood_info: mockData.neighborhood_demographics,
    };

    // 3. Setup OpenAI Call
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server.' });
    }
    const openai = new OpenAI({ apiKey });

    const systemPrompt = `You are a world-class real estate investment analyst and underwriting AI. 
You are tasked with generating a comprehensive "Home Value Calculator & Property Intelligence Report" based on the provided raw property data and mock public records.
Do not hallucinate exact external numbers if data is missing; instead, extrapolate intelligently based on the provided mock data.
You MUST format your response as a strictly valid JSON object. Do not wrap it in markdown codeblocks like \`\`\`json. Just return the raw JSON object.

The JSON MUST exactly match this structure:
{
  "section_1_executive_summary": "A 2-3 sentence high-level summary of the property and its investability.",
  "section_2_estimated_value": {
    "midpoint": 0,
    "range_low": 0,
    "range_high": 0,
    "confidence_score": "High" | "Medium" | "Low" 
  },
  "section_3_comparables": "A detailed paragraph summarizing the provided comparable sales.",
  "section_4_property_snapshot": "A summary of the property's physical characteristics based on the data.",
  "section_5_history": "A summary of the public records, last sale, year built, etc.",
  "section_6_rent_potential": {
    "estimated_monthly_rent": 0,
    "annual_gross_rent": 0,
    "narrative": "Paragraph discussing rental demand based on market metrics."
  },
  "section_7_investment_metrics": "Narrative paragraph analyzing potential ROI, Cap Rate, and Cash flow assuming standard 20% down financing.",
  "section_8_strategy_fit": {
    "recommended_strategy": "Long-Term Rental" | "Fix-and-Flip" | "Short-Term Rental" | "Pass",
    "narrative": "Why this strategy fits best."
  },
  "section_9_neighborhood_score": {
    "score": 0, // out of 100
    "narrative": "Paragraph assessing the schools, crime, walkability."
  },
  "section_10_local_market": "Paragraph describing the current local inventory trend and days on market.",
  "section_11_risk_analysis": "Identify 2-3 specific risks (e.g. flood zone, older build year, inventory increasing).",
  "section_12_ai_verdict": {
    "investment_score": 0, // out of 100
    "verdict_title": "Strong Buy" | "Hold" | "Avoid" | "Needs Rehab",
    "narrative": "Your final concluding verdict on the deal."
  },
  "section_13_deal_structuring": "A short paragraph on how to negotiate or structure an offer for this specific property based on its market state."
}`;

    const userPrompt = `Here is the raw data for the subject property:\n${JSON.stringify(rawDataPayload, null, 2)}\n\nPlease generate the JSON report.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Keep it analytical and grounded
    });

    const aiText = response.choices[0].message.content;
    let reportJson;
    try {
      reportJson = JSON.parse(aiText);
    } catch (err) {
      console.error("Failed to parse AI response as JSON:", aiText);
      return res.status(500).json({ error: 'AI returned malformed JSON.' });
    }

    // 4. Save to Database
    const reportId = uuidv4();
    const now = new Date().toISOString();
    const userId = req.user?.id || null;

    // Extract core metrics for quick DB access
    const estMidpoint = reportJson.section_2_estimated_value?.midpoint || 0;
    const invScore = reportJson.section_12_ai_verdict?.investment_score || 0;
    const nbdScore = reportJson.section_9_neighborhood_score?.score || 0;
    const strategy = reportJson.section_8_strategy_fit?.recommended_strategy || 'Unknown';
    const reportStr = JSON.stringify(reportJson);

    run(db, `
      INSERT INTO property_reports 
      (id, property_id, address_snapshot, estimated_value, investment_score, neighborhood_score, recommended_strategy, report_data, status, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      reportId, property_id || null, addressContext, estMidpoint, invScore, nbdScore, strategy, reportStr, 'completed', userId, now, now
    ]);

    // Update the parent property's status or strategy if helpful (optional)
    if (property_id && propertyRecord) {
      if (!propertyRecord.strategy) {
        run(db, `UPDATE properties SET strategy = ? WHERE id = ?`, [strategy, property_id]);
      }
      logActivity(userId, 'report_generated', 'property', property_id, propertyRecord.name || addressContext);
    } else {
      logActivity(userId, 'report_generated', 'property_report', reportId, addressContext);
    }

    saveDB();

    // 5. Return success
    const resultQuery = query(db, `SELECT * FROM property_reports WHERE id = ?`, [reportId]);
    res.status(201).json(resultQuery[0]);

  } catch (error) {
    console.error('Property Report Gen Error:', error);
    res.status(500).json({ error: error.message || 'Error generating property report.' });
  }
});

module.exports = router;
