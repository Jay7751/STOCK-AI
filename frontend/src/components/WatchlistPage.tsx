import React, { useState, useEffect, useCallback } from 'react';
import { stockApi } from '../services/api';
import { Stock } from '../types';

const WatchlistPage: React.FC = () => {
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [lastSearchTime, setLastSearchTime] = useState(0);
  const [allNiftyStocks, setAllNiftyStocks] = useState<Stock[]>([]);
  const [showAllNifty, setShowAllNifty] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // Load watchlist with auto-refresh
  const loadWatchlist = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Loading watchlist...');
      const data = await stockApi.getWatchlist();
      console.log('Watchlist loaded:', data);
      setWatchlist(data);
      setLastUpdateTime(new Date());
    } catch (err: any) {
      console.error('Failed to load watchlist:', err);
      setError(err.response?.data?.message || 'Failed to load watchlist. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load all Nifty 50 stocks
  const loadNiftyStocks = useCallback(async () => {
    try {
      const data = await stockApi.getNifty50Stocks();
      setAllNiftyStocks(data);
      setLastUpdateTime(new Date());
    } catch (err: any) {
      console.error('Failed to load Nifty 50 stocks:', err);
    }
  }, []);

  // Initial load and refresh every 15 seconds for more frequent updates
  useEffect(() => {
    loadWatchlist();
    loadNiftyStocks();
    const watchlistInterval = setInterval(loadWatchlist, 15000);
    const niftyInterval = setInterval(loadNiftyStocks, 15000);
    return () => {
      clearInterval(watchlistInterval);
      clearInterval(niftyInterval);
    };
  }, [loadWatchlist, loadNiftyStocks]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchError('');
      return;
    }

    // Rate limiting check
    const now = Date.now();
    if (now - lastSearchTime < 1000) {
      return;
    }

    try {
      setSearchLoading(true);
      setSearchError('');
      setLastSearchTime(now);
      console.log('Searching for:', query);
      
      const results = await stockApi.searchStocks(query);
      console.log('Search results:', results);
      
      if (results.length === 0) {
        setSearchError(`No results found for "${query}". Try another symbol.`);
        setSearchResults([]);
      } else {
        setSearchResults(results);
        setSearchError('');
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setSearchError(
        err.response?.status === 429
          ? 'Too many requests. Please wait a moment before trying again.'
          : 'Failed to search stocks. Please try again.'
      );
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addToWatchlist = async (ticker: string) => {
    try {
      setError('');
      console.log('Adding to watchlist:', ticker);
      await stockApi.addToWatchlist(ticker);
      await loadWatchlist();
      // Don't clear search results to maintain context
      setSearchError('');
    } catch (err: any) {
      console.error('Failed to add to watchlist:', err);
      setError(
        err.response?.status === 429
          ? 'Too many requests. Please wait a moment before trying again.'
          : err.response?.data?.message || 'Failed to add stock to watchlist. Please try again.'
      );
    }
  };

  const removeFromWatchlist = async (ticker: string) => {
    try {
      setError('');
      console.log('Removing from watchlist:', ticker);
      await stockApi.removeFromWatchlist(ticker);
      await loadWatchlist();
    } catch (err: any) {
      console.error('Failed to remove from watchlist:', err);
      setError(
        err.response?.status === 429
          ? 'Too many requests. Please wait a moment before trying again.'
          : err.response?.data?.message || 'Failed to remove stock from watchlist. Please try again.'
      );
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 10000000) {
      return `${(volume / 10000000).toFixed(2)} Cr`;
    } else if (volume >= 100000) {
      return `${(volume / 100000).toFixed(2)} L`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(2)} K`;
    }
    return volume.toString();
  };

  const renderStockList = (stocks: Stock[], isWatchlist: boolean = false) => (
    <div className="grid gap-4">
      {stocks.map((stock) => (
        <div
          key={stock.ticker}
          className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-bold text-lg">{stock.ticker}</h3>
              <p className="text-gray-600 text-sm">{stock.name}</p>
            </div>
            <button
              onClick={() => isWatchlist ? removeFromWatchlist(stock.ticker) : addToWatchlist(stock.ticker)}
              className={`${
                isWatchlist 
                  ? 'text-red-500 hover:text-red-600 hover:bg-red-50' 
                  : 'text-blue-500 hover:text-blue-600 hover:bg-blue-50'
              } transition-colors focus:outline-none p-2 rounded`}
            >
              {isWatchlist ? 'Remove' : 'Add to Watchlist'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-sm text-gray-600">Price</div>
              <div className="font-semibold">{formatPrice(stock.current_price)}</div>
            </div>
            
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-sm text-gray-600">Change</div>
              <div className={`font-semibold ${stock.change_percent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stock.change_percent >= 0 ? '▲' : '▼'} {formatPrice(stock.change)} ({Math.abs(stock.change_percent).toFixed(2)}%)
              </div>
            </div>
            
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-sm text-gray-600">Volume</div>
              <div className="font-semibold">{formatVolume(stock.volume)}</div>
            </div>
            
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-sm text-gray-600">Last Updated</div>
              <div className="font-semibold text-sm">
                {lastUpdateTime.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Watchlist</h1>
        <div className="text-sm text-gray-600">
          Last updated: {lastUpdateTime.toLocaleTimeString()}
        </div>
      </div>
      
      {/* Search Section */}
      <div className="mb-8">
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
            placeholder="Search Nifty 50 stocks..."
            className="flex-1 p-2 border rounded focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={() => setShowAllNifty(!showAllNifty)}
            className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
          >
            {showAllNifty ? 'Hide All' : 'Show All Nifty 50'}
          </button>
        </div>
        
        {/* Search Status */}
        {searchLoading && (
          <div className="mt-2 text-gray-600">
            <span className="inline-block animate-spin mr-2">⟳</span>
            Searching...
          </div>
        )}
        
        {searchError && (
          <div className="mt-2 text-red-500">{searchError}</div>
        )}
        
        {/* Search Results or All Nifty Stocks */}
        {(searchQuery || showAllNifty) && (
          <div className="mt-4">
            <h2 className="text-xl font-semibold mb-4">
              {searchQuery ? 'Search Results' : 'All Nifty 50 Stocks'}
            </h2>
            {renderStockList(searchQuery ? searchResults : allNiftyStocks)}
          </div>
        )}
      </div>

      {/* Watchlist */}
      {error && (
        <div className="text-red-500 mb-4 p-3 bg-red-50 rounded-md border border-red-200">
          {error}
        </div>
      )}
      
      <h2 className="text-xl font-semibold mb-4">My Watchlist</h2>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin text-2xl mb-2">⟳</div>
          <div>Loading your watchlist...</div>
        </div>
      ) : (
        <>
          {renderStockList(watchlist, true)}
          {watchlist.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">Your watchlist is empty</p>
              <p className="text-sm">Use the search bar above to find and add Nifty 50 stocks</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WatchlistPage; 