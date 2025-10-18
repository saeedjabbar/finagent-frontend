import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface TradeData {
  account_code: string;
  account_type: string;
  account_name: string;
  acct_holder_name: string;
  date: string;
  trade_id: string;
  trade_type: string;
  trade_timestamp: string;
  security_type: string;
  symbol: string;
  underlying_symbol?: string | null;
  expiration?: string | null;
  strike?: number | null;
  call_put?: string | null;
  stock_trade_price?: number | null;
  option_trade_premium?: number | null;
  stock_share_qty?: number | null;
  option_contracts?: number | null;
  gross_amount: number;
  commission: number;
  exch_fees: number;
  net_amount: number;
}

interface AccountBalance {
  account_code: string;
  account_type: string;
  account_name: string;
  acct_holder_name?: string;
  date: string;
  cash_balance: number;
  stock_lmv: number;
  stock_smv: number;
  options_lmv: number;
  options_smv: number;
  account_equity: number;
  credit_balance: number;
  debit_balance: number;
  sma: number;
  fed_requirement: number;
  fed_excess_deficit: number;
  house_requirement: number;
  house_excess_deficit: number;
  exchange_requirement: number;
  exchange_excess_deficit: number;
  day_trading_bp: number;
}

interface AccountInfo {
  account_code: string;
  account_type: string;
  account_name: string;
  acct_holder_name: string;
}

function excelDateToJSDate(serial: number): string {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return date_info.toISOString().split('T')[0];
}

