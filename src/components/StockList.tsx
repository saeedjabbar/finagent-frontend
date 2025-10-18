import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Search } from 'lucide-react';
import type { Stock } from '../types';
import alpacaApi from '../services/alpacaApi';

const StockList: React.FC = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStocks();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = stocks.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          stock.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStocks(filtered);
    } else {
      setFilteredStocks(stocks);
    }
  }, [searchQuery, stocks]);

  const fetchStocks = async () => {
    try {
      const data = await alpacaApi.getStocks();
      setStocks(data);
      setFilteredStocks(data);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatMarketCap = (marketCap?: number) => {
    if (!marketCap) return 'N/A';
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    return `$${marketCap.toLocaleString()}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
    return volume.toString();
  };

  if (loading) {
    return (
      <div className="stocks-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="stock-list">
      <div className="stock-list-header">
        <h2>Stocks</h2>
        <div className="search-container">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search stocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="stocks-grid">
        {filteredStocks.map((stock) => {
          const isGain = stock.change >= 0;
          return (
            <div key={stock.symbol} className="stock-card">
              <div className="stock-main">
                <div className="stock-info">
                  <h3 className="stock-symbol">{stock.symbol}</h3>
                  <p className="stock-name">{stock.name}</p>
                </div>
                <div className="stock-price-info">
                  <span className="stock-price">${stock.price.toFixed(2)}</span>
                  <div className={`stock-change ${isGain ? 'gain' : 'loss'}`}>
                    {isGain ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>${Math.abs(stock.change).toFixed(2)}</span>
                    <span>({Math.abs(stock.changePercent).toFixed(2)}%)</span>
                  </div>
                </div>
              </div>
              
              <div className="stock-details">
                <div className="stock-detail">
                  <span className="detail-label">Volume</span>
                  <span className="detail-value">{formatVolume(stock.volume)}</span>
                </div>
                <div className="stock-detail">
                  <span className="detail-label">Market Cap</span>
                  <span className="detail-value">{formatMarketCap(stock.marketCap)}</span>
                </div>
                {stock.dayHigh && stock.dayLow && (
                  <>
                    <div className="stock-detail">
                      <span className="detail-label">Day Range</span>
                      <span className="detail-value">
                        ${stock.dayLow.toFixed(2)} - ${stock.dayHigh.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StockList;
