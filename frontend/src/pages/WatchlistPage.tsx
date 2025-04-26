import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  IconButton,
  Grid,
  Chip
} from '@mui/material';
import { Delete as DeleteIcon, TrendingUp, TrendingDown } from '@mui/icons-material';
import StockPredictionWidget from '../components/StockPredictionWidget';
import { Stock } from '../types';

const WatchlistPage: React.FC = () => {
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load watchlist from localStorage
  useEffect(() => {
    try {
      const savedWatchlist = localStorage.getItem('watchlist');
      if (savedWatchlist) {
        const parsedWatchlist = JSON.parse(savedWatchlist);
        setWatchlist(parsedWatchlist);
      }
    } catch (err) {
      console.error('Error loading watchlist:', err);
      setError('Failed to load watchlist from storage');
    }
  }, []);

  // Remove stock from watchlist
  const handleRemoveStock = (ticker: string) => {
    try {
      const updatedWatchlist = watchlist.filter(stock => stock.ticker !== ticker);
      localStorage.setItem('watchlist', JSON.stringify(updatedWatchlist));
      setWatchlist(updatedWatchlist);
      
      if (selectedTicker === ticker) {
        setSelectedTicker(null);
      }
    } catch (err) {
      console.error('Error removing stock:', err);
      setError('Failed to remove stock from watchlist');
    }
  };

  // Format price with currency symbol
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(price);
  };

  // Format percentage change
  const formatChange = (change: number) => {
    const formattedChange = change.toFixed(2);
    return change >= 0 ? `+${formattedChange}%` : `${formattedChange}%`;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Watchlist Table Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              My Watchlist
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Change</TableCell>
                    <TableCell align="right">Change %</TableCell>
                    <TableCell align="right">Volume</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {watchlist.length > 0 ? (
                    watchlist.map((stock) => (
                      <TableRow 
                        key={stock.ticker}
                        hover
                        selected={selectedTicker === stock.ticker}
                        onClick={() => setSelectedTicker(stock.ticker)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Typography variant="subtitle2">
                            {stock.ticker}
                          </Typography>
                        </TableCell>
                        <TableCell>{stock.name}</TableCell>
                        <TableCell align="right">
                          {formatPrice(stock.current_price || stock.price)}
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            {stock.change >= 0 ? 
                              <TrendingUp color="success" sx={{ mr: 1 }} /> : 
                              <TrendingDown color="error" sx={{ mr: 1 }} />
                            }
                            {formatPrice(stock.change)}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={formatChange(stock.change_percent)}
                            color={stock.change_percent >= 0 ? "success" : "error"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {stock.volume.toLocaleString()}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveStock(stock.ticker);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary">
                          No stocks in watchlist
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Stock Prediction Section */}
        {selectedTicker && (
          <Grid item xs={12}>
            <StockPredictionWidget defaultTicker={selectedTicker} />
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default WatchlistPage; 
 