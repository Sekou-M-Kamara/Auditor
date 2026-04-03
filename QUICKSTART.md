# Quick Start Guide

## 🚀 Get Everything Running in 5 Minutes

### Prerequisites
- Python 3.8+ installed
- Node.js 16+ installed
- Excel file at: `C:/Auditor Valuation Framework/exccute.py/Profitability results from FY 2024 to FY 2025.xlsx`

---

## ⚙️ Setup (One-Time)

### 1. Install Python Dependencies
```bash
cd "C:\Auditor Valuation Framework\exccute.py"
pip install -r requirements.txt
```

### 2. Install Node Dependencies
```bash
npm install
```

---

## ▶️ Running the Application

### Terminal 1 - Start Flask API
```bash
cd "C:\Auditor Valuation Framework\exccute.py"
python api.py
```

**Expected output:**
```
Starting Auditor Valuation Framework API...
 * Serving Flask app 'api'
 * Debug mode: on
 * Running on http://localhost:5000
```

**Available endpoints:**
- `GET  /` - Health check
- `GET  /api/data` - Load data  
- `POST /api/analysis` - Run analysis
- `GET  /api/metadata` - Get metadata

---

### Terminal 2 - Start React Frontend
```bash
cd "C:\Auditor Valuation Framework\exccute.py"
npm run dev
```

**Expected output:**
```
  VITE v5.0.0  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

---

## 🌐 Access the Dashboard

Open your browser:
```
http://localhost:5173
```

---

## 📊 Using the Dashboard

### Step 1: Load Data
1. Select **Data Source** dropdown (default: "Excel File")
2. Click **"Load Data"** button
3. Wait for data to appear in the preview table

### Step 2: Run Analysis
1. In the **Analysis** section (bottom left):
   - Select analysis type: **"Ratio Analysis"**
   - Adjust parameters if needed (defaults are pre-populated)
2. Click **"Run Analysis"**
3. Results appear in the **Results** viewport

### Step 3: Explore Results
- **Fullscreen Toggle**: Click the expand icon (⛶) in any viewport
- **Data Preview**: Scroll tables horizontally/vertically
- **Load More**: Click "Load More" to see additional rows

---

## 🔍 API Response Examples

### /api/data Response
```json
{
  "status": "success",
  "data": [
    {
      "Reporting Unit1 Leaf Name": "Unit A",
      "Entry Code": 100,
      "Retained Amt Base": 50000,
      ...
    }
  ],
  "metadata": {
    "rows": 1000,
    "columns": ["Reporting Unit1 Leaf Name", "Entry Code", ...],
    "source": "excel"
  }
}
```

### /api/analysis Response
```json
{
  "status": "success",
  "data": [
    {
      "Reporting Unit1 Leaf Name": "Unit A",
      "Net Premium": "50,000.00",
      "Loss Ratio": "25.00%",
      "Combined Ratio": "50.33%",
      ...
    },
    {
      "Reporting Unit1 Leaf Name": "Total",
      "Net Premium": "500,000.00",
      ...
    }
  ],
  "metadata": {
    "analysisType": "ratio",
    "rows": 11,
    "columns": ["Reporting Unit1 Leaf Name", "Net Premium", ...]
  }
}
```

---

## 📁 Project Structure

```
exccute.py/
├── api.py                           # Flask API server
├── requirements.txt                 # Python dependencies
├── package.json                     # Node dependencies
├── run_api.bat                     # Windows: Start API
├── run_api.sh                      # macOS/Linux: Start API
├── vite.config.js                  # Frontend build config
├── index.html                      # Entry HTML
│
├── getData.py                       # Backend: Load Excel data
├── ratiosTable.py                  # Backend: Calculate ratios
│
├── src/
│   ├── main.jsx                    # React entry point
│   ├── App.jsx                     # Main app component
│   ├── App.css                     # All styles
│   └── components/
│       ├── DataSection.jsx         # Top section
│       ├── AnalysisSection.jsx     # Bottom section
│       ├── Viewport.jsx            # Reusable viewport
│       ├── DataPreviewTable.jsx    # Data table
│       └── analysisTypes/
│           ├── RatioAnalysisForm.jsx
│           └── RatioAnalysisResults.jsx
│
├── README.md                        # Frontend docs
└── API_INTEGRATION.md              # API docs
```

---

## ⚡ Development Tips

### Automatic Reload
- **Frontend**: Changes to React components reload instantly (Vite HMR)
- **Backend**: Changes to `api.py` auto-restart (Flask debug mode)
- **Python modules** (`getData.py`, `ratiosTable.py`): Restart `python api.py` after changes

### Debug Mode
- **Frontend**: Open DevTools (F12) to see:
  - Console errors
  - Network requests to `/api/`
  - React component hierarchy (if React DevTools installed)

- **Backend**: Flask debug output shows:
  - Request logs
  - Python errors & stack traces
  - Request/response payloads

### Testing Endpoints
Use **curl** or **Postman**:

```bash
# Load data
curl http://localhost:5000/api/data

# Run analysis
curl -X POST http://localhost:5000/api/analysis \
  -H "Content-Type: application/json" \
  -d '{
    "analysisType": "ratio",
    "params": {
      "categoryHeader": "Reporting Unit1 Leaf Name",
      "netManagementExpenseRatio": 0.12
    }
  }'

# Get metadata
curl http://localhost:5000/api/metadata
```

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot POST /api/analysis" | Ensure Flask is running on port 5000 |
| "Module not found" errors | Run from `exccute.py` directory |
| Data not loading in preview | Check Excel file path in `getData.py` |
| CORS errors in browser | Check browser console; restart both servers |
| Slow analysis response | Large datasets may take time; check Flask logs |

---

## 📝 Next Steps

1. ✅ Load data successfully
2. ✅ Run analysis and view results
3. 🔄 Modify analysis parameters and experiment
4. 📈 Add new analysis types (see `API_INTEGRATION.md`)
5. 🎨 Customize styling in `src/App.css`

---

## 📚 Documentation

- [API_INTEGRATION.md](API_INTEGRATION.md) - Complete API reference
- [README.md](README.md) - Frontend architecture & features
- [api.py](api.py) - Backend API source code with comments

---

## 💡 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API_INTEGRATION.md for endpoint details
3. Check browser DevTools (F12) for frontend errors
4. Check Flask console output for backend errors
