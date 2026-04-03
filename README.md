# Auditor Valuation Framework - Frontend

A standalone React frontend for the Auditor Valuation Framework, designed to visualize and analyze insurance profitability data.

## Project Structure

```
src/
├── App.jsx                           # Main application component
├── App.css                           # Styles for all components
├── components/
│   ├── DataSection.jsx              # Data input and preview section
│   ├── AnalysisSection.jsx          # Analysis controls and results
│   ├── Viewport.jsx                 # Reusable viewport with fullscreen toggle
│   ├── DataPreviewTable.jsx         # Data preview table component
│   └── analysisTypes/
│       ├── RatioAnalysisForm.jsx    # Ratio analysis form
│       └── RatioAnalysisResults.jsx # Ratio analysis results display
└── main.jsx                          # React entry point
```

## Features

### 1. Data Input & Preview
- **Data Source Selection**: Choose from Excel, CSV, or API endpoints
- **Load Data**: Fetch source data from your backend
- **Data Preview Viewport**: Display fetched data in a sortable table
- **Fullscreen Toggle**: Expand viewport to full screen for better visibility

### 2. Analysis Section
- **Left Panel (Controls)**: Dynamic form for analysis configuration
  - Category header selection
  - Data field mapping
  - Configuration parameters (e.g., expense ratios)
  
- **Right Panel (Results)**: Viewport for displaying analysis outputs
  - Tables with currency formatting
  - Percentage display for ratios
  - Total row highlighting
  - Fullscreen toggle for results

### 3. UI/UX Features
- **Dashboard-style Layout**: Clean, professional interface
- **Modular Components**: Easy to add new analysis types
- **Expand/Fullscreen Toggle**: Each viewport supports fullscreen mode
- **Loading States**: Spinners during data loading
- **Error Handling**: User-friendly error messages
- **Responsive Design**: Works on desktop and tablet screens

## Setup & Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Backend Integration

The frontend expects your Python backend to provide two API endpoints:

### 1. `/api/data` (POST)
Load source data from your backend.

**Request:**
```json
{
  "source": "excel" | "csv" | "api"
}
```

**Response:**
Array of objects with data rows.

### 2. `/api/analysis` (POST)
Run analysis on source data.

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
Array of objects with analysis results.

## Styling Architecture

All styles are contained in `App.css` with the following structure:

- **Global Styles**: App container, header, buttons
- **Data Section**: Input controls and preview
- **Viewport List**: Reusable container for viewports
- **Analysis Section**: Left/right panel layout
- **Table Styles**: Data table formatting
- **Loading & Error States**: Spinners, error messages
- **Responsive Design**: Mobile and tablet optimizations
- **Fullscreen Mode**: Fixed positioning and overlay

## Future Enhancement

The architecture supports adding new analysis types:

1. Create new form component: `src/components/analysisTypes/NewAnalysisForm.jsx`
2. Create new results component: `src/components/analysisTypes/NewAnalysisResults.jsx`
3. Add case in `AnalysisSection.jsx` to handle the new type
4. Update backend to support the new analysis type

## Configuration

### Vite Configuration
`vite.config.js` includes:
- React plugin support
- Proxy for backend API calls (localhost:5000)
- Development server on port 5173

### Environment Variables
Create `.env` or `.env.local` for environment-specific settings:
```
VITE_API_BASE_URL=http://localhost:5000
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
