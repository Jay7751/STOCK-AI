# 📈 StockAI  
Predict stock prices with advanced AI-driven technology. 

---

## 📝 Overview  
**StockAI** is a cutting-edge stock market prediction and portfolio management platform.  
It leverages **Machine Learning** models to forecast stock prices for the next 7 days,  
providing traders and investors with data-driven insights to make informed decisions.  

**Core capabilities include:**
- AI-powered stock predictions   
- Personalized watchlist 
- Portfolio management 
- Real-time market data  
- Market news feed  

---

## 🚀 Features  

### **1. AI Predictions**  
- Accurate **7-day stock price forecasts**.  
- Displays predicted price, percentage change, and **model confidence score**.  
- Interactive **line charts** for visualizing predicted trends.

### **2. Watchlist**  
- Add, track, and monitor your **favorite stocks**.  
- Get **real-time updates** on price movements.

### **3. Portfolio Management**  
- Monitor **investment performance**.  
- Real-time **profit/loss calculations**.

### **4. Market Dashboard**  
- Key **market indices** (NIFTY 50, BSE SENSEX, NIFTY BANK, etc.).  
- Trending stocks by **volume & change**.  
- Latest **market news updates**.

---

## 🛠 Tech Stack  

**Frontend:**  
- [React (TypeScript)](https://react.dev/) – Component-based UI.  
- [Tailwind CSS](https://tailwindcss.com/) – Modern responsive styling.  
- [Recharts](https://recharts.org/) – Data visualization.

**Backend:**  
- [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) – API handling.  
- Machine Learning Model – Python-based or via integrated API.

**Database:**  
- [MongoDB](https://www.mongodb.com/) – For watchlist, portfolio, and user data storage.

---

## 📦 Installation & Setup  

```bash
# 1️⃣ Clone the repository
git clone https://github.com/Jay7751/STOCK-AI.git
cd STOCK-AI

# 2️⃣ Install frontend dependencies
cd client
npm install

# 3️⃣ Install backend dependencies
cd ../server
npm install

# 4️⃣ Create a .env file inside the backend folder and configure environment variables
# Example .env file:
# PORT=5173
# MONGO_URI=your_mongodb_connection_string
# API_KEY=your_market_data_api_key

# 5️⃣ Start the backend server
npm run dev

# 6️⃣ Start the frontend server in a separate terminal
cd ../client
npm run dev
```
---
## Usage Guide
1) Home Page – Quick access to AI Predictions, Watchlist, and Portfolio.

2) Dashboard – View market indices, trending stocks, and news.

3) Prediction Page – Enter a stock symbol to get a 7-day forecast.

## Screenshots
**Dashboard**
---
<img width="665" height="394" alt="11" src="https://github.com/user-attachments/assets/cc637b5c-328c-4d41-8d45-e87c18952f8a" />

**MarketIndices**
---
<img width="652" height="416" alt="22" src="https://github.com/user-attachments/assets/3441c3f4-7730-4531-976d-631d8905e31c" />

**Reliance Prediction**
---
<img width="642" height="435" alt="44" src="https://github.com/user-attachments/assets/835b7da3-7bbd-42af-b278-f2c2152875a6" />

**KotakBank Prediction**
---
<img width="658" height="436" alt="66" src="https://github.com/user-attachments/assets/d9cc0bba-9173-4973-833a-33258976ab10" />


## Future Improvements
1) Live trading API integration.

2) Sentiment analysis from news & social media.

3) Advanced portfolio analytics & insights.
