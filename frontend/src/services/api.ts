import axios from 'axios';
import { Profile, Stock, AuthResponse, StockApi } from '../types';

// Use URL from environment or default
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

console.log('API configured with URL:', API_URL);

// Create axios instance with default config
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Create a separate instance for external API calls
export const externalApi = axios.create({
  timeout: 10000,
});

// Rate limiting configuration for Yahoo Finance API
const RATE_LIMIT_WINDOW = 1000; // 1 second
let lastYahooApiCall = 0;

// Create a separate instance for Yahoo Finance API
export const yahooApi = axios.create({
  baseURL: 'https://query1.finance.yahoo.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  console.log(`Request to ${config.url}`);
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  console.error('Request interceptor error:', error);
  return Promise.reject(error);
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`Response from ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
      console.error('Error headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request setup error:', error.message);
    }
    
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Add rate limiting interceptor for Yahoo Finance API
yahooApi.interceptors.request.use(async (config) => {
  const now = Date.now();
  const timeSinceLastCall = now - lastYahooApiCall;
  
  if (timeSinceLastCall < RATE_LIMIT_WINDOW) {
    const delay = RATE_LIMIT_WINDOW - timeSinceLastCall;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  lastYahooApiCall = Date.now();
  return config;
});

// Add response interceptor for Yahoo Finance API
yahooApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error('Yahoo Finance API Error:', error);
    
    if (error.response?.status === 429) {
      console.log('Rate limit exceeded, retrying after delay...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return yahooApi(error.config);
    }
    
    throw error;
  }
);

// Authentication
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>('/api/login', { email, password });
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const register = async (email: string, password: string, name: string): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>('/api/register', { email, password, name });
    return response.data;
  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
};

// Nifty 50 stocks list
const NIFTY50_SYMBOLS = [
  'ADANIENT.NS', 'ADANIPORTS.NS', 'APOLLOHOSP.NS', 'ASIANPAINT.NS', 'AXISBANK.NS',
  'BAJAJ-AUTO.NS', 'BAJFINANCE.NS', 'BAJAJFINSV.NS', 'BPCL.NS', 'BHARTIARTL.NS',
  'BRITANNIA.NS', 'CIPLA.NS', 'COALINDIA.NS', 'DIVISLAB.NS', 'DRREDDY.NS',
  'EICHERMOT.NS', 'GRASIM.NS', 'HCLTECH.NS', 'HDFCBANK.NS', 'HDFCLIFE.NS',
  'HEROMOTOCO.NS', 'HINDALCO.NS', 'HINDUNILVR.NS', 'ICICIBANK.NS', 'ITC.NS',
  'INDUSINDBK.NS', 'INFY.NS', 'JSWSTEEL.NS', 'KOTAKBANK.NS', 'LT.NS',
  'M&M.NS', 'MARUTI.NS', 'NTPC.NS', 'NESTLEIND.NS', 'ONGC.NS',
  'POWERGRID.NS', 'RELIANCE.NS', 'SBILIFE.NS', 'SBIN.NS', 'SUNPHARMA.NS',
  'TCS.NS', 'TATACONSUM.NS', 'TATAMOTORS.NS', 'TATASTEEL.NS', 'TECHM.NS',
  'TITAN.NS', 'UPL.NS', 'ULTRACEMCO.NS', 'WIPRO.NS', 'ZEEL.NS'
];

// Add a function to get real-time stock prices
const getRealTimePrices = async (symbols: string[]): Promise<Record<string, number>> => {
  try {
    const symbolsString = symbols.join(',');
    const response = await yahooApi.get('/v8/finance/quote', {
      params: { symbols: symbolsString }
    });

    if (!response.data?.quoteResponse?.result) {
      return {};
    }

    return response.data.quoteResponse.result.reduce((acc: Record<string, number>, quote: any) => {
      acc[quote.symbol] = quote.regularMarketPrice || 0;
      return acc;
    }, {});
  } catch (error) {
    console.error('Error fetching real-time prices:', error);
    return {};
  }
};

// API functions
export const stockApi: StockApi = {
  // Stock prediction
  predict: async (ticker: string, exchange: string = 'NSE', simplify: boolean = false) => {
    let retries = 2;
    while (retries >= 0) {
      try {
        console.log(`Attempting to fetch prediction for ${ticker} (Retry ${2-retries})`);
        const response = await api.get(`/api/predict/${ticker}`, { 
          params: { 
            exchange,
            simplify: simplify ? 'true' : 'false'
          },
          timeout: simplify ? 5000 : 15000 // Use shorter timeout for simplified predictions
        });
        console.log('Prediction response:', response.data);
        
        // Map backend response to our expected format
        if (!response.data) {
          throw new Error('No data received from server');
        }
        
        // Handle data mapping to match our StockPrediction type
        const predictionData = {
          ticker: response.data.ticker || ticker,
          current_price: response.data.current_price,
          prediction_dates: response.data.prediction_dates || [],
          prediction_prices: response.data.prediction_prices || response.data.predicted_prices || [],
          confidence: response.data.confidence || 0
        };
        
        return predictionData;
        
      } catch (error) {
        console.error(`Prediction error (retries left: ${retries}):`, error);
        if (retries === 0) {
          throw error;
        }
        retries--;
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 2000 * (3 - retries)));
      }
    }
    throw new Error("Failed to get prediction after multiple attempts");
  },

  // Portfolio management
  getPortfolio: async (): Promise<Stock[]> => {
    try {
      const response = await api.get('/api/portfolio');
      const portfolio = response.data;

      if (!Array.isArray(portfolio) || portfolio.length === 0) {
        return [];
      }

      // Get real-time prices for portfolio stocks
      const symbols = portfolio.map(stock => `${stock.symbol}.NS`);
      const realTimePrices = await getRealTimePrices(symbols);

      return portfolio.map(stock => ({
        ...stock,
        current_price: realTimePrices[`${stock.symbol}.NS`] || stock.price,
        price: realTimePrices[`${stock.symbol}.NS`] || stock.price,
        total_value: (realTimePrices[`${stock.symbol}.NS`] || stock.price) * (stock.quantity || 0)
      }));
    } catch (error) {
      console.error('Get portfolio error:', error);
      throw error;
    }
  },

  // Search stocks using Yahoo Finance API - Modified for Nifty 50
  searchStocks: async (query: string): Promise<Stock[]> => {
    try {
      console.log('Searching for Nifty 50 stocks with query:', query);

      if (!query) {
        return [];
      }

      const upperQuery = query.toUpperCase();
      const matchingSymbols = NIFTY50_SYMBOLS.filter(symbol => 
        symbol.replace('.NS', '').includes(upperQuery)
      );

      if (matchingSymbols.length === 0) {
        return [];
      }

      // Get real-time prices
      const realTimePrices = await getRealTimePrices(matchingSymbols);
      const response = await yahooApi.get('/v8/finance/quote', {
        params: { symbols: matchingSymbols.join(',') }
      });

      if (!response.data?.quoteResponse?.result) {
        return [];
      }

      return response.data.quoteResponse.result.map((quote: any) => ({
        ticker: quote.symbol.replace('.NS', ''),
        symbol: quote.symbol.replace('.NS', ''),
        name: quote.longName || quote.shortName || quote.symbol,
        current_price: realTimePrices[quote.symbol] || quote.regularMarketPrice || 0,
        price: realTimePrices[quote.symbol] || quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        change_percent: quote.regularMarketChangePercent || 0,
        volume: quote.regularMarketVolume || 0
      }));
    } catch (error) {
      console.error('Search stocks error:', error);
      throw error;
    }
  },

  // Get all Nifty 50 stocks
  getNifty50Stocks: async (): Promise<Stock[]> => {
    try {
      const response = await yahooApi.get('/v8/finance/quote', {
        params: { symbols: NIFTY50_SYMBOLS.join(',') }
      });

      if (!response.data?.quoteResponse?.result) {
        return [];
      }

      return response.data.quoteResponse.result.map((quote: any) => ({
        ticker: quote.symbol.replace('.NS', ''),
        name: quote.longName || quote.shortName || quote.symbol,
        current_price: quote.regularMarketPrice || 0,
        price: quote.regularMarketPrice || 0,
        change: quote.regularMarketChange || 0,
        change_percent: quote.regularMarketChangePercent || 0,
        volume: quote.regularMarketVolume || 0,
        exchange: 'NSE'
      }));
    } catch (error) {
      console.error('Failed to fetch Nifty 50 stocks:', error);
      throw error;
    }
  },

  // Watchlist management
  getWatchlist: async (): Promise<Stock[]> => {
    try {
      const response = await api.get('/api/watchlist');
      const watchlist = response.data;

      if (!Array.isArray(watchlist) || watchlist.length === 0) {
        return [];
      }

      // Get real-time prices for watchlist stocks
      const symbols = watchlist.map(stock => `${stock.symbol}.NS`);
      const realTimePrices = await getRealTimePrices(symbols);

      return watchlist.map(stock => ({
        ...stock,
        current_price: realTimePrices[`${stock.symbol}.NS`] || stock.price,
        price: realTimePrices[`${stock.symbol}.NS`] || stock.price
      }));
    } catch (error) {
      console.error('Get watchlist error:', error);
      throw error;
    }
  },

  addToWatchlist: async (ticker: string) => {
    try {
      console.log('Adding to watchlist:', ticker);
      
      // Get current stock data from Yahoo Finance
      const quoteResponse = await yahooApi.get('/v8/finance/quote', {
        params: {
          symbols: ticker
        }
      });

      const quoteData = quoteResponse.data?.quoteResponse?.result?.[0];
      if (!quoteData) {
        throw new Error('Failed to fetch stock data');
      }

      const stockData = {
        ticker,
        name: quoteData.longName || quoteData.shortName || ticker,
        current_price: quoteData.regularMarketPrice || 0,
        price: quoteData.regularMarketPrice || 0,
        change: quoteData.regularMarketChange || 0,
        change_percent: quoteData.regularMarketChangePercent || 0,
        volume: quoteData.regularMarketVolume || 0
      };

      const response = await api.post('/api/watchlist', stockData);
      console.log('Add to watchlist response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Add to watchlist error:', error);
      throw error;
    }
  },

  removeFromWatchlist: async (ticker: string) => {
    try {
      console.log('Removing from watchlist:', ticker);
      const response = await api.delete(`/api/watchlist/${ticker}`);
      console.log('Remove from watchlist response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Remove from watchlist error:', error);
      throw error;
    }
  },

  // Market data
  getMarketIndices: async () => {
    try {
      const response = await api.get('/api/market/indices');
      console.log('Raw market indices response:', response);
      console.log('Market indices response data structure:', JSON.stringify(response.data, null, 2));
      return response.data || [];
    } catch (error) {
      console.error('Get market indices error:', error);
      throw error;
    }
  },

  getTrendingStocks: async () => {
    try {
      const response = await api.get('/api/market/trending');
      console.log('Raw trending stocks response:', response);
      console.log('Trending stocks response data structure:', JSON.stringify(response.data, null, 2));
      return response.data || [];
    } catch (error) {
      console.error('Get trending stocks error:', error);
      throw error;
    }
  },

  getMarketNews: async () => {
    try {
      const response = await api.get('/api/market/news');
      return response.data || [];
    } catch (error) {
      console.error('Get market news error:', error);
      throw error;
    }
  },

  // Add executeTrade method
  executeTrade: async (data: { ticker: string; quantity: number; type: 'BUY' | 'SELL' }) => {
    try {
      const response = await api.post('/api/trade', data);
      return response.data;
    } catch (error) {
      console.error('Execute trade error:', error);
      throw error;
    }
  }
};

// Stock Details and Predictions
export const getStockDetails = async (ticker: string, exchange: string = 'NSE'): Promise<Stock> => {
  const response = await api.get<Stock>(`/stock/${ticker}`, { params: { exchange } });
  return response.data;
};

export const getProfile = async (email: string): Promise<Profile> => {
  const response = await api.post('/profile', { email });
  return response.data;
};

export const buyStock = async (email: string, ticker: string, quantity: number) => {
  try {
    const response = await api.post('/buy', { email, ticker, quantity });
    return response.data;
  } catch (error) {
    console.error('Buy stock error:', error);
    throw error;
  }
};

export const sellStock = async (email: string, ticker: string, quantity: number) => {
  try {
    const response = await api.post('/sell', { email, ticker, quantity });
    return response.data;
  } catch (error) {
    console.error('Sell stock error:', error);
    throw error;
  }
};

export const predictStockPrice = async (ticker: string, exchange: string = 'NSE') => {
  try {
    const response = await api.get(`/api/predict/${ticker}`, { params: { exchange } });
    return response.data;
  } catch (error) {
    console.error('Predict stock price error:', error);
    throw error;
  }
}; 