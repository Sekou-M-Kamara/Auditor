# Data Loading Troubleshooting Guide

## Issue: Data Not Loading from Excel

### ✓ Quick Checklist

- [ ] Flask API is running on `http://localhost:5000`
- [ ] React frontend is running on `http://localhost:5173`
- [ ] Excel file exists at the path specified in `getData.py`
- [ ] Excel sheet name matches (`Detailed`)
- [ ] No error message displayed in the browser

---

## 🔍 Step 1: Check API Status

### Using Browser
1. Open `http://localhost:5000/api/debug` in your browser
2. Look for the response - it should show:
   ```json
   {
     "debug": {
       "sourceDataAvailable": true,
       "sourceDataRows": 1000,
       "sourceDataColumns": [...]
     }
   }
   ```

### Using Terminal/PowerShell
```powershell
# Check if API is responding
curl http://localhost:5000

# Check debug info
curl http://localhost:5000/api/debug

# Try loading data
curl -X POST http://localhost:5000/api/data `
  -H "Content-Type: application/json" `
  -d '{"source":"excel"}'
```

---

## 🔍 Step 2: Check Flask Console Output

When you start the API with `python api.py`, watch for:

### ✓ Success Output
```
=============================================================
🚀 Starting Auditor Valuation Framework API...
=============================================================

📋 Available Endpoints:
  • GET  /                      - Health check
  • GET  /api/debug              - Debug info & data status
  • GET  /api/data               - Get source data
  • POST /api/data               - Load source data
  • POST /api/analysis           - Run analysis
  • GET  /api/metadata           - Get metadata

📊 Backend Status:
  • Source data available: YES ✓
  • Data rows: 1234
  • Data columns: 15
```

### ✗ Error Output
If you see:
```
📊 Backend Status:
  • Source data available: NO ✗
```

This means the Excel file failed to load. Check:
1. File path in `getData.py`
2. File existence
3. File permissions
4. Excel format (must be .xlsx)

---

## 🔍 Step 3: Check Frontend Console

1. Open browser DevTools: **F12**
2. Click the **Console** tab
3. Click "Load Data" button
4. Watch for errors like:
   - "Cannot POST /api/data"
   - "CORS error"
   - Network timeout
   - JSON parse error

### Common Frontend Errors

#### CORS Error
```
Access to XMLHttpRequest at 'http://localhost:5000/api/data' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```
**Solution**: Ensure Flask-CORS is enabled in `api.py` (it should be)

#### Network Error
```
Failed to fetch
```
**Solution**: Ensure Flask API is running on port 5000

#### Timeout
```
The request timed out
```
**Solution**: Check if Excel file is very large or Flask is stuck

---

## 🔍 Step 4: Check Excel File

### Verify File Path in `getData.py`

```python
# In getData.py, check this line:
url = "C:/Auditor Valuation Framework/exccute.py/Profitability results from FY 2024 to FY 2025.xlsx"
```

**Issues to check:**
```
✓ File exists at this exact path
✓ File is not open in Excel (can cause read locks)
✓ File format is .xlsx (not .xls)
✓ File has sheet named "Detailed"
✓ User has read permissions for the file
```

### Test File Loading in Python

```python
import pandas as pd

url = "C:/Auditor Valuation Framework/exccute.py/Profitability results from FY 2024 to FY 2025.xlsx"

try:
    df = pd.read_excel(url, sheet_name="Detailed")
    print(f"✓ File loaded successfully!")
    print(f"  Rows: {len(df)}")
    print(f"  Columns: {len(df.columns)}")
    print(f"  Columns: {list(df.columns)}")
except Exception as e:
    print(f"✗ Error loading file: {e}")
```

Run this in a Python terminal from the `exccute.py` directory.

---

## 🔍 Step 5: Check Network Connection

### Verify React can reach API

In browser DevTools **Console**, run:
```javascript
// Test API connection
fetch('http://localhost:5000/api/debug')
  .then(r => r.json())
  .then(d => console.log('✓ API Response:', d))
  .catch(e => console.log('✗ API Error:', e))
```

---

## 📊 Real-Time Loading Indicator

When you click "Load Data", you should see:

### 1. **Loading Spinner** (while connected)
```
⏳ Connecting to server...
Elapsed: 150ms
```

### 2. **Processing State**
```
⏳ Processing data...
Elapsed: 2.5s
```

### 3. **Success State**
```
✓ Success!
Elapsed: 3.2s • Rows loaded: 1,234
```
⬇️ Data appears in the preview table

OR

### 3. **Error State**
```
✗ Failed!
Elapsed: 1.2s
Error message shown below
```

---

## 🛠️ Advanced Troubleshooting

### Check Python Import Errors

In the Flask console, look for import errors like:
```
Warning: Could not import backend modules: No such file or directory
```

**Solutions:**
1. Ensure you're running `api.py` from the `exccute.py` directory
2. Ensure `getData.py` and `ratiosTable.py` exist in the same directory
3. Check Python version compatibility

### Enable Verbose Logging

Edit `api.py` and increase logging:
```python
# In the get_data() function, add more print statements
print(f"Column details: {sourceData.dtypes}")
print(f"First few rows:\n{sourceData.head()}")
```

### Check File Size

If the Excel file is very large (>100MB), loading might be slow:
```python
import os

file_size_mb = os.path.getsize(url) / (1024 * 1024)
print(f"File size: {file_size_mb:.2f} MB")
```

Large files may take 10-30 seconds to load initially.

---

## 📞 Still Having Issues?

### Information to Gather

1. **API Debug Response** (`http://localhost:5000/api/debug`)
2. **Flask Console Output** (full startup and error messages)
3. **Browser Console** (F12 → Console tab)
4. **Network Tab** (F12 → Network tab → Click "Load Data")
5. **Excel File Details** (path, size, sheet names)

### Checklist for Each Component

| Component | Status | Notes |
|-----------|--------|-------|
| Flask API Running | ✓/✗ | http://localhost:5000 |
| React Frontend Running | ✓/✗ | http://localhost:5173 |
| Excel File Exists | ✓/✗ | Full path and permissions |
| Python Imports Work | ✓/✗ | Run api.py manually |
| CORS Enabled | ✓/✗ | Check Flask console |
| Data Preview Shows | ✓/✗ | Loading indicator visible |

---

## 🚀 Working Solution Summary

1. **Excel file at correct path** ✓
2. **getData.py loads Excel successfully** ✓
3. **api.py runs with "Source data available: YES"** ✓
4. **Flask API running on port 5000** ✓
5. **React frontend running on port 5173** ✓
6. **Data loading indicator shows and completes** ✓
7. **Data preview table populates** ✓

If all these are passing, your setup is working correctly!
