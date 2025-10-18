# FinAgent Setup Guide

This guide will walk you through setting up the FinAgent application from scratch.

## Prerequisites

- Node.js v20+ installed
- npm or yarn package manager
- Supabase account (free tier is sufficient)
- Azure OpenAI account with GPT-4 access
- Alpaca Markets account (paper trading)
- ElevenLabs account
- LangSmith account (optional for tracing)

## Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd finagent

# Install dependencies
npm install
```

## Step 2: Set Up Supabase Project

1. **Create a Supabase Project**
   - Go to https://supabase.com
   - Click "New Project"
   - Fill in project details:
     - Name: `finagent`
     - Database Password: (generate a strong password)
     - Region: Choose closest to you
   - Wait for project to be provisioned (~2 minutes)

2. **Get Your Supabase Credentials**
   - Go to Project Settings > API
   - Copy:
     - Project URL
     - `anon` `public` key
     - `service_role` `secret` key (keep this secure!)

3. **Run Database Migrations**

   First, install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

   Initialize Supabase in your project:
   ```bash
   supabase init
   ```

   Link to your remote project:
   ```bash
   supabase link --project-ref <your-project-ref>
   # Project ref is in your project URL: https://<project-ref>.supabase.co
   ```

   Apply the migration:
   ```bash
   supabase db push
   ```

   Or manually run the SQL in Supabase SQL Editor:
   - Go to SQL Editor in Supabase Dashboard
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Run the SQL

## Step 3: Configure Environment Variables

Create a `.env` file in the project root:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-instance.openai.azure.com/
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4-turbo
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Alpaca Markets (Paper Trading)
ALPACA_API_KEY=your-alpaca-paper-key
ALPACA_SECRET_KEY=your-alpaca-paper-secret
ALPACA_BASE_URL=https://paper-api.alpaca.markets

# ElevenLabs
VITE_ELEVENLABS_AGENT_ID=your-agent-id
VITE_ELEVENLABS_API_KEY=your-api-key

# LangSmith (Optional)
LANGSMITH_API_KEY=your-langsmith-key
LANGSMITH_PROJECT=finagent-dev
LANGSMITH_TRACING_V2=true
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

### How to Get Each Key:

**Azure OpenAI:**
1. Go to Azure Portal (https://portal.azure.com)
2. Create Azure OpenAI resource if you don't have one
3. Go to Keys and Endpoint
4. Copy KEY 1 and Endpoint
5. Deploy GPT-4 model in Azure OpenAI Studio

**Alpaca Markets:**
1. Sign up at https://alpaca.markets
2. Go to Paper Trading section
3. Generate API keys (Paper Trading)
4. Copy API Key ID and Secret Key

**ElevenLabs:**
1. Sign up at https://elevenlabs.io
2. Go to API Keys
3. Generate a new key
4. For Agent ID, create an agent in ElevenLabs dashboard

**LangSmith:**
1. Sign up at https://smith.langchain.com
2. Go to Settings > API Keys
3. Create a new API key
4. Create a new project called "finagent-dev"

## Step 4: Migrate Sample Data

Run the data migration script to load Excel sample data into Supabase:

```bash
# Using tsx (already installed)
npx tsx scripts/migrate-data.ts
```

This will:
- Load trade data from `TradeDataSample.xlsx`
- Load account balances from `AccountBalances Sample.xlsx`
- Extract and create account info records

You should see output like:
```
🚀 Starting Data Migration...
✅ Supabase connection successful
📊 Migrating Trade Data...
✅ Inserted trades 1 to 60
✅ Trade Data Migration Complete: 60 records
...
```

## Step 5: Set Up Supabase Edge Functions

1. **Install Deno** (required for Edge Functions):
   ```bash
   # macOS/Linux
   curl -fsSL https://deno.land/install.sh | sh
   
   # Windows
   irm https://deno.land/install.ps1 | iex
   ```

2. **Create Edge Functions** (we'll do this in later steps):
   ```bash
   supabase functions new agent-query
   supabase functions new alpaca-proxy
   supabase functions new rag-search
   supabase functions new sql-generator
   ```

3. **Set Environment Variables for Edge Functions**:
   ```bash
   # Set secrets for Edge Functions
   supabase secrets set AZURE_OPENAI_ENDPOINT="your-endpoint"
   supabase secrets set AZURE_OPENAI_API_KEY="your-key"
   supabase secrets set ALPACA_API_KEY="your-key"
   supabase secrets set ALPACA_SECRET_KEY="your-secret"
   supabase secrets set LANGSMITH_API_KEY="your-key"
   ```

## Step 6: Run the Frontend

```bash
# Development mode
npm run dev

# The app will be available at http://localhost:5173
```

## Step 7: Deploy to Vercel (Production)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Set Environment Variables in Vercel**:
   - Go to Vercel Dashboard > Your Project > Settings > Environment Variables
   - Add all `VITE_*` variables from your `.env` file
   - These will be used at build time

## Step 8: Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy agent-query
supabase functions deploy alpaca-proxy
supabase functions deploy rag-search
supabase functions deploy sql-generator
```

## Project Structure

```
finagent/
├── src/                          # Frontend React app
│   ├── components/              # UI components
│   ├── services/                # API services
│   ├── types/                   # TypeScript types
│   └── App.tsx                  # Main app component
├── supabase/
│   ├── functions/               # Edge Functions (serverless)
│   │   ├── agent-query/        # Main agent endpoint
│   │   ├── alpaca-proxy/       # Alpaca API proxy
│   │   ├── rag-search/         # Vector search
│   │   └── sql-generator/      # SQL generation
│   ├── migrations/              # Database migrations
│   └── seed/                    # Seed data
├── scripts/
│   └── migrate-data.ts          # Data migration script
├── requirements/                # Sample data files
└── .env                         # Environment variables (local)
```

## Troubleshooting

### Database Connection Issues
```bash
# Test Supabase connection
supabase db ping

# View database status
supabase status
```

### Migration Errors
```bash
# Reset database (WARNING: deletes all data)
supabase db reset

# Re-run migrations
supabase db push
```

### Edge Function Issues
```bash
# View function logs
supabase functions logs agent-query

# Test function locally
supabase functions serve agent-query --debug
```

### Frontend Build Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run build
```

## Next Steps

1. ✅ Complete Supabase setup
2. ✅ Load sample data
3. 🔄 Implement Edge Functions (in progress)
4. 🔄 Build LangGraph agents
5. 🔄 Integrate ElevenLabs voice
6. 🔄 Add RAG functionality
7. 🔄 Test end-to-end flows
8. 🔄 Deploy to production

## Support

For issues:
1. Check Supabase logs: `supabase functions logs`
2. Check browser console for frontend errors
3. Verify all environment variables are set correctly
4. Ensure API keys have proper permissions

## Security Notes

- **Never commit `.env` to Git**
- Use `.gitignore` to exclude sensitive files
- Rotate API keys regularly
- Use Row Level Security (RLS) in Supabase for production
- Keep `SUPABASE_SERVICE_ROLE_KEY` secure (server-side only)

## Cost Estimates

- **Supabase**: Free tier sufficient for development
- **Azure OpenAI**: ~$0.01 per 1K tokens (GPT-4)
- **Alpaca**: Free (paper trading)
- **ElevenLabs**: Pay per character (~$20-50/month)
- **LangSmith**: Free tier (5K traces/month)
- **Vercel**: Free tier for hobby projects

Total estimated monthly cost: **$20-80** (mostly ElevenLabs and Azure OpenAI)
