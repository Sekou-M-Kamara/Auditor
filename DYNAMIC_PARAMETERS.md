# Dynamic Parameters Refactoring

## 🔑 Key Changes Made

### Issue Identified
You were right - the original code had **hardcoded parameters** in `ratiosTable.py` that didn't respond to form inputs:

```python
# ❌ BEFORE (Hardcoded)
categoryHeader = "Reporting Unit1 Leaf Name"
codeHeader = "Entry Code"
dataFieldHeader = "Retained Amt Base"
grossDataFieldHeader = "Detail Amount (Base)"
netManagementExpesneRatio = 0.12

# Then immediately executed
ratioAnalysis()
resultTable = pd.DataFrame(resultTableDictionary).reset_index(drop=True)
```

This meant:
1. Parameters were fixed at import time
2. API was importing a pre-computed `resultTable` on startup
3. Form inputs from the UI were **completely ignored**
4. No way to run multiple analyses with different parameters

---

## ✅ Solution Implemented

### 1. Refactored `ratiosTable.py`
Changed from **direct execution** to a **reusable function**:

```python
def ratio_analysis(
    data,
    category_header="Reporting Unit1 Leaf Name",
    code_header="Entry Code",
    data_field_header="Retained Amt Base",
    gross_data_field_header="Detail Amount (Base)",
    net_management_expense_ratio=0.12
):
    """
    Perform ratio analysis with dynamic parameters.
    Parameters come from UI form, not hardcoded values.
    """
    # ... analysis logic ...
    return result_table
```

**Benefits:**
- ✓ Accepts parameters as function arguments
- ✓ Default values for backward compatibility
- ✓ Can be called multiple times with different parameters
- ✓ No side effects from imports

### 2. Updated `api.py` Imports
**Before:**
```python
from ratiosTable import resultTable, resultTableDictionary
```

**After:**
```python
from ratiosTable import ratio_analysis
```

✓ No more pre-computed static table at startup
✓ Function imported once, called dynamically on each request

### 3. Modified `/api/analysis` Endpoint
**Before:**
```python
if analysis_type == 'ratio':
    # Return pre-computed, static result
    results_json = dataframe_to_json(resultTable)
```

**After:**
```python
if analysis_type == 'ratio':
    # Extract parameters from form
    category_header = params.get('categoryHeader', 'Reporting Unit1 Leaf Name')
    code_header = params.get('codeHeader', 'Entry Code')
    # ... other params ...
    
    # Call function with form parameters
    result_table = ratio_analysis(
        sourceData,
        category_header=category_header,
        code_header=code_header,
        # ... pass all params ...
    )
    
    # Return dynamic result
    results_json = dataframe_to_json(result_table)
```

✓ Form parameters are now **actually used**
✓ Each call produces fresh results based on inputs
✓ Multiple analyses can use different parameters

---

## 📊 Data Flow BEFORE vs AFTER

### ❌ BEFORE (Static)
```
Startup (api.py)
  ↓
Import ratiosTable.py
  ↓
Execute hardcoded analysis
  ↓
resultTable loaded to memory
  ↓
  
User fills form
  ↓
UIsends /api/analysis request
  ↓
API returns same static resultTable
  ↓
Form parameters IGNORED
```

### ✅ AFTER (Dynamic)
```
Startup (api.py)
  ↓
Import ratio_analysis function only
  ↓
No analysis executed yet
  ↓
  
User fills form → selects parameters
  ↓
UI sends /api/analysis request with params
  ↓
API receives request
  ↓
Extract form parameters
  ↓
Call ratio_analysis(sourceData, **form_params)
  ↓
Function computes fresh results
  ↓
Return dynamic result based on form
  ↓
User sees results matching their parameters
```

---

## 🔧 How Form Parameters Flow Now

### 1. Frontend Form (`RatioAnalysisForm.jsx`)
```javascript
const formData = {
    categoryHeader: "Reporting Unit1 Leaf Name",
    codeHeader: "Entry Code",
    dataFieldHeader: "Retained Amt Base",
    grossDataFieldHeader: "Detail Amount (Base)",
    netManagementExpenseRatio: 0.15  // ← User can change this!
}

// Send to API with parameters
fetch('/api/analysis', {
    body: JSON.stringify({
        analysisType: 'ratio',
        params: formData  // ← Form values included
    })
})
```

### 2. Backend API (`api.py`)
```python
@app.route('/api/analysis', methods=['POST'])
def run_analysis():
    params = request.get_json().get('params', {})
    
    # Extract form parameters
    category_header = params.get('categoryHeader', 'Reporting Unit1 Leaf Name')
    code_header = params.get('codeHeader', 'Entry Code')
    # ... other params extracted ...
    
    # Pass to function
    result_table = ratio_analysis(
        sourceData,
        category_header=category_header,
        code_header=code_header,
        # ... pass all form params ...
    )
    
    return jsonify({'status': 'success', 'data': result_table})
```

### 3. Backend Analysis (`ratiosTable.py`)
```python
def ratio_analysis(data, category_header, code_header, ...):
    # Uses the parameters passed from form
    filter_items = pd.unique(data[category_header].dropna())
    # ... analysis uses form parameters ...
    return result_table
```

