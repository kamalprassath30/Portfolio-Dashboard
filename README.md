# 📊 Portfolio Dashboard

A dynamic portfolio dashboard built using Next.js, TypeScript, and Tailwind CSS that tracks stock investments with live market data.

## 🚀 Features

- 📈 Live stock price fetching using Yahoo Finance API
- ⚡ Optimized API calls with caching (NodeCache)
- 📊 Portfolio summary:
  - Total Investment
  - Current Value
  - Gain / Loss
- 🧮 Automatic calculations:
  - Portfolio %
  - Sector-wise grouping
  - Gain/Loss per sector
- 📉 Interactive charts:
  - Pie chart (allocation)
  - Bar/Line chart (distribution/trends)
- 🔄 Auto-refresh every 15 seconds
- 📱 Fully responsive dashboard UI

---

## 🛠️ Tech Stack

- **Frontend:** Next.js (React), TypeScript
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Backend:** Next.js API Routes
- **Caching:** NodeCache
- **APIs:** Yahoo Finance (unofficial endpoint)

---

## ⚙️ Architecture

1. Frontend requests portfolio data from `/api/portfolio`
2. Backend:
   - Parses holdings
   - Fetches stock prices from Yahoo Finance
   - Uses caching to reduce API calls
3. Data is processed:
   - Investment
   - Present value
   - Gain/Loss
   - Sector grouping
4. UI renders charts and tables dynamically

---

## 🔁 Caching Strategy

- Implemented using `node-cache`
- Cache TTL: 20 seconds
- Reduces repeated API calls
- Improves performance and response time

---

## 📦 Setup Instructions

```bash
git clone <your-repo-link>
cd portfolio-dashboard
npm install
npm run dev
