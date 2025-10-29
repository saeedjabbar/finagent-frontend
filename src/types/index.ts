export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  dayHigh?: number;
  dayLow?: number;
  yearHigh?: number;
  yearLow?: number;
  open?: number;
  previousClose?: number;
}

export interface Position {
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  totalValue: number;
  totalCost: number;
  gainLoss: number;
  gainLossPercent: number;
}

export interface Portfolio {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalCash: number;
  totalInvested: number;
  positions: Position[];
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  qty: number;
  price: number;
  timestamp: Date;
  status: 'executed' | 'pending' | 'cancelled';
}

export interface TradeActivity {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  shares: number | null;
  price: number | null;
  grossAmount: number | null;
  commission: number | null;
  netAmount: number | null;
  timestamp?: Date | string | null;
  date?: string | null;
  time?: string | null;
}

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
}

export interface ChartData {
  timestamp: number;
  price: number;
  volume?: number;
}

export interface VoiceCommand {
  text: string;
  type: 'query' | 'action';
  parameters?: Record<string, unknown>;
}
