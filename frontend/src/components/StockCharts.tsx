import React from 'react';
import {
  LineChart as Chart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, Title, Text } from '@tremor/react';
import { ChartDataPoint } from '../types';

interface StockChartsProps {
  data: ChartDataPoint[];
  symbol: string;
}

export default function StockCharts({ data, symbol }: StockChartsProps) {
  const latestData = data[data.length - 1];
  const priceChange = latestData.actual - data[0].actual;
  const priceChangePercent = (priceChange / data[0].actual) * 100;
  const predictedChange = latestData.predicted - latestData.actual;
  const predictedChangePercent = (predictedChange / latestData.actual) * 100;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <Title>Current Price</Title>
          <Text className="text-2xl font-bold">${latestData.actual.toFixed(2)}</Text>
          <Text className={`${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {priceChange >= 0 ? '↑' : '↓'} ${Math.abs(priceChange).toFixed(2)} ({priceChangePercent.toFixed(2)}%)
          </Text>
        </Card>
        <Card>
          <Title>Predicted Price</Title>
          <Text className="text-2xl font-bold">${latestData.predicted.toFixed(2)}</Text>
          <Text className={`${predictedChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {predictedChange >= 0 ? '↑' : '↓'} ${Math.abs(predictedChange).toFixed(2)} ({predictedChangePercent.toFixed(2)}%)
          </Text>
        </Card>
        <Card>
          <Title>30-Day High</Title>
          <Text className="text-2xl font-bold">
            ${Math.max(...data.map(d => d.actual)).toFixed(2)}
          </Text>
        </Card>
        <Card>
          <Title>30-Day Low</Title>
          <Text className="text-2xl font-bold">
            ${Math.min(...data.map(d => d.actual)).toFixed(2)}
          </Text>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Title>Price Trend</Title>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <Chart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#4F46E5"
                  name="Actual Price"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#10B981"
                  name="Predicted Price"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </Chart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <Title>Price Area</Title>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#4F46E5"
                  fill="#4F46E5"
                  fillOpacity={0.1}
                  name="Actual Price"
                />
                <Area
                  type="monotone"
                  dataKey="predicted"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.1}
                  name="Predicted Price"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <Title>Daily Price Comparison</Title>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="actual" fill="#4F46E5" name="Actual Price" />
                <Bar dataKey="predicted" fill="#10B981" name="Predicted Price" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <Title>Price Distribution</Title>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stackId="1"
                  stroke="#4F46E5"
                  fill="#4F46E5"
                  name="Actual Price"
                />
                <Area
                  type="monotone"
                  dataKey="predicted"
                  stackId="1"
                  stroke="#10B981"
                  fill="#10B981"
                  name="Predicted Price"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}