---

## 🎯 What This Enables

### 1. Dynamic Form Configuration
Users can now:
- Select different **category headers** (which column to group by)
- Select different **data fields** (which columns contain the amounts)
- Adjust **expense ratios** (12% vs 15% vs 20%)
- Get fresh results for **each combination**

### 2. Multiple Analyses
Run analysis multiple times with different parameters without restarting:
```
Analysis 1: Category=Unit, Expense Ratio=12%
Analysis 2: Category=Division, Expense Ratio=15%
Analysis 3: Category=Unit, Expense Ratio=18%
```

Each produces different results based on parameters.

### 3. Extensibility
Easy to add new analysis types:
```python
def other_analysis(data, **params):
    # Different analysis logic
    return result_table

# In API:
if analysis_type == 'other':
    result = other_analysis(sourceData, **params)
```

---

## 🧪 Testing the Changes

### Before (Static):
```bash
# First request with params
curl -X POST http://localhost:5000/api/analysis \
  -d '{"analysisType":"ratio","params":{"netManagementExpenseRatio":0.15}}'
# Returns Result A

# Second request with different params  
curl -X POST http://localhost:5000/api/analysis \
  -d '{"analysisType":"ratio","params":{"netManagementExpenseRatio":0.20}}'
# Returns SAME Result A (params ignored)  ❌
```

### After (Dynamic):
```bash
# First request with params
curl -X POST http://localhost:5000/api/analysis \
  -d '{"analysisType":"ratio","params":{"netManagementExpenseRatio":0.15}}'
# Returns Result A with 15% expense ratio ✓

# Second request with different params
curl -X POST http://localhost:5000/api/analysis \
  -d '{"analysisType":"ratio","params":{"netManagementExpenseRatio":0.20}}'
# Returns Result B with 20% expense ratio ✓
```

---

## 📝 Files Modified

| File | Changes |
|------|---------|
| `ratiosTable.py` | Converted to `ratio_analysis()` function accepting parameters |
| `api.py` | Import function instead of static table; call dynamically with params |
| `RatioAnalysisForm.jsx` | Already sends parameters (no changes needed) |
| `RatioAnalysisResults.jsx` | Already displays results (no changes needed) |

---

## 🚀 How to Test

### 1. Start the API
```bash
python api.py
```

Watch the logs - should NOT pre-compute results at startup.

### 2. Open Dashboard
```
http://localhost:5173
```

### 3. Load Data
Click "Load Data" button → data appears

### 4. Run First Analysis
Adjust form parameters:
- Net Management Expense Ratio: **0.12**
Click "Run Analysis" → Results computed with 12%

### 5. Change Parameters & Rerun
Adjust form parameters:
- Net Management Expense Ratio: **0.18**
Click "Run Analysis" again → Results **change** (different combined ratios!)

✓ If results changed, the dynamic parameters are working!

---

## 💡 Backend Enhanced Logging

The API now logs each analysis request:

```
============================================================
INCOMING REQUEST: /api/analysis
============================================================
✓ Analysis type: ratio
✓ Parameters received:
    - categoryHeader: Reporting Unit1 Leaf Name
    - netManagementExpenseRatio: 0.15
    
✓ Running ratio analysis...
✓ Analysis completed!
  Result rows: 11
  Result columns: 11
============================================================
```

This shows exactly what parameters were used for each analysis.

---

## 🔄 Future Enhancements

The refactored architecture now supports:

1. **New Analysis Types**
   ```python
   def breakdown_analysis(data, **params):
       # Different logic
       return result
   
   # Add to API:
   elif analysis_type == 'breakdown':
       result = breakdown_analysis(sourceData, **params)
   ```

2. **Save/Compare Multiple Analyses**
   Store results from different parameter combinations
   Compare side-by-side

3. **Parameter Validation**
   Validate form inputs before sending to backend
   Show warnings for unusual parameter combinations

4. **Batch Processing**
   Send multiple parameter sets in one request
   Get results for all combinations

---

## ✅ Verification Checklist

- [x] `ratio_analysis()` function created
- [x] Parameters accepted as function arguments
- [x] Default values provided for backward compatibility
- [x] `api.py` imports function instead of static table
- [x] `/api/analysis` endpoint calls function with form params
- [x] No static `resultTable` created at startup
- [x] Multiple analyses with different params produces different results
- [x] Frontend form still sends parameters (unchanged)
- [x] Enhanced logging shows which parameters are used

---

## 📚 Architecture Summary

```
UI Form
  ↓ (with selected parameters)
React Component
  ↓ (sends /api/analysis with params)
Flask API (/api/analysis)
  ↓ (extracts parameters from request)
ratio_analysis() Function
  ↓ (uses parameters to compute results)
Dynamic DataFrame
  ↓ (formatted and converted to JSON)
API Response
  ↓ (sent back to frontend)
React Component
  ↓ (displays results)
User sees results matching their parameters!
```

This is a complete, dynamic analysis pipeline! 🎉
