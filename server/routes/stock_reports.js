const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { OpenAI } = require('openai');
const { query, run } = require('../db/helpers');
const { logActivity } = require('../utils/activity');
const { saveDB } = require('../db/database');

// Helper to mock rich financial data that would normally come from Bloomberg / AlphaVantage
function fetchMockStockData(ticker) {
  const seed = ticker ? ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 42;
  const currentPrice = 10 + (seed % 300) + (seed % 100) / 100;
  
  return {
    price_metrics: {
      current_price: currentPrice,
      market_cap: `${(1 + (seed % 2000)) / 10}B`,
      volume: 1000000 + (seed * 15000),
      week_52_high: currentPrice * 1.3,
      week_52_low: currentPrice * 0.7,
      beta: (0.5 + (seed % 15) / 10).toFixed(2),
    },
    financials: {
      revenue_ttm: `${(5 + (seed % 500)) / 10}B`,
      revenue_growth_yoy: (seed % 40) - 10, // -10% to +30%
      net_income: `${(1 + (seed % 100)) / 10}B`,
      profit_margin: (5 + (seed % 25)),
      debt_to_equity: (0.1 + (seed % 20) / 10).toFixed(2),
      free_cash_flow: `${(seed % 50) / 10}B`,
    },
    valuation: {
      pe_ratio: 10 + (seed % 50),
      forward_pe: 8 + (seed % 40),
      price_to_book: (1 + (seed % 15) / 10).toFixed(2),
      ev_ebitda: 5 + (seed % 25),
    },
    technicals: {
      sma_50: currentPrice * (1 + ((seed % 20) - 10) / 100),
      sma_200: currentPrice * (1 + ((seed % 40) - 20) / 100),
      rsi_14: 30 + (seed % 45), // 30 to 75
    },
    sentiment: {
      news_sentiment: (seed % 3 === 0) ? 'Bearish' : (seed % 2 === 0) ? 'Neutral' : 'Bullish',
      analyst_consensus: (seed % 4 === 0) ? 'Hold' : 'Buy',
    }
  };
}

// ─── GET ALL REPORTS ────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const reports = query(db, `SELECT * FROM stock_reports ORDER BY created_at DESC`);
  res.json(reports);
});

// ─── GET REPORTS FOR A SPECIFIC ASSET ────────────────────────────────────
router.get('/asset/:asset_id', (req, res) => {
  const db = req.app.locals.db;
  const reports = query(db, `SELECT * FROM stock_reports WHERE asset_id = ? ORDER BY created_at DESC`, [req.params.asset_id]);
  res.json(reports);
});

// ─── GET A SPECIFIC REPORT ──────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const reports = query(db, `SELECT * FROM stock_reports WHERE id = ?`, [req.params.id]);
  if (!reports.length) return res.status(404).json({ error: 'Report not found' });
  res.json(reports[0]);
});

