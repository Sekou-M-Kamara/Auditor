#!/usr/bin/env python
"""
Diagnostic script to test the Auditor Valuation Framework setup
Run this to identify any issues with data loading or backend configuration
"""

import sys
import os
import traceback

def print_header(title):
    print("\n" + "="*70)
    print(f"🔍 {title}")
    print("="*70)

def print_result(test_name, passed, message=""):
    status = "✓ PASS" if passed else "✗ FAIL"
    print(f"  {status}: {test_name}")
    if message:
        print(f"         {message}")

def test_python_version():
    print_header("Python Version Check")
    version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    passed = sys.version_info >= (3, 8)
    print_result(f"Python {version}", passed, "Requires 3.8+")
    return passed

def test_working_directory():
    print_header("Working Directory Check")
    cwd = os.getcwd()
    print(f"  Current directory: {cwd}")
    expected_files = ["getData.py", "ratiosTable.py", "api.py"]
    all_exist = all(os.path.exists(f) for f in expected_files)
    
    for file in expected_files:
        exists = os.path.exists(file)
        print_result(f"File exists: {file}", exists)
    
    return all_exist

def test_imports():
    print_header("Python Imports Check")
    
    required_packages = {
        'flask': 'Flask',
        'flask_cors': 'Flask-CORS',
        'pandas': 'Pandas',
        'numpy': 'NumPy',
        'openpyxl': 'openpyxl (Excel support)'
    }
    
    all_imported = True
    for module, name in required_packages.items():
        try:
            __import__(module)
            print_result(f"Import {name}", True)
        except ImportError as e:
            print_result(f"Import {name}", False, str(e))
            all_imported = False
    
    return all_imported

def test_backend_modules():
    print_header("Backend Modules Check")
    
    try:
        from getData import sourceData
        print_result("Import getData.py", True, f"Loaded {len(sourceData)} rows")
        
        try:
            from ratiosTable import resultTable
            print_result("Import ratiosTable.py", True)
            return True
        except Exception as e:
            print_result("Import ratiosTable.py", False, str(e))
            return False
            
    except Exception as e:
        print_result("Import getData.py", False, str(e))
        print("\n  Details:")
        print("  " + "\n  ".join(traceback.format_exc().split("\n")))
        return False

def test_excel_file():
    print_header("Excel File Check")
    
    try:
        import pandas as pd
        
        # This path should match what's in getData.py
        url = "Profitability results from FY 2024 to FY 2025.xlsx"
        
        print(f"  Looking for: {url}")
        exists = os.path.exists(url)
        print_result(f"File exists", exists)
        
        if exists:
            size_mb = os.path.getsize(url) / (1024 * 1024)
            print(f"  File size: {size_mb:.2f} MB")
            
            try:
                df = pd.read_excel(url, sheet_name="Detailed")
                print_result("Read Excel file", True, f"{len(df)} rows, {len(df.columns)} columns")
                print(f"  Columns: {', '.join(df.columns[:5])}...")
                return True
            except Exception as e:
                print_result("Read Excel file", False, str(e))
                return False
        else:
            print("  Trying alternate paths...")
            alternate_paths = [
                "exccute.py/Profitability results from FY 2024 to FY 2025.xlsx",
                "../Profitability results from FY 2024 to FY 2025.xlsx",
                "Profitability results from FY 2024 to FY 2025.xlsx"
            ]
            
            for path in alternate_paths:
                if os.path.exists(path):
                    print_result(f"Found at: {path}", True)
                    return True
            
            return False
            
    except Exception as e:
        print_result("Excel file check", False, str(e))
        return False

def test_flask_app():
    print_header("Flask App Check")
    
    try:
        from api import app, sourceData, get_data
        print_result("Import api.py", True)
        print_result("Flask app created", True if app else False)
        print_result("Source data in API", True if sourceData is not None else False)
        
        # Try a test request
        with app.test_client() as client:
            resp = client.get('/')
            print_result("Health check endpoint", resp.status_code == 200)
            
            resp = client.get('/api/debug')
            debug_data = resp.get_json()
            print_result("Debug endpoint", resp.status_code == 200)
            if debug_data:
                print(f"  Source data available: {debug_data.get('debug', {}).get('sourceDataAvailable')}")
        
        return True
        
    except Exception as e:
        print_result("Flask app check", False, str(e))
        return False

def print_summary(results):
    print_header("Test Summary")
    
    passed = sum(1 for r in results if r)
    total = len(results)
    
    print(f"\n  Results: {passed}/{total} tests passed\n")
    
    if passed == total:
        print("  ✓ Everything looks good! You should be able to:")
        print("    1. Run: python api.py")
        print("    2. Run: npm run dev")
        print("    3. Open http://localhost:5173")
        print("    4. Click 'Load Data' to fetch Excel data")
    else:
        print("  ✗ Some tests failed. Review the output above and check:")
        print("    • Python dependencies (pip install -r requirements.txt)")
        print("    • Excel file path in getData.py")
        print("    • File permissions and format")
        print("    • See TROUBLESHOOTING.md for more help")
    
    print("\n")

if __name__ == "__main__":
    print("\n" + "="*70)
    print("🚀 Auditor Valuation Framework - Diagnostic Test")
    print("="*70)
    print("This script checks if your environment is set up correctly")
    print("for running the data loading system.\n")
    
    results = [
        test_python_version(),
        test_working_directory(),
        test_imports(),
        test_excel_file(),
        test_backend_modules(),
        test_flask_app(),
    ]
    
    print_summary(results)
