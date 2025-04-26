import React, { useState, useCallback } from 'react';
import {
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Grid,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { api } from '../services/api';
import { Stock } from '../types';
import debounce from 'lodash/debounce';

interface StockInfo {
  name: string;
  price: number;
  change: number;
  change_percent: number;
}

interface TradingInterfaceProps {
  onTradeComplete?: () => void;
}

const TradingInterface: React.FC<TradingInterfaceProps> = ({ onTradeComplete }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [stock, setStock] = useState<StockInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchStockInfo = useCallback(
    debounce(async (symbol: string) => {
      if (!symbol) {
        setStock(null);
        return;
      }
      try {
        setLoading(true);
        const response = await api.get<{ data: Stock }>(`/api/stocks/${symbol}`);
        if (response.data) {
          const stockData = response.data.data;
          setStock({
            name: stockData.name,
            price: stockData.price,
            change: stockData.change,
            change_percent: stockData.change_percent
          });
        }
      } catch (err) {
        setStock(null);
        setError('Failed to fetch stock information');
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  const handleTickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setTicker(value);
    fetchStockInfo(value);
  };

  const handleTrade = async (action: 'buy' | 'sell') => {
    if (!ticker || !quantity || !stock) {
      setError('Please enter a valid ticker and quantity');
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/api/trade', {
        ticker,
        quantity: qty,
        action
      });

      if (response.data.success) {
        setSuccess(`Successfully ${action}ed ${qty} shares of ${ticker}`);
        setTicker('');
        setQuantity('');
        setStock(null);
        onTradeComplete?.();
      } else {
        setError(response.data.message || `Failed to ${action} stock`);
      }
    } catch (err) {
      setError(`Failed to ${action} stock. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Trading Interface
      </Typography>
      
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Box>
            <TextField
              fullWidth
              label="Stock Ticker"
              value={ticker}
              onChange={handleTickerChange}
              disabled={loading}
              margin="normal"
            />
          </Box>
          
          <Box>
            <TextField
              fullWidth
              label="Quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={loading || !stock}
              margin="normal"
            />
          </Box>
        </Box>

        {stock && (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle1">
              {stock.name} (₹{stock.price.toFixed(2)})
            </Typography>
            <Typography
              variant="body2"
              color={stock.change >= 0 ? 'success.main' : 'error.main'}
            >
              {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.change_percent.toFixed(2)}%)
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleTrade('buy')}
            disabled={loading || !stock || !quantity}
            fullWidth={isMobile}
          >
            Buy
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => handleTrade('sell')}
            disabled={loading || !stock || !quantity}
            fullWidth={isMobile}
          >
            Sell
          </Button>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}
      </Box>
    </Paper>
  );
};

export default TradingInterface; 