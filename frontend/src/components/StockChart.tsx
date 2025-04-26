import React, { useEffect, useState } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Box, Typography, CircularProgress } from '@mui/material';
import { api } from '../services/api';

interface StockData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20: number;
  sma50: number;
}

interface StockChartProps {
  ticker: string;
  period?: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | '10y';
}

const formatPrice = (price: number) => {
  return price.toFixed(2);
};

const formatPercentage = (percent: number) => {
  return percent.toFixed(2) + '%';
};

export default function StockChart({ ticker, period = '1mo' }: StockChartProps) {
  const [data, setData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/stock/${ticker}/chart?period=${period}`);
        setData(response.data.data);
      } catch (err) {
        setError('Failed to fetch stock data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ticker, period]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 400 }}>
      <ResponsiveContainer>
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => new Date(date).toLocaleDateString()}
          />
          <YAxis
            yAxisId="left"
            orientation="left"
            domain={['auto', 'auto']}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={['auto', 'auto']}
          />
          <Tooltip
            labelFormatter={(date) => new Date(date).toLocaleDateString()}
            formatter={(value: number, name: string) => [
              value.toLocaleString(undefined, {
                style: 'currency',
                currency: 'INR'
              }),
              name
            ]}
          />
          <Legend />
          <Bar
            yAxisId="right"
            dataKey="volume"
            fill="#8884d8"
            name="Volume"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="sma20"
            stroke="#ff7300"
            dot={false}
            name="SMA 20"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="sma50"
            stroke="#387908"
            dot={false}
            name="SMA 50"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="close"
            stroke="#000000"
            dot={false}
            name="Close"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
} 