function parseExcelDate(value: string | number | Date | undefined): string {
  if (!value) return '';
  if (typeof value === 'number') {
    return excelDateToJSDate(value);
  }
  if (typeof value === 'string') {
    // Try to parse string date
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  return String(value);
}

async function migrateTradeData() {
  console.log('📊 Migrating Trade Data...');
  
  const workbook = XLSX.readFile(path.join(__dirname, '../requirements/TradeDataSample.xlsx'));
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData: Record<string, string | number | undefined>[] = XLSX.utils.sheet_to_json(worksheet);

  const trades: TradeData[] = rawData.map(row => ({
    account_code: String(row.AccountCode || ''),
    account_type: String(row.AccountType || ''),
    account_name: String(row.AccountName || ''),
    acct_holder_name: String(row.AcctHolderName || ''),
    date: parseExcelDate(row.Date),
    trade_id: String(row.TradeID || ''),
    trade_type: String(row.TradeType || '').toUpperCase(),
    trade_timestamp: `${parseExcelDate(row.Date)} ${row.TradeTimeStamp || '00:00:00'}`,
    security_type: String(row.SecutiryType || row.SecurityType || ''), // Handle typo in sample
    symbol: String(row.Symbol || ''),
    underlying_symbol: row.UnderlyingSymbol ? String(row.UnderlyingSymbol) : null,
    expiration: row.Expiration ? parseExcelDate(row.Expiration) : null,
    strike: row.Strike ? Number(row.Strike) : null,
    call_put: row['Call/Put'] ? String(row['Call/Put']) : null,
    stock_trade_price: row.StockTradePrice ? Number(row.StockTradePrice) : null,
    option_trade_premium: row.OptionTradePremium ? Number(row.OptionTradePremium) : null,
    stock_share_qty: row.StockShareQty ? Number(row.StockShareQty) : null,
    option_contracts: row.OptionContracts ? Number(row.OptionContracts) : null,
    gross_amount: Number(row.GrossAmount || 0),
    commission: Number(row.Commission || 0),
    exch_fees: Number(row.ExchFees || 0),
    net_amount: Number(row.NetAmount || 0),
  }));

  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < trades.length; i += batchSize) {
    const batch = trades.slice(i, i + batchSize);
    const { error } = await supabase.from('trade_data').insert(batch);
    
    if (error) {
      console.error(`Error inserting trade batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(`✅ Inserted trades ${i + 1} to ${Math.min(i + batchSize, trades.length)}`);
    }
  }

  console.log(`✅ Trade Data Migration Complete: ${trades.length} records`);
}

async function migrateAccountBalances() {
  console.log('💰 Migrating Account Balances...');
  
  const workbook = XLSX.readFile(path.join(__dirname, '../requirements/AccountBalances Sample.xlsx'));
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData: Record<string, string | number | undefined>[] = XLSX.utils.sheet_to_json(worksheet);

  const balances: AccountBalance[] = rawData.map(row => ({
    account_code: String(row.AccountCode || ''),
    account_type: String(row.AccountType || ''),
    account_name: String(row.AccountName || ''),
    acct_holder_name: row.AcctHolderName ? String(row.AcctHolderName) : undefined,
    date: parseExcelDate(row.Date),
    cash_balance: Number(row.CashBalance || 0),
    stock_lmv: Number(row['Stock LMV'] || 0),
    stock_smv: Number(row['Stock SMV'] || 0),
    options_lmv: Number(row['Options LMV'] || 0),
    options_smv: Number(row['Optons SMV'] || 0), // Handle typo
    account_equity: Number(row['Account Equity'] || 0),
    credit_balance: Number(row.CreditBalance || 0),
    debit_balance: Number(row.DebitBalance || 0),
    sma: Number(row.SMA || 0),
    fed_requirement: Number(row.FedRequirement || 0),
    fed_excess_deficit: Number(row.FedExcessDeficit || 0),
    house_requirement: Number(row.HouseRequirment || 0), // Handle typo
    house_excess_deficit: Number(row.HouseExcessDeficit || 0),
    exchange_requirement: Number(row.ExchangeRequirment || 0), // Handle typo
    exchange_excess_deficit: Number(row.ExchangeExcessDeficit || 0),
    day_trading_bp: Number(row.DayTradingBP || 0),
  }));

  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < balances.length; i += batchSize) {
    const batch = balances.slice(i, i + batchSize);
    const { error } = await supabase.from('acct_balances').insert(batch);
    
    if (error) {
      console.error(`Error inserting balance batch ${i / batchSize + 1}:`, error);
    } else {
      console.log(`✅ Inserted balances ${i + 1} to ${Math.min(i + batchSize, balances.length)}`);
    }
  }

  console.log(`✅ Account Balances Migration Complete: ${balances.length} records`);
}

async function extractAndMigrateAccountInfo() {
  console.log('👤 Extracting and Migrating Account Info...');
  
  // Extract unique accounts from trade data
  const { data: trades, error } = await supabase
    .from('trade_data')
    .select('account_code, account_type, account_name, acct_holder_name')
    .limit(1000);

  if (error) {
    console.error('Error fetching trade data:', error);
    return;
  }

  // Get unique accounts
  const accountMap = new Map<string, AccountInfo>();
  trades?.forEach(trade => {
    if (!accountMap.has(trade.account_code)) {
      accountMap.set(trade.account_code, {
        account_code: trade.account_code,
        account_type: trade.account_type,
        account_name: trade.account_name,
        acct_holder_name: trade.acct_holder_name,
      });
    }
  });

  const accounts = Array.from(accountMap.values());
  
  for (const account of accounts) {
    const { error } = await supabase.from('acct_info').upsert(account, {
      onConflict: 'account_code',
    });
    
    if (error) {
      console.error(`Error inserting account ${account.account_code}:`, error);
    }
  }

  console.log(`✅ Account Info Migration Complete: ${accounts.length} unique accounts`);
}

async function main() {
  console.log('🚀 Starting Data Migration...\n');

  try {
    // Check Supabase connection
    const { error: connError } = await supabase.from('acct_info').select('count').limit(1);
    if (connError) {
      console.error('❌ Supabase connection failed:', connError);
      console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
      process.exit(1);
    }

    console.log('✅ Supabase connection successful\n');

    // Run migrations
    await migrateTradeData();
    console.log();
    
    await migrateAccountBalances();
    console.log();
    
    await extractAndMigrateAccountInfo();
    console.log();

    console.log('🎉 All migrations completed successfully!');
    
    // Summary
    const { count: tradeCount } = await supabase
      .from('trade_data')
      .select('*', { count: 'exact', head: true });
    
    const { count: balanceCount } = await supabase
      .from('acct_balances')
      .select('*', { count: 'exact', head: true });
    
    const { count: accountCount } = await supabase
      .from('acct_info')
      .select('*', { count: 'exact', head: true });

    console.log('\n📈 Migration Summary:');
    console.log(`   - Trades: ${tradeCount}`);
    console.log(`   - Account Balances: ${balanceCount}`);
    console.log(`   - Accounts: ${accountCount}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
