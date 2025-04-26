export interface User {
  email: string;
  name: string;
  balance: number;
}

export interface Stock {
  ticker: string;
  symbol?: string;  // Alternative field for ticker
  name: string;
  longName?: string;  // Alternative field for name
  shortName?: string;  // Alternative field for name
  price: number;
  current_price: number;
  regularMarketPrice?: number;  // Alternative field for price
  change: number;
  regularMarketChange?: number;  // Alternative field for change
  change_percent: number;
  regularMarketChangePercent?: number;  // Alternative field for change_percent
  volume: number;
  regularMarketVolume?: number;  // Alternative field for volume
  average_price?: number;
  quantity?: number;
  total_value?: number;
}

export interface StockDetails extends Stock {
  change: number;
  change_percent: number;
  marketCap: number;
  volume: number;
  peRatio: number;
  dividendYield: number;
  sector: string;
  industry: string;
}

export interface StockPrediction {
  ticker: string;
  current_price: number;
  prediction_dates: string[];
  prediction_prices: number[];
  confidence: number;
}

export interface Transaction {
  id: string;
  ticker: string;
  quantity: number;
  price: number;
  transaction_type: 'BUY' | 'SELL';
  timestamp: string;
}

export interface Portfolio {
  portfolio: Stock[];
  transactions: Transaction[];
  total_value: number;
  cash_balance: number;
}

export interface Profile {
  username: string;
  email: string;
  is_demo: boolean;
}

export interface ChartDataPoint {
  date: string;
  actual: number;
  predicted: number;
}

export interface MarketNews {
  title: string;
  summary: string;
  source: string;
  date: string;
  url: string;
  image_url: string;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
}

export interface TrendingStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  change_percent: number;
  volume: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  error: string;
}

export interface StockInfo {
  name: string;
  price: number;
  change: number;
  change_percent: number;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface SearchResponse {
  stocks: Stock[];
}

export interface TradeResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    ticker: string;
    quantity: number;
    price: number;
    timestamp: string;
  };
}

// API methods that can be added to AxiosInstance
declare module 'axios' {
  interface AxiosInstance {
    searchStocks(query: string): Promise<ApiResponse<SearchResponse>>;
    addToWatchlist(ticker: string): Promise<ApiResponse<void>>;
    removeFromWatchlist(ticker: string): Promise<ApiResponse<void>>;
    executeTrade(data: { ticker: string; quantity: number; type: 'BUY' | 'SELL' }): Promise<ApiResponse<TradeResponse>>;
  }
}

// Add stockApi interface
export interface StockApi {
  predict: (ticker: string, exchange?: string, simplify?: boolean) => Promise<StockPrediction>;
  getPortfolio: () => Promise<Stock[]>;
  searchStocks: (query: string) => Promise<Stock[]>;
  getWatchlist: () => Promise<Stock[]>;
  addToWatchlist: (ticker: string) => Promise<any>;
  removeFromWatchlist: (ticker: string) => Promise<any>;
  getMarketIndices: () => Promise<any[]>;
  getTrendingStocks: () => Promise<Stock[]>;
  getMarketNews: () => Promise<any[]>;
  getNifty50Stocks: () => Promise<Stock[]>;
  executeTrade: (data: { ticker: string; quantity: number; type: 'BUY' | 'SELL' }) => Promise<ApiResponse<TradeResponse>>;
}