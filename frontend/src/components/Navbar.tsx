import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LineChart, LogOut, User, List, DollarSign } from 'lucide-react';
import { logout } from '../utils/auth';

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <LineChart className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-800">StockAI</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="text-gray-700 hover:text-indigo-600">Dashboard</Link>
            <Link to="/watchlist" className="text-gray-700 hover:text-indigo-600 flex items-center">
              <List className="h-5 w-5 mr-1" />
              <span>Watchlist</span>
            </Link>
            <Link to="/demo-trading" className="text-gray-700 hover:text-indigo-600 flex items-center">
              <DollarSign className="h-5 w-5 mr-1" />
              <span>Demo Trading</span>
            </Link>
            <Link to="/profile" className="text-gray-700 hover:text-indigo-600">
              <User className="h-5 w-5" />
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-700 hover:text-indigo-600"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}