# API Integration Guide

## Setup & Installation

### Step 1: Install Python Dependencies

```bash
cd c:\Auditor Valuation Framework\exccute.py
pip install -r requirements.txt
```

### Step 2: Start the Flask API

**On Windows:**
```bash
run_api.bat
```

**On macOS/Linux:**
```bash
bash run_api.sh
```

Or directly:
```bash
python api.py
```

The API will start on `http://localhost:5000`

### Step 3: Install Frontend Dependencies

```bash
npm install
```

### Step 4: Start the React Development Server

```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

---

## API Endpoints

### 1. Health Check
**GET** `/`

Returns service status.

```json
{
  "status": "ok",
  "service": "Auditor Valuation Framework API",
  "version": "1.0.0"
}
```

---

### 2. Load Data
**GET/POST** `/api/data`

Fetch source data from the backend.

**Request (POST):**
```json
{
  "source": "excel"
}
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "Reporting Unit1 Leaf Name": "Unit A",
      "Entry Code": 100,
      "Retained Amt Base": 50000,
      "Detail Amount (Base)": 55000,
      ...
    }
  ],
  "metadata": {
    "rows": 1000,
    "columns": [
      "Reporting Unit1 Leaf Name",
      "Entry Code",
      ...
    ],
    "source": "excel"
  }
}
```

---

### 3. Run Analysis
**POST** `/api/analysis`

Execute ratio analysis on source data.

**Request:**
```json
{
  "analysisType": "ratio",
  "params": {
    "categoryHeader": "Reporting Unit1 Leaf Name",
    "codeHeader": "Entry Code",
    "dataFieldHeader": "Retained Amt Base",
    "grossDataFieldHeader": "Detail Amount (Base)",
    "netManagementExpenseRatio": 0.12
  },
  "sourceData": [...]
}
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "Reporting Unit1 Leaf Name": "Unit A",
      "Net Premium": "50,000.00",
      "Net Incurred Claim": "(12,500.00)",
      "Net Commission": "(2,500.00)",
      "Net Technical Margin": "35,000.00",
      "Loss Ratio": "25.00%",
      "Commission Ratio": "5.00%",
      "Net Management Expense Ratio": "12.00%",
      "Net Technical Margin Ratio": "70.00%",
      "Net Retro Expense Ratio": "8.33%",
      "Combined Ratio": "50.33%"
    }
  ],
  "metadata": {
    "analysisType": "ratio",
    "rows": 11,
    "columns": [...],
    "params": {...}
  }
}
```

---

### 4. Get Metadata
**GET** `/api/metadata`

Retrieve available data headers and analysis types.

**Response:**
```json
{
  "status": "success",
  "dataHeaders": [
    "Reporting Unit1 Leaf Name",
    "Entry Code",
    "Retained Amt Base",
    ...
  ],
  "analysisTypes": [
    {
      "type": "ratio",
      "name": "Ratio Analysis",
      "description": "Analyze profitability ratios by reporting unit",
      "params": {
        "categoryHeader": {
          "type": "string",
          "description": "Column to group by",
          "default": "Reporting Unit1 Leaf Name"
        },
        ...
      }
    }
  ]
}
```

---

## Error Responses

All endpoints return error responses in this format:

```json
{
  "status": "error",
  "message": "Detailed error message",
  "data": null
}
```

HTTP Status Codes:
- `200`: Success
- `400`: Bad request
- `404`: Endpoint not found
- `500`: Server error

---

## Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                           │
│           (http://localhost:5173)                          │
│  ┌─────────────────┐              ┌──────────────────┐    │
│  │ DataSection     │              │ AnalysisSection  │    │
│  │ - Load Data     │              │ - Run Analysis   │    │
│  │ - Preview       │              │ - Display Results│    │
│  └────────┬────────┘              └────────┬─────────┘    │
└───────────┼──────────────────────────────────┼──────────────┘
            │                                  │
            │ HTTP Requests                    │
            │ CORS Enabled                     │
            │                                  │
┌───────────▼──────────────────────────────────▼──────────────┐
│                   Flask API                                 │
│           (http://localhost:5000)                          │
│  ┌──────────────────┐          ┌──────────────────────┐   │
│  │ /api/data        │          │ /api/analysis        │   │
│  │ - Return rows    │          │ - Run ratio analysis │   │
│  │ - Format as JSON │          │ - Format results     │   │
│  └────────┬─────────┘          └─────────┬────────────┘   │
└───────────┼───────────────────────────────┼────────────────┘
            │                               │
            │ Import & Execute              │
            │                               │
┌───────────▼───────────────────────────────▼────────────────┐
│              Python Backend                                │
│  ┌──────────────────┐          ┌──────────────────────┐   │
│  │ getData.py       │          │ ratiosTable.py       │   │
│  │ - Load Excel     │          │ - Calculate ratios   │   │
│  │ - Return DF      │          │ - Return DataFrame   │   │
│  └──────────────────┘          └──────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## Development Workflow

1. **Start API** (Terminal 1):
   ```bash
   cd exccute.py
   python api.py
   ```

2. **Start Frontend** (Terminal 2):
   ```bash
   cd exccute.py
   npm run dev
   ```

3. **Open Browser**:
   ```
   http://localhost:5173
   ```

4. **Develop**: Make changes to React components or Python backend; changes reload automatically

---

## Troubleshooting

### "Cannot POST /api/analysis"
- Ensure Flask API is running on port 5000
- Check CORS is enabled in `api.py`
- Verify request body format matches endpoint documentation

### "Module not found" (getData, ratiosTable)
- Ensure you're running `api.py` from the `exccute.py` directory
- Check that `getData.py` and `ratiosTable.py` are in the same directory

### CORS Errors
- Flask-CORS is already enabled in `api.py`
- Check browser console for exact error
- Restart both servers

### Data not loading
- Verify Excel file path exists in `getData.py`
- Check file permissions
- Ensure Excel sheet name matches ("Detailed")

---

## Future Enhancements

- [ ] Connection pooling for Excel files
- [ ] Caching layer for frequently accessed data
- [ ] Support for multiple analysis types
- [ ] Authentication & user management
- [ ] Database integration (vs. in-memory)
- [ ] Async processing for large datasets
- [ ] WebSocket support for real-time updates
