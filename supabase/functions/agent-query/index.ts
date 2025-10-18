import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://deno.land/x/openai@v4.20.1/mod.ts";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Initialize OpenAI client for Azure GPT-5
const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY")!,
  baseURL: Deno.env.get("OPENAI_BASE_URL")!,
});

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface AgentRequest {
  query: string;
  account_code?: string;
  session_id?: string;
}

interface AgentResponse {
  response: string;
  intent?: string;
  data?: any;
  sql_query?: string;
}

// Intent classification using GPT-5
async function classifyIntent(query: string): Promise<{
  intent: string;
  entities: Record<string, any>;
}> {
  const response = await openai.chat.completions.create({
    model: Deno.env.get("OPENAI_MODEL_NAME") || "gpt-5",
    messages: [
      {
        role: "system",
        content: `You are an intent classifier for a financial trading assistant. Classify the user query into one of these intents:
- trade_history: Queries about past trades
- account_balance: Queries about account balances, buying power, P&L
- market_data: Queries about stock prices, quotes, charts
- order_management: Placing or managing orders
- fees_commissions: Queries about fees and commissions

Extract relevant entities like symbols, dates, trade types, etc.

Respond in JSON format:
{
  "intent": "intent_name",
  "entities": {
    "symbol": "AAPL",
    "date_range": "last week",
    "trade_type": "buy"
  }
}`,
      },
      {
        role: "user",
        content: query,
      },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

// Generate SQL query from natural language
async function generateSQL(
  query: string,
  intent: string,
  entities: Record<string, any>,
  accountCode?: string
): Promise<string> {
  const schemaContext = `
Database Schema:
- trade_data: account_code, date, trade_id, trade_type (B/S), security_type (S/O), symbol, stock_trade_price, stock_share_qty, gross_amount, commission
- acct_balances: account_code, date, cash_balance, account_equity, day_trading_bp, stock_lmv, stock_smv
- acct_fees: account_code, date, type, amount, symbol
`;

  const response = await openai.chat.completions.create({
    model: Deno.env.get("OPENAI_MODEL_NAME") || "gpt-5",
    messages: [
      {
        role: "system",
        content: `You are a SQL query generator for PostgreSQL. Generate safe, read-only SQL queries based on user requests.
${schemaContext}

Rules:
1. Only generate SELECT queries (no INSERT/UPDATE/DELETE)
2. Always filter by account_code if provided
3. Use proper date formatting
4. Include LIMIT clauses for safety
5. Return only the SQL query, no explanations`,
      },
      {
        role: "user",
        content: `Query: ${query}\nIntent: ${intent}\nEntities: ${JSON.stringify(entities)}\nAccount: ${accountCode || "unknown"}`,
      },
    ],
    temperature: 0.1,
  });

  return response.choices[0].message.content?.trim() || "";
}

// Format results into natural language
async function formatResponse(
  query: string,
  data: any[],
  intent: string
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: Deno.env.get("OPENAI_MODEL_NAME") || "gpt-5",
    messages: [
      {
        role: "system",
        content: `You are a financial assistant. Convert the query results into a natural, conversational response. Be concise and helpful.`,
      },
      {
        role: "user",
        content: `User asked: "${query}"\n\nQuery results: ${JSON.stringify(data, null, 2)}\n\nProvide a helpful response:`,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  return response.choices[0].message.content || "I couldn't process that request.";
}

// Main agent orchestration
async function processQuery(request: AgentRequest): Promise<AgentResponse> {
  const { query, account_code, session_id } = request;

  try {
    // Step 1: Classify intent
    console.log("Classifying intent...");
    const { intent, entities } = await classifyIntent(query);
    console.log("Intent:", intent, "Entities:", entities);

    // Step 2: Handle different intents
    let data: any[] = [];
    let sqlQuery = "";

    if (intent === "trade_history" || intent === "account_balance" || intent === "fees_commissions") {
      // Generate SQL query
      console.log("Generating SQL...");
      sqlQuery = await generateSQL(query, intent, entities, account_code);
      console.log("SQL Query:", sqlQuery);

      // Execute query
      const { data: queryData, error } = await supabase.rpc("execute_sql", {
        query: sqlQuery,
      });

      if (error) {
        console.error("SQL Error:", error);
        // Fallback: try direct query
        const tableName = intent === "trade_history" ? "trade_data" :
                         intent === "account_balance" ? "acct_balances" : "acct_fees";
        const { data: fallbackData, error: fallbackError } = await supabase
          .from(tableName)
          .select("*")
          .eq("account_code", account_code || "LS123456")
          .limit(10);
        
        if (fallbackError) throw fallbackError;
        data = fallbackData || [];
      } else {
        data = queryData || [];
      }
    } else if (intent === "market_data") {
      // This would call Alpaca API (to be implemented)
      data = [{ message: "Market data integration coming soon" }];
    } else if (intent === "order_management") {
      // This would handle order placement (to be implemented)
      data = [{ message: "Order management integration coming soon" }];
    }

    // Step 3: Format response
    console.log("Formatting response...");
    const response = await formatResponse(query, data, intent);

    // Step 4: Save conversation history
    if (session_id) {
      await supabase.from("conversation_history").insert({
        session_id,
        account_code,
        role: "user",
        content: query,
      });

      await supabase.from("conversation_history").insert({
        session_id,
        account_code,
        role: "assistant",
        content: response,
        metadata: { intent, entities },
      });
    }

    return {
      response,
      intent,
      data,
      sql_query: sqlQuery,
    };
  } catch (error) {
    console.error("Agent Error:", error);
    throw error;
  }
}

// Deno serve handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: AgentRequest = await req.json();
    console.log("Request:", requestData);

    const result = await processQuery(requestData);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
