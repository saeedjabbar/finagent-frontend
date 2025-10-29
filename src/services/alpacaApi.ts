import type { Stock, Portfolio, Position, ChartData, Trade } from '../types';
import { supabase } from './supabaseClient';

const ACCOUNT_CODE = 'C40421';

interface AccountBalanceRow {
  Date: string;
  CashBalance: number | string | null;
  'Account Equity': number | string | null;
  'Stock LMV': number | string | null;
  'Options LMV': number | string | null;
  'Stock SMV': number | string | null;
  'Optons SMV': number | string | null;
}

interface TradeRow {
  TradeID: number | string | null;
  Symbol: string | null;
  TradeType: string | null;
  StockTradePrice: number | string | null;
  StockShareQty: number | string | null;
  Date: string | null;
  TradeTimeStamp: string | null;
}

interface PositionComputation {
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  previousPrice?: number;
  totalVolume: number;
}

const PERIOD_LOOKUP: Record<'1D' | '1W' | '1M' | '3M' | '1Y', number> = {
  '1D': 2,
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 365,
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDateForQuery = (date: Date): string => date.toISOString().slice(0, 10);

const buildTimestamp = (date: string | null, time: string | null): Date => {
  if (!date) {
    return new Date();
  }
  if (!time) {
    return new Date(date);
  }
  return new Date(`${date}T${time}`);
};

class PortfolioDataService {
  async getPortfolio(): Promise<Portfolio> {
    const { data, error } = await supabase
      .from<AccountBalanceRow>('AccountBalance')
      .select('*')
      .eq('AccountCode', ACCOUNT_CODE)
      .order('Date', { ascending: false })
      .limit(2);

    if (error) {
      throw new Error(`Failed to fetch portfolio data: ${error.message}`);
    }

    const [latest, previous] = data ?? [];

    if (!latest) {
      throw new Error('No account balance data found for the specified account.');
    }

    const totalValue = toNumber(latest['Account Equity']);
    const previousValue = previous ? toNumber(previous['Account Equity']) : totalValue;
    const dayChange = totalValue - previousValue;
    const dayChangePercent = previousValue !== 0 ? (dayChange / previousValue) * 100 : 0;
    const totalCash = toNumber(latest.CashBalance);
    const totalInvested = toNumber(latest['Stock LMV']) + toNumber(latest['Options LMV']);

    const positions = await this.getPositions();

    return {
      totalValue,
      dayChange,
      dayChangePercent,
      totalCash,
      totalInvested,
      positions,
    };
  }

  async getPositions(): Promise<Position[]> {
    const computations = await this.computePositions();

    return computations
      .filter((position) => position.shares > 0)
      .map((position) => {
        const totalValue = position.currentPrice * position.shares;
        const totalCost = position.avgCost * position.shares;
        const gainLoss = totalValue - totalCost;
        const gainLossPercent = totalCost !== 0 ? (gainLoss / totalCost) * 100 : 0;

        return {
          symbol: position.symbol,
          name: position.name,
          shares: position.shares,
          avgCost: position.avgCost,
          currentPrice: position.currentPrice,
          totalValue,
          totalCost,
          gainLoss,
          gainLossPercent,
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue);
  }

  async getStocks(symbols?: string[]): Promise<Stock[]> {
    const computations = await this.computePositions();
    const filtered = symbols
      ? computations.filter((position) => symbols.includes(position.symbol))
      : computations;

    return filtered
      .filter((position) => position.shares > 0)
      .map((position) => {
        const referencePrice = position.previousPrice ?? position.avgCost;
        const change = position.currentPrice - referencePrice;
        const changePercent = referencePrice !== 0 ? (change / referencePrice) * 100 : 0;

        return {
          symbol: position.symbol,
          name: position.name,
          price: position.currentPrice,
          change,
          changePercent,
          volume: Math.round(position.totalVolume),
        };
      })
      .sort((a, b) => b.price - a.price);
  }

  async getStock(symbol: string): Promise<Stock | null> {
    const stocks = await this.getStocks([symbol]);
    return stocks[0] ?? null;
  }

  async getChartData(_symbol: string, period: '1D' | '1W' | '1M' | '3M' | '1Y' = '1M'): Promise<ChartData[]> {
    const days = PERIOD_LOOKUP[period] ?? 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const { data, error } = await supabase
      .from<AccountBalanceRow>('AccountBalance')
      .select('Date, "Account Equity"')
      .eq('AccountCode', ACCOUNT_CODE)
      .gte('Date', formatDateForQuery(fromDate))
      .order('Date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch chart data: ${error.message}`);
    }

    return (data ?? []).map((row) => ({
      timestamp: new Date(row.Date).getTime(),
      price: toNumber(row['Account Equity']),
    }));
  }

  async searchStocks(query: string): Promise<Stock[]> {
    const stocks = await this.getStocks();
    const normalizedQuery = query.trim().toLowerCase();

    return stocks.filter((stock) =>
      stock.symbol.toLowerCase().includes(normalizedQuery) ||
      stock.name.toLowerCase().includes(normalizedQuery)
    );
  }

  async getRecentTrades(limit = 10): Promise<Trade[]> {
    const { data, error } = await supabase
      .from<TradeRow>('TradeData')
      .select('TradeID, Symbol, TradeType, StockTradePrice, StockShareQty, Date, TradeTimeStamp')
      .eq('AccountCode', ACCOUNT_CODE)
      .order('Date', { ascending: false })
      .order('TradeTimeStamp', { ascending: false, nullsLast: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch recent trades: ${error.message}`);
    }

    return (data ?? []).map((trade) => {
      const qty = Math.abs(toNumber(trade.StockShareQty));
      const price = toNumber(trade.StockTradePrice);
      const side = (trade.TradeType ?? '').toUpperCase().startsWith('S') ? 'sell' : 'buy';
      const timestamp = buildTimestamp(trade.Date, trade.TradeTimeStamp);

      return {
        id: trade.TradeID !== null ? String(trade.TradeID) : `${trade.Symbol ?? 'UNKNOWN'}-${timestamp.getTime()}`,
        symbol: (trade.Symbol ?? 'UNKNOWN').trim(),
        side,
        qty,
        price,
        timestamp,
        status: 'executed',
      };
    });
  }

  private async computePositions(): Promise<PositionComputation[]> {
    const { data, error } = await supabase
      .from<TradeRow>('TradeData')
      .select('Symbol, TradeType, StockTradePrice, StockShareQty, Date, TradeTimeStamp')
      .eq('AccountCode', ACCOUNT_CODE)
      .not('Symbol', 'is', null)
      .order('Date', { ascending: true })
      .order('TradeTimeStamp', { ascending: true, nullsFirst: true });

    if (error) {
      throw new Error(`Failed to fetch positions: ${error.message}`);
    }

    const positions = new Map<string, {
      shares: number;
      costBasis: number;
      avgCost: number;
      lastPrice: number;
      previousPrice?: number;
      totalVolume: number;
    }>();

    (data ?? []).forEach((trade) => {
      const symbol = trade.Symbol?.trim();
      if (!symbol) {
        return;
      }

      const qty = Math.abs(toNumber(trade.StockShareQty));
      const price = toNumber(trade.StockTradePrice);
      if (!qty || !price) {
        return;
      }

      const tradeType = (trade.TradeType ?? '').toUpperCase();
      const isSell = tradeType.startsWith('S');

      const record = positions.get(symbol) ?? {
        shares: 0,
        costBasis: 0,
        avgCost: 0,
        lastPrice: 0,
        previousPrice: undefined as number | undefined,
        totalVolume: 0,
      };

      record.totalVolume += qty;
      record.previousPrice = record.lastPrice || record.previousPrice;
      record.lastPrice = price;

      if (isSell) {
        const reductionQty = Math.min(qty, record.shares);
        const costReduction = reductionQty * record.avgCost;
        record.shares -= qty;
        record.costBasis = Math.max(0, record.costBasis - costReduction);
      } else {
        record.shares += qty;
        record.costBasis += price * qty;
      }

      if (record.shares > 0) {
        record.avgCost = record.costBasis / record.shares;
        positions.set(symbol, record);
      } else {
        positions.delete(symbol);
      }
    });

    return Array.from(positions.entries()).map(([symbol, record]) => ({
      symbol,
      name: symbol,
      shares: record.shares,
      avgCost: record.avgCost,
      currentPrice: record.lastPrice,
      previousPrice: record.previousPrice,
      totalVolume: record.totalVolume,
    }));
  }
}

export default new PortfolioDataService();
