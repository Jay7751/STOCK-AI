import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Typography,
  Box,
  CircularProgress,
  TextField,
  Button,
  Alert,
  Stack
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import StockPredictionChart from './StockPredictionChart';
import { stockApi } from '../services/api';
import { StockPrediction, Stock } from '../types';

// Add interface for API response
interface PredictionApiResponse {
  ticker: string;
  current_price: number;
  prediction_dates: string[];
  prediction_prices?: number[];
  predicted_prices?: number[];
  confidence: number;
  [key: string]: any;
}

interface StockPredictionWidgetProps {
  defaultTicker?: string;
}

const StockPredictionWidget: React.FC<StockPredictionWidgetProps> = ({ defaultTicker }) => {
  const [ticker, setTicker] = useState(defaultTicker || '');
  const [inputTicker, setInputTicker] = useState(defaultTicker || '');
  const [prediction, setPrediction] = useState<StockPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  
  const examples = ['RELIANCE', 'INFY', 'TCS', 'HDFCBANK', 'SBIN'];
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkWatchlist = (symbol: string) => {
    try {
      const existingWatchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
      const exists = existingWatchlist.some((item: Stock) => item.symbol === symbol);
      setIsInWatchlist(exists);
    } catch (err) {
      console.error('Error checking watchlist:', err);
      setIsInWatchlist(false);
    }
  };

  const addToWatchlist = (stock: Stock) => {
    try {
      // Get existing watchlist from localStorage
      const existingWatchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
      
      // Check if stock already exists in watchlist
      const exists = existingWatchlist.some((item: Stock) => item.symbol === stock.symbol);
      
      if (!exists) {
        // Add new stock to watchlist
        const updatedWatchlist = [...existingWatchlist, stock];
        localStorage.setItem('watchlist', JSON.stringify(updatedWatchlist));
        setSuccess(`${stock.symbol} added to watchlist`);
        setIsInWatchlist(true);
      } else {
        setError(`${stock.symbol} is already in your watchlist`);
      }
    } catch (err) {
      console.error('Error adding to watchlist:', err);
      setError('Failed to add to watchlist');
    }
  };

  const fetchPrediction = async (symbol: string) => {
    if (!symbol) return;
    
    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      console.log(`Starting prediction fetch for ${symbol}...`);
      
      // Set a timeout to automatically retry if taking too long
      timeoutRef.current = setTimeout(() => {
        console.log("Prediction request is taking too long, canceling and retrying...");
        setError("Request is taking longer than expected. Retrying with simplified prediction...");
        // Will retry in the catch block
        throw new Error("Prediction timeout");
      }, 8000); // 8 second timeout
      
      // Determine the appropriate exchange based on the stock symbol
      const usStocks = ['AAPL', 'MSFT', 'AMZN', 'GOOG', 'GOOGL', 'META', 'TSLA', 'NVDA', 'JPM', 'JNJ', 'WMT', 'V', 'PG', 'MA', 'UNH', 'HD', 'BAC', 'DIS', 'PYPL', 'ADBE', 'CRM', 'NFLX', 'INTC', 'CSCO'];
      const exchange = usStocks.includes(symbol.toUpperCase()) ? '' : 'NSE';
      
      const data = await stockApi.predict(symbol, exchange) as PredictionApiResponse;
      
      // Clear the timeout since we got a response
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (!data) {
        setError(`No prediction data available for ${symbol}`);
        setPrediction(null);
        return;
      }
      
      // Verify the data has the expected format
      if ((!Array.isArray(data.prediction_prices) && !Array.isArray(data.predicted_prices)) || 
          !Array.isArray(data.prediction_dates) || 
          typeof data.current_price !== 'number') {
        setError(`Invalid prediction data received for ${symbol}`);
        console.error('Invalid prediction data format:', data);
        setPrediction(null);
        return;
      }
      
      // Use prediction_prices if available, otherwise fall back to predicted_prices
      const prices = data.prediction_prices || data.predicted_prices || [];
      
      // Validate that we have enough data points
      if (prices.length === 0 || data.prediction_dates.length === 0) {
        setError(`No prediction points available for ${symbol}`);
        console.error('Empty prediction data:', data);
        setPrediction(null);
        return;
      }
      
      // If confidence is a decimal (0-1), convert to percentage (0-100)
      let confidence = data.confidence;
      if (confidence === undefined || confidence === null) {
        confidence = 0;
      } else if (confidence < 1) {
        confidence = confidence * 100;
      }
      
      // Normalize the prediction data
      const normalizedData: StockPrediction = {
        ticker: data.ticker || symbol,
        current_price: typeof data.current_price === 'number' ? data.current_price : 0,
        prediction_dates: Array.isArray(data.prediction_dates) ? data.prediction_dates : [],
        prediction_prices: Array.isArray(prices) ? prices : [],
        confidence: confidence
      };
      
      console.log(`Successfully received prediction for ${symbol}`);
      setPrediction(normalizedData);
      checkWatchlist(symbol);
      
    } catch (err: any) {
      // Clear the timeout if it exists
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      console.error('Error fetching prediction:', err);
      
      // Provide more helpful error messages based on error type
      if (err.message?.includes('timeout')) {
        setError(`Request timed out. Trying simplified prediction.`);
        // Try one more time with a simplified request
        try {
          console.log("Retrying with simplified prediction request");
          const data = await stockApi.predict(symbol, "NSE", true) as PredictionApiResponse;
          
          if (data && ((data.prediction_prices && data.prediction_prices.length > 0) || 
                       (data.predicted_prices && data.predicted_prices.length > 0))) {
            
            // Use prediction_prices if available, otherwise fall back to predicted_prices
            const prices = data.prediction_prices || data.predicted_prices || [];
            
            // If confidence is a decimal (0-1), convert to percentage (0-100)
            let confidence = data.confidence;
            if (confidence === undefined || confidence === null) {
              confidence = 0;
            } else if (confidence < 1) {
              confidence = confidence * 100;
            }
            
            const normalizedData: StockPrediction = {
              ticker: data.ticker || symbol,
              current_price: typeof data.current_price === 'number' ? data.current_price : 0,
              prediction_dates: Array.isArray(data.prediction_dates) ? data.prediction_dates : [],
              prediction_prices: Array.isArray(prices) ? prices : [],
              confidence: confidence
            };
            
            setPrediction(normalizedData);
            setError(null);
            setLoading(false);
            checkWatchlist(symbol);
            return;
          }
        } catch (retryErr) {
          console.error("Retry also failed:", retryErr);
        }
      }
      
      // If we're here, both attempts failed or another error occurred
      if (err.response?.status === 404) {
        setError(`Symbol ${symbol} not found. Please try a different stock symbol.`);
      } else if (err.response?.status === 400) {
        setError(`Cannot predict for ${symbol}. ${err.response?.data?.message || 'Bad request'}`);
      } else {
        setError(`Failed to fetch prediction for ${symbol}. ${err.message || 'Please try a different stock or try again later.'}`);
      }
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (defaultTicker) {
      fetchPrediction(defaultTicker);
    }
    
    // Clean up any timeouts when component unmounts
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [defaultTicker]);

  // Ensure balance is initialized
  useEffect(() => {
    if (localStorage.getItem('balance') === null) {
      localStorage.setItem('balance', '1000000');
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTicker.trim()) {
      setError("Please enter a stock symbol");
      return;
    }
    setTicker(inputTicker.trim().toUpperCase());
    fetchPrediction(inputTicker.trim().toUpperCase());
  };

  const handleTrade = (type: 'BUY' | 'SELL') => {
    if (!prediction) return;
    const qtyStr = window.prompt(`Enter quantity to ${type.toLowerCase()}:`);
    if (!qtyStr) return;
    const quantity = parseInt(qtyStr, 10);
    if (isNaN(quantity) || quantity <= 0) {
      alert('Invalid quantity');
      return;
    }

    // Portfolio consistency logic
    let portfolio = [];
    try {
      portfolio = JSON.parse(localStorage.getItem('portfolio') || '[]');
    } catch {
      portfolio = [];
    }
    const idx = portfolio.findIndex((item: any) => item.ticker === prediction.ticker);
    let currentQty = idx >= 0 ? portfolio[idx].quantity : 0;

    // Balance logic
    let balance = parseFloat(localStorage.getItem('balance') || '1000000');
    const totalValue = prediction.current_price * quantity;

    if (type === 'SELL') {
      if (quantity > currentQty) {
        alert(`You cannot sell more than you own! (You own ${currentQty})`);
        return;
      }
      // Add proceeds to balance
      balance += totalValue;
      // Subtract quantity
      if (idx >= 0) {
        portfolio[idx].quantity -= quantity;
        if (portfolio[idx].quantity === 0) portfolio.splice(idx, 1);
      }
    } else if (type === 'BUY') {
      if (totalValue > balance) {
        alert(`Insufficient balance! You have ₹${balance.toFixed(2)}, need ₹${totalValue.toFixed(2)}`);
        return;
      }
      balance -= totalValue;
      if (idx >= 0) {
        portfolio[idx].quantity += quantity;
      } else {
        portfolio.push({ ticker: prediction.ticker, quantity });
      }
    }
    localStorage.setItem('portfolio', JSON.stringify(portfolio));
    localStorage.setItem('balance', balance.toString());

    // Store transaction
    const transaction = {
      ticker: prediction.ticker,
      type,
      quantity,
      price: prediction.current_price,
      timestamp: new Date().toISOString()
    };
    try {
      const existing = JSON.parse(localStorage.getItem('transactions') || '[]');
      existing.push(transaction);
      localStorage.setItem('transactions', JSON.stringify(existing));
      alert(`${type} order placed for ${quantity} shares of ${prediction.ticker}`);
    } catch (err) {
      alert('Failed to save transaction');
    }
  };

  return (
    <Card sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        7-Day Stock Price Prediction (₹)
      </Typography>

      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', mb: 3, gap: 1 }}>
          <TextField
            label="Stock Symbol"
            placeholder="e.g., RELIANCE, TCS"
            value={inputTicker}
            onChange={(e) => setInputTicker(e.target.value.toUpperCase())}
            variant="outlined"
            size="small"
            fullWidth
            error={!!error && !loading}
          />
          <Button 
            type="submit" 
            variant="contained" 
            disabled={!inputTicker || loading}
          >
            Predict
          </Button>
        </Box>
      </form>
      
      {!ticker && !loading && !error && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Try popular stocks:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {examples.map((example) => (
              <Button 
                key={example}
                size="small" 
                variant="outlined" 
                onClick={() => {
                  setInputTicker(example);
                  setTicker(example);
                  fetchPrediction(example);
                }}
              >
                {example}
              </Button>
            ))}
          </Box>
        </Box>
      )}

      {loading ? (
        <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="300px">
          <CircularProgress />
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            Analyzing market data for {inputTicker}...
          </Typography>
        </Box>
      ) : error ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="300px">
          <Alert severity="error" sx={{ maxWidth: "100%" }}>
            {error}
          </Alert>
        </Box>
      ) : !ticker ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="300px">
          <Typography color="textSecondary">
            Enter a stock symbol to see price prediction
          </Typography>
        </Box>
      ) : !prediction ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="300px">
          <Typography color="textSecondary">
            No prediction data available for {ticker}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1">
              {prediction.ticker} - ₹{prediction.current_price.toFixed(2)}
            </Typography>
            {!isInWatchlist && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => addToWatchlist({
                  ticker: prediction.ticker,
                  symbol: prediction.ticker,
                  name: prediction.ticker,
                  price: prediction.current_price,
                  current_price: prediction.current_price,
                  change: 0,
                  change_percent: 0,
                  volume: 0
                })}
              >
                Add to Watchlist
              </Button>
            )}
          </Box>
          <StockPredictionChart prediction={prediction} />

          {/* Buy/Sell Buttons */}
          <Box display="flex" gap={2} justifyContent="center" mt={2}>
            <Button variant="contained" color="success" onClick={() => handleTrade('BUY')}>
              Buy
            </Button>
            <Button variant="contained" color="error" onClick={() => handleTrade('SELL')}>
              Sell
            </Button>
          </Box>
        </Stack>
      )}
    </Card>
  );
};

export default StockPredictionWidget;