// ─── GENERATE NEW REPORT (AI ENGINE) ────────────────────────────────────────
router.post('/generate', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { asset_id, ticker, company_name, horizon, strategy, notes } = req.body;

    if (!ticker || ticker.trim() === '') {
      return res.status(400).json({ error: 'A valid stock ticker is required to generate a report.' });
    }

    const cleanTicker = ticker.toUpperCase().trim();
    
    // 1. Determine Context
    let assetRecord = null;
    let fallbackCompanyName = company_name || `${cleanTicker} Corp`;

    if (asset_id) {
      const records = query(db, `SELECT * FROM assets WHERE id = ?`, [asset_id]);
      if (records.length) {
        assetRecord = records[0];
        if (assetRecord.name) fallbackCompanyName = assetRecord.name;
      }
    }

    // 2. Fetch "Mock" Stock Market Context
    const mockData = fetchMockStockData(cleanTicker);
    
    // Construct the data payload for the AI
    const rawDataPayload = {
      target_equity: {
        ticker: cleanTicker,
        company_name: fallbackCompanyName,
        user_horizon: horizon || 'Unknown',
        user_strategy: strategy || 'Unknown',
        user_notes: notes || 'None',
      },
      ...mockData
    };

    // 3. Setup OpenAI Call
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server.' });
    }
    const openai = new OpenAI({ apiKey });

    const systemPrompt = `You are a world-class institutional equity research analyst and AI underwriting desk.
You are tasked with generating a comprehensive "Stock Analysis & Investment Intelligence Report" based on the provided raw market metrics and financial data.
Do not hallucinate exact external numbers if data is missing; instead, logically extrapolate based on the provided mock data.
You MUST format your response as a strictly valid JSON object. Do not wrap it in markdown codeblocks like \`\`\`json. Just return the raw JSON object.

The JSON MUST exactly match this structure:
{
  "section_1_executive_summary": {
    "fair_value_vs_price": "Paragraph detailing current price vs perceived fair value.",
    "recommendation": "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell",
    "key_reasoning": "A 2-3 sentence core thesis statement.",
    "strengths": ["string", "string", "string"],
    "risks": ["string", "string", "string"]
  },
  "section_2_price_data": "Paragraph synthesizing the raw price and volume metrics.",
  "section_3_valuation": {
    "score": 0, // out of 100
    "fair_value_estimate_low": 0,
    "fair_value_estimate_high": 0,
    "narrative": "Paragraph assessing P/E, EV/EBITDA, etc."
  },
  "section_4_financial_health": {
    "score": 0, // out of 100
    "narrative": "Paragraph assessing balance sheet, debt-to-equity, cash flow, margins."
  },
  "section_5_growth": {
    "score": 0, // out of 100
    "narrative": "Paragraph evaluating YoY revenue and earnings growth signals."
  },
  "section_6_technical": {
    "score": 0, // out of 100
    "narrative": "Paragraph analyzing trend direction (SMA) and momentum (RSI)."
  },
  "section_7_sentiment": {
    "score": 0, // out of 100
    "narrative": "Paragraph analyzing news and analyst consensus."
  },
  "section_8_sector_macro": "Paragraph discussing the stock's place in its broader sector/macro trends.",
  "section_9_risk_analysis": [
    { "type": "Market", "severity": "High/Medium/Low", "description": "string" },
    { "type": "Company-Specific", "severity": "High/Medium/Low", "description": "string" }
  ],
  "section_10_ai_verdict": {
    "overall_score": 0, // out of 100
    "recommendation": "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell",
    "suggested_strategy": "Long-Term Hold" | "Swing Trade" | "Short" | "Avoid",
    "time_horizon": "Short" | "Medium" | "Long",
    "narrative": "Your final concluding verdict."
  },
  "section_11_scenarios": {
    "bull_case": "Narrative for bull scenario.",
    "base_case": "Narrative for base expected scenario.",
    "bear_case": "Narrative for downside risk scenario."
  },
  "section_12_advanced": {
    "entry_zones": ["$X - $Y", "$Z"],
    "exit_targets": ["$A", "$B"],
    "stop_loss_suggestions": ["$C"]
  }
}`;

    const userPrompt = `Here is the raw data for the subject equity (Ticker: ${cleanTicker}):\n${JSON.stringify(rawDataPayload, null, 2)}\n\nPlease generate the JSON report.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Analytical
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

    const valScore = reportJson.section_3_valuation?.score || 0;
    const finalScore = reportJson.section_10_ai_verdict?.overall_score || 0;
    const finalRec = reportJson.section_10_ai_verdict?.recommendation || 'Unknown';
    const reportStr = JSON.stringify(reportJson);
    const currPrice = rawDataPayload.price_metrics.current_price;

    run(db, `
      INSERT INTO stock_reports 
      (id, asset_id, ticker, company_name, price_at_time, valuation_score, overall_score, recommendation, report_data, status, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      reportId, asset_id || null, cleanTicker, fallbackCompanyName, currPrice, valScore, finalScore, finalRec, reportStr, 'completed', userId, now, now
    ]);

    // Update parent asset if applicable? Usually not needed for stocks, but let's log Activity.
    if (asset_id && assetRecord) {
      logActivity(userId, 'report_generated', 'asset', asset_id, assetRecord.name || cleanTicker);
    } else {
      logActivity(userId, 'report_generated', 'stock_report', reportId, cleanTicker);
    }

    saveDB();

    // 5. Return success
    const resultQuery = query(db, `SELECT * FROM stock_reports WHERE id = ?`, [reportId]);
    res.status(201).json(resultQuery[0]);

  } catch (error) {
    console.error('Stock Report Gen Error:', error);
    res.status(500).json({ error: error.message || 'Error generating stock report.' });
  }
});

module.exports = router;
