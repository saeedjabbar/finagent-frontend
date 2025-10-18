import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Alpaca configuration
const ALPACA_API_KEY = Deno.env.get("ALPACA_API_KEY")!;
const ALPACA_SECRET_KEY = Deno.env.get("ALPACA_SECRET_KEY")!;
const ALPACA_BASE_URL = Deno.env.get("ALPACA_BASE_URL") || "https://paper-api.alpaca.markets";

// Initialize Supabase for caching
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Cache duration in minutes
const CACHE_DURATION = {
  quote: 1,        // 1 minute for quotes
  bar: 60,         // 1 hour for historical bars
  snapshot: 1,     // 1 minute for snapshots
  fundamentals: 1440 // 24 hours for fundamentals
};

interface AlpacaRequest {
  action: "quote" | "bars" | "snapshot" | "account" | "positions" | "orders";
  symbol?: string;
  timeframe?: string;
  start?: string;
  end?: string;
  limit?: number;
}

// Get quote from Alpaca or cache
async function getQuote(symbol: string): Promise<any> {
  // Check cache first
  const { data: cached } = await supabase
    .from("market_data_cache")
    .select("*")
    .eq("symbol", symbol)
    .eq("data_type", "quote")
    .gt("expires_at", new Date().toISOString())
    .single();

  if (cached) {
    console.log(`Cache hit for quote: ${symbol}`);
    return cached.data;
  }

  // Fetch from Alpaca
  const response = await fetch(
    `${ALPACA_BASE_URL}/v2/stocks/${symbol}/quotes/latest`,
    {
      headers: {
        "APCA-API-KEY-ID": ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Alpaca API error: ${response.statusText}`);
  }

  const data = await response.json();

  // Cache the result
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + CACHE_DURATION.quote);

  await supabase.from("market_data_cache").insert({
    symbol,
    data_type: "quote",
    data,
    timestamp: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
  });

  return data;
}

// Get historical bars
async function getBars(
  symbol: string,
  timeframe: string = "1Day",
  start?: string,
  end?: string,
  limit: number = 100
): Promise<any> {
  const cacheKey = `${symbol}_${timeframe}_${start}_${end}`;
  
  // Check cache
  const { data: cached } = await supabase
    .from("market_data_cache")
    .select("*")
    .eq("symbol", symbol)
    .eq("data_type", "bar")
    .eq("timeframe", timeframe)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (cached) {
    console.log(`Cache hit for bars: ${symbol}`);
    return cached.data;
  }

  // Build URL with query parameters
  const params = new URLSearchParams({
    timeframe,
    limit: limit.toString(),
  });
  
  if (start) params.append("start", start);
  if (end) params.append("end", end);

  const response = await fetch(
    `${ALPACA_BASE_URL}/v2/stocks/${symbol}/bars?${params}`,
    {
      headers: {
        "APCA-API-KEY-ID": ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Alpaca API error: ${response.statusText}`);
  }

  const data = await response.json();

  // Cache the result
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + CACHE_DURATION.bar);

  await supabase.from("market_data_cache").insert({
    symbol,
    data_type: "bar",
    timeframe,
    data,
    timestamp: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
  });

  return data;
}

// Get market snapshot
async function getSnapshot(symbol: string): Promise<any> {
  const response = await fetch(
    `${ALPACA_BASE_URL}/v2/stocks/${symbol}/snapshot`,
    {
      headers: {
        "APCA-API-KEY-ID": ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Alpaca API error: ${response.statusText}`);
  }

  return await response.json();
}

// Get account information
async function getAccount(): Promise<any> {
  const response = await fetch(`${ALPACA_BASE_URL}/v2/account`, {
    headers: {
      "APCA-API-KEY-ID": ALPACA_API_KEY,
      "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Alpaca API error: ${response.statusText}`);
  }

  return await response.json();
}

// Get positions
async function getPositions(): Promise<any> {
  const response = await fetch(`${ALPACA_BASE_URL}/v2/positions`, {
    headers: {
      "APCA-API-KEY-ID": ALPACA_API_KEY,
      "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Alpaca API error: ${response.statusText}`);
  }

  return await response.json();
}

// Get orders
async function getOrders(): Promise<any> {
  const response = await fetch(`${ALPACA_BASE_URL}/v2/orders`, {
    headers: {
      "APCA-API-KEY-ID": ALPACA_API_KEY,
      "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Alpaca API error: ${response.statusText}`);
  }

  return await response.json();
}

// Main handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: AlpacaRequest = await req.json();
    const { action, symbol, timeframe, start, end, limit } = request;

    let result: any;

    switch (action) {
      case "quote":
        if (!symbol) throw new Error("Symbol required for quote");
        result = await getQuote(symbol);
        break;

      case "bars":
        if (!symbol) throw new Error("Symbol required for bars");
        result = await getBars(symbol, timeframe, start, end, limit);
        break;

      case "snapshot":
        if (!symbol) throw new Error("Symbol required for snapshot");
        result = await getSnapshot(symbol);
        break;

      case "account":
        result = await getAccount();
        break;

      case "positions":
        result = await getPositions();
        break;

      case "orders":
        result = await getOrders();
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Alpaca Proxy Error:", error);
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
