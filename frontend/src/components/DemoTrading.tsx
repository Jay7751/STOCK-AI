import React, { useEffect, useState } from 'react';
import { Container, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Box } from '@mui/material';

const DemoTrading: React.FC = () => {
  const [balance, setBalance] = useState<number>(1000000);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    setBalance(parseFloat(localStorage.getItem('balance') || '1000000'));
    setPortfolio(JSON.parse(localStorage.getItem('portfolio') || '[]'));
    setTransactions(JSON.parse(localStorage.getItem('transactions') || '[]'));
  }, []);

  // Helper to update all local state and localStorage after a trade
  const updateAll = (newBalance: number, newPortfolio: any[], newTransactions: any[]) => {
    setBalance(newBalance);
    setPortfolio(newPortfolio);
    setTransactions(newTransactions);
    localStorage.setItem('balance', newBalance.toString());
    localStorage.setItem('portfolio', JSON.stringify(newPortfolio));
    localStorage.setItem('transactions', JSON.stringify(newTransactions));
  };

  // Buy/Sell handler for portfolio table
  const handlePortfolioTrade = (ticker: string, type: 'BUY' | 'SELL') => {
    const qtyStr = window.prompt(`Enter quantity to ${type.toLowerCase()} for ${ticker}:`);
    if (!qtyStr) return;
    const quantity = parseInt(qtyStr, 10);
    if (isNaN(quantity) || quantity <= 0) {
      alert('Invalid quantity');
      return;
    }
    // Find current price from last transaction for this ticker
    const lastTx = [...transactions].reverse().find((tx) => tx.ticker === ticker);
    const price = lastTx ? lastTx.price : 0;
    if (!price) {
      alert('No price info available for this ticker. Please trade from the prediction widget first.');
      return;
    }
    let newBalance = balance;
    let newPortfolio = [...portfolio];
    let idx = newPortfolio.findIndex((item) => item.ticker === ticker);
    let currentQty = idx >= 0 ? newPortfolio[idx].quantity : 0;
    if (type === 'SELL') {
      if (quantity > currentQty) {
        alert(`You cannot sell more than you own! (You own ${currentQty})`);
        return;
      }
      newBalance += price * quantity;
      newPortfolio[idx].quantity -= quantity;
      if (newPortfolio[idx].quantity === 0) newPortfolio.splice(idx, 1);
    } else if (type === 'BUY') {
      const totalCost = price * quantity;
      if (totalCost > newBalance) {
        alert(`Insufficient balance! You have ₹${newBalance.toFixed(2)}, need ₹${totalCost.toFixed(2)}`);
        return;
      }
      newBalance -= totalCost;
      if (idx >= 0) {
        newPortfolio[idx].quantity += quantity;
      } else {
        newPortfolio.push({ ticker, quantity });
      }
    }
    const newTx = {
      ticker,
      type,
      quantity,
      price,
      timestamp: new Date().toISOString()
    };
    const newTransactions = [...transactions, newTx];
    updateAll(newBalance, newPortfolio, newTransactions);
    alert(`${type} order placed for ${quantity} shares of ${ticker}`);
  };

  // Calculate avg price and market price for each holding
  const getAvgPrice = (ticker: string) => {
    const buys = transactions.filter((tx) => tx.ticker === ticker && tx.type === 'BUY');
    const totalQty = buys.reduce((sum, tx) => sum + tx.quantity, 0);
    const totalCost = buys.reduce((sum, tx) => sum + tx.quantity * tx.price, 0);
    return totalQty > 0 ? totalCost / totalQty : 0;
  };
  const getMarketPrice = (ticker: string) => {
    const lastTx = [...transactions].reverse().find((tx) => tx.ticker === ticker);
    return lastTx ? lastTx.price : 0;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Paper sx={{ p: 4, textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Demo Trading
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Balance: <b>₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</b>
        </Typography>
      </Paper>

      {/* Responsive side-by-side layout for Portfolio and Transactions */}
      <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={4}>
        {/* Portfolio Table */}
        <Paper sx={{ p: 4, flex: 1, mb: { xs: 4, md: 0 } }}>
          <Typography variant="h6" gutterBottom>
            Portfolio
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ticker</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Avg Price</TableCell>
                  <TableCell align="right">Market Price</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {portfolio.length > 0 ? (
                  portfolio.map((item, idx) => (
                    <TableRow key={item.ticker + idx}>
                      <TableCell>{item.ticker}</TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">₹{getAvgPrice(item.ticker).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</TableCell>
                      <TableCell align="right">₹{getMarketPrice(item.ticker).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</TableCell>
                      <TableCell align="center">
                        <Box display="flex" gap={1} justifyContent="center">
                          <Button size="small" variant="contained" color="success" onClick={() => handlePortfolioTrade(item.ticker, 'BUY')}>Buy</Button>
                          <Button size="small" variant="contained" color="error" onClick={() => handlePortfolioTrade(item.ticker, 'SELL')}>Sell</Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary">No holdings in portfolio</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Transactions Table */}
        <Paper sx={{ p: 4, flex: 1 }}>
          <Typography variant="h6" gutterBottom>
            Transaction History
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date/Time</TableCell>
                  <TableCell>Ticker</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length > 0 ? (
                  [...transactions].reverse().map((tx, idx) => (
                    <TableRow key={tx.ticker + tx.timestamp + idx}>
                      <TableCell>{new Date(tx.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{tx.ticker}</TableCell>
                      <TableCell>{tx.type}</TableCell>
                      <TableCell align="right">{tx.quantity}</TableCell>
                      <TableCell align="right">₹{tx.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</TableCell>
                      <TableCell align="right">₹{(tx.price * tx.quantity).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary">No transactions yet</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Container>
  );
};

export default DemoTrading; 