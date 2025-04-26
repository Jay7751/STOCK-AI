import axios, { AxiosError } from 'axios';

interface ApiError {
  error: string;
}

const API_BASE_URL = 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error:', error.response.data);
      throw new Error(error.response.data.error || 'An error occurred');
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Network Error:', error.request);
      throw new Error('Network error. Please check your connection.');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error:', error.message);
      throw new Error('An unexpected error occurred');
    }
  }
);

export const stockApi = {
  // Stock prediction
  predict: async (ticker: string) => {
    try {
      const response = await api.post('/predict', { ticker });
      return response.data;
    } catch (error) {
      console.error('Prediction error:', error);
      throw error;
    }
  },

  // Portfolio management
  buyStock: async (email: string, ticker: string, quantity: number) => {
    try {
      const response = await api.post('/buy', { email, ticker, quantity });
      return response.data;
    } catch (error) {
      console.error('Buy stock error:', error);
      throw error;
    }
  },

  sellStock: async (email: string, ticker: string, quantity: number) => {
    try {
      const response = await api.post('/sell', { email, ticker, quantity });
      return response.data;
    } catch (error) {
      console.error('Sell stock error:', error);
      throw error;
    }
  },

  getPortfolio: async (email: string) => {
    try {
      const response = await api.post('/portfolio', { email });
      return response.data;
    } catch (error) {
      console.error('Get portfolio error:', error);
      throw error;
    }
  },

  // Watchlist management
  addToWatchlist: async (email: string, ticker: string) => {
    try {
      const response = await api.post('/watchlist/add', { email, ticker });
      return response.data;
    } catch (error) {
      console.error('Add to watchlist error:', error);
      throw error;
    }
  },

  removeFromWatchlist: async (email: string, ticker: string) => {
    try {
      const response = await api.post('/watchlist/remove', { email, ticker });
      return response.data;
    } catch (error) {
      console.error('Remove from watchlist error:', error);
      throw error;
    }
  },

  // Profile management
  editProfile: async (email: string, username: string) => {
    try {
      const response = await api.post('/profile/edit', { email, username });
      return response.data;
    } catch (error) {
      console.error('Edit profile error:', error);
      throw error;
    }
  },
}; 