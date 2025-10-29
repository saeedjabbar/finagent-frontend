import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Loader2, Search } from 'lucide-react';
import type { TradeActivity } from '../types';
import alpacaApi from '../services/alpacaApi';

const formatCurrency = (value: number | null) => {
  if (value === null) {
    return '—';
  }
  const sign = value < 0 ? '-' : '';
  const absValue = Math.abs(value);
  return `${sign}$${absValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatNumber = (value: number | null) => {
  if (value === null) {
    return '—';
  }
  const sign = value < 0 ? '-' : '';
  const absValue = Math.abs(value);
  return `${sign}${absValue.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(absValue) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

const TradeHistory: React.FC = () => {
  const [trades, setTrades] = useState<TradeActivity[]>([]);
  const [filtered, setFiltered] = useState<TradeActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadTrades = async () => {
      try {
        const history = await alpacaApi.getTradeHistory();
        setTrades(history);
      } catch (error) {
        console.error('Error fetching trade history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTrades();
  }, []);

  useEffect(() => {
    const term = search.trim().toLowerCase();
    const next = trades.filter((trade) => {
      const sideMatch = filter === 'all' || trade.side === filter;
      const symbolMatch = term === '' || trade.symbol.toLowerCase().includes(term);
      return sideMatch && symbolMatch;
    });
    setFiltered(next);
  }, [trades, filter, search]);

  const summary = useMemo(() => {
    const totals = filtered.reduce(
      (acc, trade) => {
        const qty = Math.abs(trade.shares ?? 0);
        const net = trade.netAmount ?? 0;
        if (trade.side === 'buy') {
          acc.totalBuys += 1;
          acc.buyShares += qty;
          acc.buyNotional += Math.abs(net);
        } else {
          acc.totalSells += 1;
          acc.sellShares += qty;
          acc.sellNotional += Math.abs(net);
        }
        acc.totalTrades += 1;
        acc.totalNotional += net;
        return acc;
      },
      {
        totalTrades: 0,
        totalBuys: 0,
        totalSells: 0,
        buyShares: 0,
        sellShares: 0,
        buyNotional: 0,
        sellNotional: 0,
        totalNotional: 0,
      }
    );
    return totals;
  }, [filtered]);

  return (
    <div className="trade-history">
      <div className="trade-header">
        <div>
          <h2>Trade History</h2>
          <p className="trade-subtitle">Account C40421 • Aida Guru</p>
        </div>
        <div className="trade-actions">
          <div className="trade-search">
            <Search size={16} />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by symbol"
            />
          </div>
          <div className="trade-filters">
            {(
              [
                { value: 'all', label: 'All' },
                { value: 'buy', label: 'Buys' },
                { value: 'sell', label: 'Sells' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                className={`trade-filter-btn ${filter === option.value ? 'active' : ''}`}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="trade-summary">
        <div className="summary-card">
          <span className="summary-label">Total Trades</span>
          <span className="summary-value">{summary.totalTrades.toLocaleString()}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Buys</span>
          <span className="summary-value buy">{summary.totalBuys.toLocaleString()}</span>
          <span className="summary-hint">
            {formatNumber(summary.buyShares)} shares • {formatCurrency(summary.buyNotional)}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Sells</span>
          <span className="summary-value sell">{summary.totalSells.toLocaleString()}</span>
          <span className="summary-hint">
            {formatNumber(summary.sellShares)} shares • {formatCurrency(summary.sellNotional)}
          </span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Net Notional</span>
          <span className="summary-value">{formatCurrency(summary.totalNotional)}</span>
        </div>
      </div>

      {loading ? (
        <div className="trade-loading">
          <Loader2 className="spinner" size={32} />
        </div>
      ) : (
        <div className="trade-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Symbol</th>
                <th>Side</th>
                <th>Shares</th>
                <th>Price</th>
                <th>Gross</th>
                <th>Commission</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((trade) => {
                const tradeDate = trade.timestamp
                  ? new Date(trade.timestamp)
                  : trade.date
                  ? new Date(trade.date)
                  : null;
                const formattedDate = tradeDate
                  ? tradeDate.toLocaleDateString()
                  : trade.date || '—';
                const formattedTime = tradeDate
                  ? tradeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : trade.time ?? '—';
                return (
                  <tr key={trade.id}>
                    <td>
                      <div className="trade-date">
                        <span>{formattedDate}</span>
                        <span className="trade-time">{formattedTime}</span>
                      </div>
                    </td>
                    <td>{trade.symbol}</td>
                    <td>
                      <span className={`side-badge ${trade.side}`}>
                        {trade.side === 'buy' ? (
                          <ArrowUpRight size={14} />
                        ) : (
                          <ArrowDownRight size={14} />
                        )}
                        {trade.side === 'buy' ? 'Buy' : 'Sell'}
                      </span>
                    </td>
                    <td>{formatNumber(trade.shares)}</td>
                    <td>{formatCurrency(trade.price)}</td>
                    <td>{formatCurrency(trade.grossAmount)}</td>
                    <td>{formatCurrency(trade.commission)}</td>
                    <td>{formatCurrency(trade.netAmount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <div className="trade-empty">No trades match the current filters.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default TradeHistory;
