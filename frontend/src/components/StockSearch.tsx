import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Stack
} from '@mui/material';
import { stockApi } from '../services/api';
import { Stock } from '../types';
import debounce from 'lodash/debounce';

interface StockSearchProps {
  onAddToWatchlist?: (stock: Stock) => void;
  onBuy?: (stock: Stock, quantity: number) => void;
  showWatchlistButton?: boolean;
  showBuyButton?: boolean;
}

const StockSearch: React.FC<StockSearchProps> = ({
  onAddToWatchlist,
  onBuy,
  showWatchlistButton = true,
  showBuyButton = true
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [quantity, setQuantity] = useState('');
  const [openBuyDialog, setOpenBuyDialog] = useState(false);

  const searchStocks = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const results = await stockApi.searchStocks(query);
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to search stocks. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    searchStocks(value);
  };

  const handleAddToWatchlist = async (stock: Stock) => {
    try {
      if (stock.symbol) {
        await stockApi.addToWatchlist(stock.symbol);
        onAddToWatchlist?.(stock);
        setError(null);
      }
    } catch (err) {
      console.error('Add to watchlist error:', err);
      setError('Failed to add stock to watchlist. Please try again.');
    }
  };

  const handleBuyClick = (stock: Stock) => {
    setSelectedStock(stock);
    setOpenBuyDialog(true);
  };

  const handleBuyConfirm = () => {
    if (selectedStock && quantity) {
      const qty = parseInt(quantity);
      if (!isNaN(qty) && qty > 0) {
        onBuy?.(selectedStock, qty);
        setOpenBuyDialog(false);
        setQuantity('');
        setSelectedStock(null);
      }
    }
  };

  return (
    <Box>
      <TextField
        fullWidth
        label="Search Stocks"
        value={searchQuery}
        onChange={handleSearchChange}
        variant="outlined"
        size="small"
        margin="normal"
      />

      {loading && (
        <Box display="flex" justifyContent="center" my={2}>
          <CircularProgress size={24} />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {searchResults.length > 0 && (
        <Stack spacing={1} mt={2}>
          {searchResults.map((stock) => (
            <Box
              key={stock.symbol}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              p={1}
              border={1}
              borderColor="divider"
              borderRadius={1}
            >
              <Box>
                <Typography variant="subtitle1">{stock.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {stock.symbol} • ₹{stock.price.toFixed(2)}
                </Typography>
              </Box>
              <Box display="flex" gap={1}>
                {showWatchlistButton && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleAddToWatchlist(stock)}
                  >
                    Add to Watchlist
                  </Button>
                )}
                {showBuyButton && (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => handleBuyClick(stock)}
                  >
                    Buy
                  </Button>
                )}
              </Box>
            </Box>
          ))}
        </Stack>
      )}

      <Dialog open={openBuyDialog} onClose={() => setOpenBuyDialog(false)}>
        <DialogTitle>Buy {selectedStock?.name}</DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <Typography variant="body2" gutterBottom>
              Current Price: ₹{selectedStock?.price.toFixed(2)}
            </Typography>
            <TextField
              fullWidth
              label="Quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBuyDialog(false)}>Cancel</Button>
          <Button
            onClick={handleBuyConfirm}
            variant="contained"
            disabled={!quantity || parseInt(quantity) <= 0}
          >
            Confirm Buy
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StockSearch; 