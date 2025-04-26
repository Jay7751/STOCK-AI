import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Stack,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Refresh
} from '@mui/icons-material';
import { stockApi } from '../services/api';
import { MarketIndex, TrendingStock, MarketNews, Stock } from '../types';
import StockPredictionWidget from '../components/StockPredictionWidget';

const Dashboard: React.FC = () => {
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([]);
  const [trendingStocks, setTrendingStocks] = useState<TrendingStock[]>([]);
  const [marketNews, setMarketNews] = useState<MarketNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [trendingLastUpdated, setTrendingLastUpdated] = useState<Date | null>(null);

  // Separate function for fetching trending stocks
  const fetchTrendingStocks = useCallback(async () => {
    try {
      console.log('Fetching trending stocks...');
      const trendingResponse = await stockApi.getTrendingStocks();
      console.log('Trending stocks response:', trendingResponse);

      if (!trendingResponse || !Array.isArray(trendingResponse)) {
        console.error('Invalid trending stocks response:', trendingResponse);
        return;
      }

      const validTrending = trendingResponse
        .filter(stock => stock && typeof stock === 'object')
        .map(stock => ({
          symbol: stock.symbol || stock.ticker || '',
          name: stock.name || stock.longName || stock.shortName || stock.symbol || '',
          price: Number(stock.price || stock.current_price || 0),
          change: Number(stock.change || 0),
          change_percent: Number(stock.change_percent || 0),
          changePercent: Number(stock.change_percent || 0),
          volume: Number(stock.volume || stock.regularMarketVolume || 0)
        } as TrendingStock));

      console.log('Processed trending stocks:', validTrending);
      setTrendingStocks(validTrending);
      setTrendingLastUpdated(new Date());
    } catch (err) {
      console.error('Trending stocks update error:', err);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsRefreshing(true);
      
      // Fetch market indices
      const indicesResponse = await stockApi.getMarketIndices();
      const validIndices = Array.isArray(indicesResponse) 
        ? indicesResponse.filter((index): index is MarketIndex => 
            typeof index === 'object' && 
            index !== null && 
            typeof index.symbol === 'string' &&
            typeof index.price === 'number' &&
            typeof index.change_percent === 'number'
          )
        : [];
      setMarketIndices(validIndices);
      
      // Initial trending stocks fetch
      await fetchTrendingStocks();
      
      // Fetch market news
      const newsResponse = await stockApi.getMarketNews();
      const validNews = Array.isArray(newsResponse)
        ? newsResponse.filter((news): news is MarketNews => 
            typeof news === 'object' && 
            news !== null &&
            typeof news.title === 'string' &&
            typeof news.summary === 'string' &&
            typeof news.source === 'string' &&
            typeof news.date === 'string' &&
            typeof news.url === 'string'
          )
        : [];
      setMarketNews(validNews);
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard data error:', err);
      setError('Failed to fetch latest data. Please try again later.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [fetchTrendingStocks]);

  useEffect(() => {
    fetchDashboardData();

    // Set up auto-refresh every 30 seconds for dashboard data
    const dashboardInterval = setInterval(fetchDashboardData, 30000);

    // Set up more frequent updates for trending stocks (every 5 seconds)
    const trendingInterval = setInterval(fetchTrendingStocks, 5000);

    return () => {
      clearInterval(dashboardInterval);
      clearInterval(trendingInterval);
    };
  }, [fetchDashboardData, fetchTrendingStocks]);

  const formatCurrency = (value: number | undefined | null) => {
    const numValue = value ?? 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(numValue);
  };

  const formatChange = (change: number | undefined | null) => {
    const changeValue = change ?? 0;
    const isPositive = changeValue >= 0;
    return (
      <Box display="flex" alignItems="center" color={isPositive ? 'success.main' : 'error.main'}>
        {isPositive ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
        <Typography variant="body2" ml={0.5}>
          {isPositive ? '+' : ''}{changeValue.toFixed(2)}%
        </Typography>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Stack spacing={3}>
        {/* Market Indices */}
        <Paper sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Market Indices</Typography>
            <Box display="flex" alignItems="center" gap={2}>
              {lastUpdated && (
                <Typography variant="caption" color="text.secondary">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </Typography>
              )}
              <Tooltip title="Refresh Data">
                <IconButton
                  onClick={fetchDashboardData}
                  disabled={isRefreshing}
                  size="small"
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Index</TableCell>
                  <TableCell align="right">Value</TableCell>
                  <TableCell align="right">Change</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {marketIndices.length > 0 ? (
                  marketIndices.map((index) => (
                    <TableRow key={index.symbol}>
                      <TableCell>{index.name || index.symbol}</TableCell>
                      <TableCell align="right">{formatCurrency(index.price)}</TableCell>
                      <TableCell align="right">
                        {formatChange(index.change_percent)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} align="center">No market indices available</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Trending Stocks and Market News side by side */}
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
          {/* Trending Stocks with live updates */}
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Live Trending Stocks</Typography>
              <Box display="flex" alignItems="center" gap={2}>
                {trendingLastUpdated && (
                  <Typography variant="caption" color="text.secondary">
                    Last updated: {trendingLastUpdated.toLocaleTimeString()}
                  </Typography>
                )}
                <Tooltip title="Refresh Trending Stocks">
                  <IconButton
                    onClick={fetchTrendingStocks}
                    disabled={isRefreshing}
                    size="small"
                  >
                    <Refresh />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <TableContainer sx={{ maxHeight: 400, overflow: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Change</TableCell>
                    <TableCell align="right">Volume</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trendingStocks.length > 0 ? (
                    trendingStocks.map((stock) => (
                      <TableRow 
                        key={stock.symbol}
                        sx={{
                          animation: 'fadeIn 0.5s ease-in',
                          '@keyframes fadeIn': {
                            '0%': {
                              backgroundColor: 'action.hover',
                            },
                            '100%': {
                              backgroundColor: 'transparent',
                            },
                          },
                          '&:hover': {
                            backgroundColor: 'action.hover',
                            cursor: 'pointer'
                          }
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {stock.symbol}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{stock.name}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {formatCurrency(stock.price)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {formatChange(stock.change_percent)}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {stock.volume.toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Box py={2}>
                          <Typography color="text.secondary">
                            Fetching trending stocks...
                          </Typography>
                          <CircularProgress size={20} sx={{ mt: 1 }} />
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Market News */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Market News
            </Typography>
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              <Stack spacing={2}>
                {marketNews.length > 0 ? (
                  marketNews.map((news, index) => (
                    <Card key={index} variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          {news.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {news.summary}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {news.source} • {new Date(news.date).toLocaleDateString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" align="center">
                    No market news available
                  </Typography>
                )}
              </Stack>
            </Box>
          </Paper>
        </Box>

        {/* Stock Prediction Widget */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Stock Price Prediction
          </Typography>
          <StockPredictionWidget />
        </Paper>
      </Stack>
    </Box>
  );
};

export default Dashboard;