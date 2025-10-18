import { useState } from 'react';
import { Home, TrendingUp, Search, User, Menu, X } from 'lucide-react';
import Portfolio from './components/Portfolio';
import StockList from './components/StockList';
import VoiceAssistantNew from './components/VoiceAssistantNew';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'stocks'>('portfolio');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="header-left">
            <button 
              className="mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 className="app-title">WeTrade</h1>
          </div>
          
          <nav className={`header-nav ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
            <button
              className={`nav-btn ${activeTab === 'portfolio' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('portfolio');
                setIsMobileMenuOpen(false);
              }}
            >
              <Home size={20} />
              <span>Portfolio</span>
            </button>
            <button
              className={`nav-btn ${activeTab === 'stocks' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('stocks');
                setIsMobileMenuOpen(false);
              }}
            >
              <TrendingUp size={20} />
              <span>Stocks</span>
            </button>
          </nav>

          <div className="header-right">
            <button className="icon-btn">
              <Search size={20} />
            </button>
            <button className="icon-btn">
              <User size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        <div className="main-container">
          {activeTab === 'portfolio' ? <Portfolio /> : <StockList />}
        </div>
      </main>

      {/* Voice Assistant */}
      <VoiceAssistantNew />
    </div>
  );
}

export default App;
