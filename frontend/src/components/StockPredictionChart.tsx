import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Typography, Box, Paper } from '@mui/material';
import { StockPrediction } from '../types';

interface StockPredictionChartProps {
  prediction: StockPrediction;
}

const formatPrice = (price: number | undefined | null) => {
  if (price === undefined || price === null) return '0.00';
  return price.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });
};

const formatPercentage = (percent: number | undefined | null) => {
  if (percent === undefined || percent === null) return '0.00%';
  return percent.toFixed(2) + '%';
};

const StockPredictionChart: React.FC<StockPredictionChartProps> = ({ prediction }) => {
  // Validate prediction data
  if (!prediction || !prediction.prediction_dates || !prediction.prediction_prices || 
      prediction.prediction_dates.length === 0 || prediction.prediction_prices.length === 0) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" color="error">Prediction Error</Typography>
        <Typography variant="body2">Invalid or incomplete prediction data received.</Typography>
      </Paper>
    );
  }
  
  // Format data for the chart
  const chartData = prediction.prediction_dates.map((date, index) => {
    // Check if we have a valid price
    if (index >= prediction.prediction_prices.length) {
      return {
        date,
        price: prediction.current_price, // Fallback to current price
        change: 0,
        changePercentage: 0
      };
    }
    
    const price = prediction.prediction_prices[index];
    const change = price - prediction.current_price;
    const changePercentage = (change / prediction.current_price) * 100;
    
    return {
      date,
      price,
      change,
      changePercentage
    };
  });

  // Add the current price as the first data point
  chartData.unshift({
    date: 'Today',
    price: prediction.current_price,
    change: 0,
    changePercentage: 0
  });

  // Get the final predicted price and calculate the final change
  const finalPrice = prediction.prediction_prices[prediction.prediction_prices.length - 1];
  const finalChange = finalPrice - prediction.current_price;
  const finalChangePercentage = (finalChange / prediction.current_price) * 100;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6">7-Day Price Prediction</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mt: 2, alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" color="textSecondary">Current Price</Typography>
            <Typography variant="h5">₹{formatPrice(prediction.current_price)}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="textSecondary">Predicted (7 Days)</Typography>
            <Typography 
              variant="h5" 
              sx={{ color: finalChange >= 0 ? 'success.main' : 'error.main' }}
            >
              ₹{formatPrice(finalPrice)}
            </Typography>
          </Box>
          <Box sx={{ 
            bgcolor: finalChange >= 0 ? 'success.light' : 'error.light',
            color: finalChange >= 0 ? 'success.contrastText' : 'error.contrastText',
            px: 1.5,
            py: 0.75,
            borderRadius: 1
          }}>
            {finalChange >= 0 ? '↑' : '↓'} {formatPercentage(Math.abs(finalChangePercentage))}
          </Box>
        </Box>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Prediction Confidence: {typeof prediction.confidence === 'number' ? prediction.confidence.toFixed(1) : '0.0'}%
        </Typography>
      </Box>

      <Box sx={{ height: 300, mb: 3 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis 
              domain={['dataMin - 5', 'dataMax + 5']} 
              tickFormatter={(value) => `₹${formatPrice(value)}`}
            />
            <Tooltip 
              formatter={(value: number) => [`₹${formatPrice(value)}`, 'Price']}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#10B981" 
              strokeWidth={2} 
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        {chartData.slice(1).map((day, index) => (
          <Paper 
            key={index} 
            sx={{ 
              p: 2, 
              borderTop: '4px solid', 
              borderColor: day.change >= 0 ? 'success.main' : 'error.main' 
            }}
          >
            <Typography variant="body2">{day.date}</Typography>
            <Typography variant="h6">₹{formatPrice(day.price)}</Typography>
            <Typography 
              variant="body2"
              sx={{ color: day.change >= 0 ? 'success.main' : 'error.main' }}
            >
              {day.change >= 0 ? '↑' : '↓'} {formatPercentage(Math.abs(day.changePercentage))}
            </Typography>
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

export default StockPredictionChart; 