# FinAgent - AI-Powered Financial Trading Assistant

An intelligent financial agent that provides voice and text-based interaction for trading, account management, and market analysis using cutting-edge AI technology.

## 🎯 Overview

FinAgent is a sophisticated AI-powered trading assistant that combines:
- **Voice & Text Interaction** via ElevenLabs
- **Multi-Agent System** using LangGraph
- **RAG for Context** with pgvector
- **Real-time Market Data** from Alpaca Markets
- **Natural Language Queries** powered by Azure OpenAI GPT-4
- **Full Observability** with LangSmith tracing

## ✨ Features

### Query Types Supported

**Trade History**
- "Show my trades for last week"
- "What's the average price I bought AAPL at?"
- "Show all my profitable trades on IBM"
- "Display my option trades this month"

**Account Information**
- "What's my buying power?"
- "Show my account summary"
- "How much money can I withdraw?"
- "What's my current P&L?"

**Market Data**
- "Get me a quote for TSLA"
- "Show AAPL chart"
- "What's the current price of SPY?"
- "Show me NVDA fundamentals"

**Order Management**
- "Buy 100 shares of AAPL"
- "Sell 50 TSLA at limit $250"
- "Show my open orders"
- "Cancel order #12345"

**Fees & Commissions**
- "Total commissions this month"
- "How much did I pay in interest?"
- "Show my fees for this year"

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                  │
│                    Deployed on Vercel                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────────┐
│              Supabase Edge Functions (Deno)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ agent-query  │  │ alpaca-proxy │  │  rag-search  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────────────────────┬─────────────────────────────────────┘
                        │
            ┌───────────┼───────────┐
            ↓           ↓           ↓
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ LangGraph│  │PostgreSQL│  │ Alpaca   │
    │  Agent   │  │+pgvector │  │   API    │
    └─────┬────┘  └──────────┘  └──────────┘
          │
          ↓
    ┌──────────┐
    │ Azure    │
    │ OpenAI   │
    │  GPT-4   │
    └──────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Supabase account
- Azure OpenAI with GPT-4 access
- Alpaca Markets account (paper trading)
- ElevenLabs account

### Installation

```bash
# Clone repository
git clone <repo-url>
cd finagent

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run database migrations
npm run migrate

# Load sample data
npx tsx scripts/migrate-data.ts

# Start development server
npm run dev
```

Visit http://localhost:5173 to see the app.

For detailed setup instructions, see [SETUP_GUIDE.md](./SETUP_GUIDE.md).

## 📊 Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | React 19, TypeScript, Vite |
| **Styling** | TailwindCSS, Radix UI |
| **Backend** | Supabase Edge Functions (Deno) |
| **Database** | PostgreSQL with pgvector |
| **AI/ML** | Azure OpenAI GPT-4, LangGraph |
| **Voice** | ElevenLabs |
| **Market Data** | Alpaca Markets API |
| **Monitoring** | LangSmith |
| **Deployment** | Vercel (Frontend), Supabase (Backend) |

## 📁 Project Structure

```
finagent/
├── src/                    # React frontend application
│   ├── components/        # UI components
│   ├── services/          # API service layers
│   ├── hooks/            # Custom React hooks
│   └── types/            # TypeScript type definitions
├── supabase/
│   ├── functions/        # Serverless Edge Functions
│   │   ├── agent-query/    # Main LangGraph agent
│   │   ├── alpaca-proxy/   # Market data proxy
│   │   ├── rag-search/     # Vector similarity search
│   │   └── sql-generator/  # Natural language to SQL
│   └── migrations/       # Database schema migrations
├── scripts/              # Utility scripts
│   └── migrate-data.ts   # Data migration from Excel
└── requirements/         # Sample data files (Excel)
```

## 🔧 Development

### Running Locally

```bash
# Frontend
npm run dev

# Edge Functions (requires Supabase CLI)
supabase functions serve
```

### Testing

```bash
# Run tests
npm test

# Type check
npm run type-check

# Lint
npm run lint
```

### Building

```bash
# Build frontend
npm run build

# Deploy Edge Functions
supabase functions deploy
```

## 🎯 Implementation Phases

- [x] **Phase 1**: Project setup and architecture
- [x] **Phase 2**: Database schema and data migration
- [ ] **Phase 3**: Edge Functions development
- [ ] **Phase 4**: LangGraph agent implementation
- [ ] **Phase 5**: RAG with pgvector
- [ ] **Phase 6**: Frontend components
- [ ] **Phase 7**: Alpaca integration
- [ ] **Phase 8**: Query processing
- [ ] **Phase 9**: Order management
- [ ] **Phase 10**: Testing & refinement
- [ ] **Phase 11**: Demo preparation

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for detailed roadmap.

## 🔐 Environment Variables

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4-turbo

# Alpaca Markets
ALPACA_API_KEY=
ALPACA_SECRET_KEY=
ALPACA_BASE_URL=https://paper-api.alpaca.markets

# ElevenLabs
VITE_ELEVENLABS_AGENT_ID=
VITE_ELEVENLABS_API_KEY=

# LangSmith
LANGSMITH_API_KEY=
LANGSMITH_PROJECT=finagent-dev
```

## 📚 Documentation

- [Setup Guide](./SETUP_GUIDE.md) - Complete setup instructions
- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - Development roadmap
- [API Documentation](./docs/API.md) - API reference (coming soon)
- [Architecture](./docs/ARCHITECTURE.md) - System design (coming soon)

## 🤝 Contributing

This is currently a private project. For questions or issues, please contact the project maintainer.

## 📄 License

Private - All rights reserved

## 🎬 Demo

Coming soon - video demonstration will be available once development is complete.

## 💰 Cost Estimates

| Service | Monthly Cost |
|---------|-------------|
| Supabase | Free tier |
| Azure OpenAI | $50-150 (usage-based) |
| Alpaca Markets | Free (paper trading) |
| ElevenLabs | $20-50 |
| LangSmith | Free (5K traces/month) |
| Vercel | Free (hobby) |
| **Total** | **$70-200/month** |

## 🎯 Success Criteria

- ✅ All query types from requirements working
- ✅ Voice and text interaction functional
- ✅ Sub-second response times for most queries
- ✅ Accurate SQL generation (>95%)
- ✅ Complete error handling and fallbacks
- ✅ Full LangSmith tracing
- ✅ Demo-ready UI
- ✅ Complete documentation

## 📞 Support

For setup issues, refer to:
1. [SETUP_GUIDE.md](./SETUP_GUIDE.md)
2. Check Supabase logs: `supabase functions logs`
3. Verify all environment variables
4. Review LangSmith traces for agent debugging

---

Built with ❤️ using cutting-edge AI technology
