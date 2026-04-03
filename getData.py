import pandas as pd
import numpy as np
import os

# Note as we develop the projects more, other data souurce connector will be incorporated so take this into account while cerating the UI

def load_data(url, source='excel', sheet_name='Detailed'):
    """
    Load data from various sources dynamically.
    
    Parameters:
    -----------
    url : str
        File path or API endpoint URL
    source : str
        Data source type: 'excel', 'csv', or 'api'
    sheet_name : str
        Sheet name for Excel files (default: 'Detailed')
    
    Returns:
    --------
    pd.DataFrame
        Loaded data
    """
    if source == 'excel':
        # Check if file exists
        if not os.path.exists(url):
            raise FileNotFoundError(f"Excel file not found: {url}")
        return pd.read_excel(url, sheet_name=sheet_name)
    
    elif source == 'csv':
        # Check if file exists
        if not os.path.exists(url):
            raise FileNotFoundError(f"CSV file not found: {url}")
        return pd.read_csv(url)
    
    elif source == 'api':
        import requests
        response = requests.get(url)
        if response.status_code != 200:
            raise Exception(f"API returned status code {response.status_code}")
        data = response.json()
        # Assume API returns JSON array or dict with 'data' key
        if isinstance(data, list):
            return pd.DataFrame(data)
        elif isinstance(data, dict) and 'data' in data:
            return pd.DataFrame(data['data'])
        else:
            return pd.DataFrame(data)
    
    else:
        raise ValueError(f"Unknown source type: {source}")


# UL Input: local data source connector 
DEFAULT_URL = "C:/Auditor Valuation Framework/exccute.py/Profitability results from FY 2024 to FY 2025.xlsx"
# -------

try:
    sourceData = load_data(DEFAULT_URL, source='excel')
except Exception as e:
    print(f"Warning: Could not load default data: {e}")
    sourceData = None