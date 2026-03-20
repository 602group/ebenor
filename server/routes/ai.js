const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const { query } = require('../db/helpers');
const { logActivity } = require('../utils/activity');

router.post('/chat', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { messages, context } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured in the server environment.' });
    }

    const openai = new OpenAI({ apiKey });

    // Define the system instructions context
    const systemPrompt = `You are the Investment Platform AI Assistant, an internal operator designed to help the user manage data, retrieve insights, and summarize records. 
You provide clean, structured responses using markdown, bullet points, and tables. 
When appropriate, use the provided tools to query the platform's database.
If the user's query refers to the current page they are viewing (e.g., "summarize this property"), use the provided context below.

Current Context:
${context ? JSON.stringify(context) : 'None provided'}`;

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    // Define the tools
    const tools = [
      {
        type: "function",
        function: {
          name: "get_trades",
          description: "Retrieve trades from the database, optionally filtering by status.",
          parameters: {
            type: "object",
            properties: {
              status: { type: "string", description: "Filter by status (e.g., 'open', 'closed', 'planned')." },
              limit: { type: "number", description: "Maximum number of records to return." }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_properties",
          description: "Retrieve real estate properties/deals from the pipeline.",
          parameters: {
            type: "object",
            properties: {
              status: { type: "string", description: "Filter by status (e.g., 'evaluating', 'offered', 'closed_won')." },
              limit: { type: "number", description: "Maximum number of records to return." }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_notes",
          description: "Retrieve research notes or general notes.",
          parameters: {
            type: "object",
            properties: {
              search: { type: "string", description: "Search keyword in the title or content." },
              limit: { type: "number", description: "Maximum number of records to return." }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_portfolio_assets",
          description: "Get summary of portfolio assets (stocks, real estate, forex).",
          parameters: {
            type: "object",
            properties: {
              asset_class: { type: "string", description: "Asset class (e.g., 'stock', 'real_estate', 'forex')." }
            }
          }
        }
      }
    ];

    // Initial call to OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: apiMessages,
      tools: tools,
      tool_choice: "auto"
    });

    const responseMessage = response.choices[0].message;

    // Handle tool calls
    if (responseMessage.tool_calls) {
      apiMessages.push(responseMessage); // Add the assistant's tool call request to the messages array
      
      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let toolResult = [];

        try {
          if (functionName === 'get_trades') {
            let sql = `SELECT * FROM trades WHERE 1=1`;
            const params = [];
            if (args.status) { sql += ` AND status = ?`; params.push(args.status); }
            sql += ` ORDER BY created_at DESC LIMIT ?`;
            params.push(args.limit || 10);
            toolResult = query(db, sql, params);
          } 
          else if (functionName === 'get_properties') {
            let sql = `SELECT * FROM properties WHERE 1=1`;
            const params = [];
            if (args.status) { sql += ` AND status = ?`; params.push(args.status); }
            sql += ` ORDER BY created_at DESC LIMIT ?`;
            params.push(args.limit || 10);
            toolResult = query(db, sql, params);
          }
          else if (functionName === 'get_notes') {
            let sql = `SELECT * FROM notes WHERE 1=1`;
            const params = [];
            if (args.search) { 
              sql += ` AND (title LIKE ? OR content LIKE ?)`; 
              params.push(`%${args.search}%`, `%${args.search}%`); 
            }
            sql += ` ORDER BY created_at DESC LIMIT ?`;
            params.push(args.limit || 10);
            toolResult = query(db, sql, params);
          }
          else if (functionName === 'get_portfolio_assets') {
            let sql = `SELECT * FROM assets WHERE 1=1`;
            const params = [];
            if (args.asset_class) { sql += ` AND asset_class = ?`; params.push(args.asset_class); }
            sql += ` ORDER BY value DESC LIMIT 50`;
            toolResult = query(db, sql, params);
          }
        } catch (dbErr) {
          console.error(`DB Tool Error in ${functionName}:`, dbErr);
          toolResult = { error: "Failed to execute database query." };
        }

        apiMessages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify(toolResult)
        });
      }

      // Second call to let AI format the tool results
      const finalResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: apiMessages
      });

      const finalMessage = finalResponse.choices[0].message;
      
      // Log the AI activity
      try {
        const lastUserMessage = messages.slice().reverse().find(m => m.role === 'user')?.content || 'Unknown query';
        logActivity(req.user?.id || 'system', 'ai_interaction', 'system', null, `Prompt: ${lastUserMessage.substring(0, 50)}...`);
      } catch (logErr) {
        console.error('Failed to log AI activity:', logErr);
      }

      return res.json({ message: finalMessage });

    } else {
      // No tool calls, just return the AI's response
      // Log the AI activity
      try {
        const lastUserMessage = messages.slice().reverse().find(m => m.role === 'user')?.content || 'Unknown query';
        logActivity(req.user?.id || 'system', 'ai_interaction', 'system', null, `Prompt: ${lastUserMessage.substring(0, 50)}...`);
      } catch (logErr) {
        console.error('Failed to log AI activity:', logErr);
      }

      return res.json({ message: responseMessage });
    }

  } catch (error) {
    console.error('AI Route Error:', error);
    res.status(500).json({ error: error.message || 'Error processing AI request' });
  }
});

module.exports = router;
