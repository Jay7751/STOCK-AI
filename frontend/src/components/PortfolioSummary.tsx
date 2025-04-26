import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  CircularProgress,
  Alert
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { api } from '../services/api';
import { Portfolio } from '../types';

interface PortfolioSummaryProps {
  portfolio: Portfolio | null;
}

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ portfolio }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (portfolio) {
      setLoading(false);
    }
  }, [portfolio]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box m={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!portfolio) {
    return null;
  }

  const totalGainLoss = portfolio.portfolio.reduce(
    (sum, stock) => sum + (stock.price - (stock.average_price || 0)) * (stock.quantity || 0),
    0
  );

  const totalGainLossPercent = portfolio.total_value
    ? (totalGainLoss / (portfolio.total_value - totalGainLoss)) * 100
    : 0;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Portfolio Summary
        </Typography>
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle1" color="textSecondary">
              Total Value
            </Typography>
            <Typography variant="h5">
              ₹{portfolio.total_value.toLocaleString()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle1" color="textSecondary">
              Cash Balance
            </Typography>
            <Typography variant="h5">
              ₹{portfolio.cash_balance.toLocaleString()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle1" color="textSecondary">
              Total Gain/Loss
            </Typography>
            <Box display="flex" alignItems="center">
              {totalGainLoss >= 0 ? (
                <TrendingUpIcon color="success" />
              ) : (
                <TrendingDownIcon color="error" />
              )}
              <Typography
                variant="h5"
                color={totalGainLoss >= 0 ? 'success.main' : 'error.main'}
              >
                ₹{Math.abs(totalGainLoss).toLocaleString()} (
                {totalGainLossPercent.toFixed(2)}%)
              </Typography>
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default PortfolioSummary; 