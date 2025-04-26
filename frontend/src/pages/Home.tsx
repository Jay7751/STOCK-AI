import React from 'react';
import { Link } from 'react-router-dom';
import { LineChart, TrendingUp, Eye, Wallet } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center">
          <LineChart className="h-16 w-16 text-indigo-600 mx-auto" />
          <h1 className="mt-6 text-4xl font-bold text-gray-900 sm:text-5xl">
            Welcome to StockAI
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Predict stock prices with advanced AI technology
          </p>
          
          <div className="mt-8">
            <Link
              to="/register"
              className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <TrendingUp className="h-8 w-8 text-indigo-600" />
            <h3 className="mt-4 text-xl font-semibold">AI Predictions</h3>
            <p className="mt-2 text-gray-600">
              Get accurate stock price predictions powered by machine learning
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <Eye className="h-8 w-8 text-indigo-600" />
            <h3 className="mt-4 text-xl font-semibold">Watchlist</h3>
            <p className="mt-2 text-gray-600">
              Track your favorite stocks and get real-time updates
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <Wallet className="h-8 w-8 text-indigo-600" />
            <h3 className="mt-4 text-xl font-semibold">Portfolio Management</h3>
            <p className="mt-2 text-gray-600">
              Manage your stock portfolio and track performance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}