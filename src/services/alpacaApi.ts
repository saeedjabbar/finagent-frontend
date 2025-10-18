import axios from 'axios';
import type { Stock, Portfolio, Position, ChartData, Trade } from '../types';

// Alpaca API configuration - For production, these would be environment variables
const ALPACA_API_BASE_URL = 'https://paper-api.alpaca.markets';
const ALPACA_DATA_URL = 'https://data.alpaca.markets';

// Mock API key - In production, this would be secured
const API_KEY = 'YOUR_API_KEY';
const SECRET_KEY = 'YOUR_SECRET_KEY';

// Since this is a POC without auth, we'll use mock data
const MOCK_MODE = true;

// Mock stock data
const mockStocks: Stock[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 178.25, change: 2.15, changePercent: 1.22, volume: 52341000, marketCap: 2800000000000, dayHigh: 179.50, dayLow: 176.80, open: 177.00, previousClose: 176.10 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 139.87, change: -0.63, changePercent: -0.45, volume: 21230000, marketCap: 1750000000000, dayHigh: 141.20, dayLow: 139.50, open: 140.50, previousClose: 140.50 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 378.92, change: 3.28, changePercent: 0.87, volume: 18560000, marketCap: 2810000000000, dayHigh: 380.00, dayLow: 376.50, open: 377.00, previousClose: 375.64 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 145.63, change: 1.87, changePercent: 1.30, volume: 43210000, marketCap: 1510000000000, dayHigh: 146.50, dayLow: 144.20, open: 144.50, previousClose: 143.76 },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 251.34, change: -5.21, changePercent: -2.03, volume: 89230000, marketCap: 798000000000, dayHigh: 258.00, dayLow: 250.50, open: 256.50, previousClose: 256.55 },
  { symbol: 'META', name: 'Meta Platforms', price: 485.23, change: 7.89, changePercent: 1.65, volume: 15670000, marketCap: 1230000000000, dayHigh: 487.00, dayLow: 478.50, open: 479.00, previousClose: 477.34 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 456.78, change: 12.34, changePercent: 2.78, volume: 67890000, marketCap: 1130000000000, dayHigh: 458.90, dayLow: 445.60, open: 446.00, previousClose: 444.44 },
  { symbol: 'JPM', name: 'JPMorgan Chase', price: 187.45, change: -1.23, changePercent: -0.65, volume: 8760000, marketCap: 547000000000, dayHigh: 189.00, dayLow: 187.00, open: 188.50, previousClose: 188.68 },
];

// Mock portfolio data
const mockPortfolio: Portfolio = {
  totalValue: 125680.45,
  dayChange: 1234.56,
  dayChangePercent: 0.99,
  totalCash: 15000.00,
  totalInvested: 110680.45,
  positions: [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      shares: 150,
      avgCost: 165.30,
      currentPrice: 178.25,
      totalValue: 26737.50,
      totalCost: 24795.00,
      gainLoss: 1942.50,
      gainLossPercent: 7.83
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corp.',
      shares: 75,
      avgCost: 350.00,
      currentPrice: 378.92,
      totalValue: 28419.00,
      totalCost: 26250.00,
      gainLoss: 2169.00,
      gainLossPercent: 8.26
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      shares: 100,
      avgCost: 125.50,
      currentPrice: 139.87,
      totalValue: 13987.00,
      totalCost: 12550.00,
      gainLoss: 1437.00,
      gainLossPercent: 11.45
    },
    {
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      shares: 50,
      avgCost: 280.00,
      currentPrice: 251.34,
      totalValue: 12567.00,
      totalCost: 14000.00,
      gainLoss: -1433.00,
      gainLossPercent: -10.24
    },
    {
      symbol: 'NVDA',
      name: 'NVIDIA Corp.',
      shares: 65,
      avgCost: 400.00,
      currentPrice: 456.78,
      totalValue: 29690.70,
      totalCost: 26000.00,
      gainLoss: 3690.70,
      gainLossPercent: 14.20
    }
  ]
};

// Generate mock chart data
const generateMockChartData = (days: number = 30): ChartData[] => {
  const data: ChartData[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  let basePrice = 100;
  
  for (let i = days; i >= 0; i--) {
    const variance = (Math.random() - 0.5) * 5;
    basePrice = Math.max(basePrice + variance, 50);
    data.push({
      timestamp: now - (i * dayMs),
      price: basePrice,
      volume: Math.floor(Math.random() * 1000000) + 500000
    });
  }
  
  return data;
};

class AlpacaAPI {
  private headers = {
    'APCA-API-KEY-ID': API_KEY,
    'APCA-API-SECRET-KEY': SECRET_KEY,
    'Content-Type': 'application/json'
  };

  async getStocks(symbols?: string[]): Promise<Stock[]> {
    if (MOCK_MODE) {
      if (symbols) {
        return mockStocks.filter(stock => symbols.includes(stock.symbol));
      }
      return mockStocks;
    }
    
    // Real API implementation would go here
    try {
      const response = await axios.get(`${ALPACA_DATA_URL}/v2/stocks/snapshots`, {
        headers: this.headers,
        params: { symbols: symbols?.join(',') }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching stocks:', error);
      return mockStocks;
    }
  }

  async getStock(symbol: string): Promise<Stock | null> {
    if (MOCK_MODE) {
      return mockStocks.find(stock => stock.symbol === symbol) || null;
    }
    
    try {
      const response = await axios.get(`${ALPACA_DATA_URL}/v2/stocks/${symbol}/snapshot`, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching stock:', error);
      return null;
    }
  }

  async getPortfolio(): Promise<Portfolio> {
    if (MOCK_MODE) {
      return mockPortfolio;
    }
    
    try {
      const response = await axios.get(`${ALPACA_API_BASE_URL}/v2/account`, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      return mockPortfolio;
    }
  }

  async getPositions(): Promise<Position[]> {
    if (MOCK_MODE) {
      return mockPortfolio.positions;
    }
    
    try {
      const response = await axios.get(`${ALPACA_API_BASE_URL}/v2/positions`, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching positions:', error);
      return mockPortfolio.positions;
    }
  }

  async getChartData(symbol: string, period: '1D' | '1W' | '1M' | '3M' | '1Y' = '1M'): Promise<ChartData[]> {
    if (MOCK_MODE) {
      const days = {
        '1D': 1,
        '1W': 7,
        '1M': 30,
        '3M': 90,
        '1Y': 365
      }[period];
      return generateMockChartData(days);
    }
    
    try {
      const response = await axios.get(`${ALPACA_DATA_URL}/v2/stocks/${symbol}/bars`, {
        headers: this.headers,
        params: { timeframe: period }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return generateMockChartData(30);
    }
  }

  async searchStocks(query: string): Promise<Stock[]> {
    if (MOCK_MODE) {
      return mockStocks.filter(stock => 
        stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
        stock.name.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    try {
      const response = await axios.get(`${ALPACA_DATA_URL}/v2/stocks/search`, {
        headers: this.headers,
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching stocks:', error);
      return [];
    }
  }

  async getRecentTrades(): Promise<Trade[]> {
    // Mock recent trades
    return [
      {
        id: '1',
        symbol: 'AAPL',
        side: 'buy',
        qty: 10,
        price: 175.50,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'executed'
      },
      {
        id: '2',
        symbol: 'MSFT',
        side: 'buy',
        qty: 5,
        price: 370.00,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: 'executed'
      },
      {
        id: '3',
        symbol: 'TSLA',
        side: 'sell',
        qty: 3,
        price: 255.00,
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
        status: 'executed'
      }
    ];
  }
}

export default new AlpacaAPI();
