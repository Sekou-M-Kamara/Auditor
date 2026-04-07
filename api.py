"""
Flask API for Auditor Valuation Framework
Connects React frontend to Python backend (getData.py, performanceAnalysis.py)
"""

from flask import Flask, request, jsonify, send_file, session
from flask_cors import CORS
import pandas as pd
import numpy as np
import json
import traceback
import sys
import os
import re
from io import BytesIO
from datetime import timedelta, datetime
from uuid import uuid4

# Import backend modules
try:
    from getData import load_data
    from performanceAnalysis import premiumClaimCommissionTableConstruct, performanceAnalysis
    from writeToExcel import excelSheetsGenerator
    from viewFilter import viewFilter
except ImportError as e:
    print(f"Warning: Could not import backend modules: {e}")
    load_data = None
    premiumClaimCommissionTableConstruct = None
    performanceAnalysis = None
    excelSheetsGenerator = None
    viewFilter = None

SESSION_CACHE_TTL = timedelta(hours=24)


def _new_analysis_cache():
    """Create a fresh cache object for a single user session."""
    return {
        'sourceData': None,
        'premiumTable': None,
        'claimTable': None,
        'commissionTable': None,
        'latestResultTableView': None,
        'latestResultTableManipulation': None,
        'activeViewFilterBundle': []
    }


# In-process session cache store: keyed by browser session id.
analysis_session_store = {}

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'dev-only-change-me')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)
CORS(app, supports_credentials=True)


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def dataframe_to_json(df):
    """Convert DataFrame to JSON-serializable records using pandas fast path."""
    if df is None or df.empty:
        return []

    # pandas.to_json is vectorized in C and significantly faster than iterrows-based conversion
    # for medium/large tables while preserving numeric types for frontend filtering.
    return json.loads(df.to_json(orient='records', date_format='iso'))


def get_dataframe_headers(df):
    """Extract column names from DataFrame"""
    return list(df.columns) if df is not None and not df.empty else []


def _purge_expired_session_cache(now=None):
    """Remove expired session cache entries."""
    current_time = now or datetime.utcnow()
    expired_keys = [
        session_id
        for session_id, payload in analysis_session_store.items()
        if payload.get('expiresAt') and payload['expiresAt'] <= current_time
    ]
    for session_id in expired_keys:
        analysis_session_store.pop(session_id, None)


def get_session_cache():
    """Return the cache object scoped to the current browser session."""
    current_time = datetime.utcnow()
    _purge_expired_session_cache(current_time)

    session_id = session.get('analysisSessionId')
    if not session_id:
        session_id = str(uuid4())
        session['analysisSessionId'] = session_id

    session.permanent = True
    payload = analysis_session_store.get(session_id)
    if payload is None or payload.get('expiresAt') <= current_time:
        payload = {
            'cache': _new_analysis_cache(),
            'expiresAt': current_time + SESSION_CACHE_TTL
        }
        analysis_session_store[session_id] = payload
    else:
        payload['expiresAt'] = current_time + SESSION_CACHE_TTL

    return payload['cache']


# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'Auditor Valuation Framework API',
        'version': '1.0.0'
    }), 200


@app.route('/api/debug', methods=['GET'])
def debug_info():
    """Debug endpoint to check backend module availability"""
    analysis_cache = get_session_cache()
    return jsonify({
        'status': 'ok',
        'debug': {
            'loadDataFunctionAvailable': load_data is not None,
            'performanceAnalysisFunctionAvailable': performanceAnalysis is not None,
            'premiumClaimCommissionTableConstructAvailable': premiumClaimCommissionTableConstruct is not None,
            'currentDirectory': os.getcwd(),
            'pythonVersion': f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            'supportedSources': ['excel', 'csv', 'api'],
            'cacheStatus': {
                'sourceDataCached': analysis_cache['sourceData'] is not None,
                'tablesCached': all([
                    analysis_cache['premiumTable'] is not None,
                    analysis_cache['claimTable'] is not None,
                    analysis_cache['commissionTable'] is not None
                ])
            }
        }
    }), 200


@app.route('/api/data', methods=['POST', 'GET'])
def get_data():
    """
    Load source data and construct analysis tables
    
    POST request: {
        "source": "excel" | "csv" | "api",
        "url": str,
        "sheetName": str (optional, for excel)
    }
    
    Returns: {
        "status": "success" | "error",
        "data": [...],
        "metadata": {...}
    }
    """
    try:
        analysis_cache = get_session_cache()
        source_type = 'excel'

        source_url = None
        source_name = None
        sheet_name = 'Detailed'

        if request.method == 'POST' and not request.is_json:
            source_type = request.form.get('source', source_type)
            sheet_name = request.form.get('sheetName', sheet_name)

        if request.method == 'POST' and request.is_json:
            request_data = request.get_json(silent=True) or {}
            source_url = request_data.get('url')
            source_type = request_data.get('source', source_type)
            sheet_name = request_data.get('sheetName', sheet_name)

        if request.method == 'POST' and 'file' in request.files:
            uploaded_file = request.files['file']
            source_name = uploaded_file.filename

            if uploaded_file.filename == '':
                return jsonify({
                    'status': 'error',
                    'message': 'No file selected',
                    'data': None
                }), 400

            file_buffer = BytesIO(uploaded_file.read())

            if source_type == 'excel':
                loaded_data = pd.read_excel(file_buffer, sheet_name=sheet_name)
            elif source_type == 'csv':
                loaded_data = pd.read_csv(file_buffer)
            else:
                return jsonify({
                    'status': 'error',
                    'message': 'File upload supports only excel or csv source types',
                    'data': None
                }), 400
        else:
            # Backward-compatible JSON URL flow (api/existing path usage).
            if not source_url:
                return jsonify({
                    'status': 'error',
                    'message': 'No URL or upload file provided',
                    'data': None
                }), 400

            if load_data is None:
                return jsonify({
                    'status': 'error',
                    'message': 'Data loading function not available',
                    'data': None
                }), 500

            if source_type == 'excel':
                loaded_data = load_data(source_url, source=source_type, sheet_name=sheet_name)
            else:
                loaded_data = load_data(source_url, source=source_type)
        
        if loaded_data is None or loaded_data.empty:
            return jsonify({
                'status': 'error',
                'message': f'No data loaded from {source_type} source',
                'data': None
            }), 400
        
        # Cache source data
        analysis_cache['sourceData'] = loaded_data
        analysis_cache['latestResultTableView'] = None
        analysis_cache['latestResultTableManipulation'] = None
        analysis_cache['activeViewFilterBundle'] = []
        
        # Construct and cache analysis tables (one-time operation)
        if premiumClaimCommissionTableConstruct is None:
            return jsonify({
                'status': 'error',
                'message': 'Table construction function not available',
                'data': None
            }), 500
        
        try:
            tables_dict = premiumClaimCommissionTableConstruct(loaded_data)
            analysis_cache['premiumTable'] = tables_dict['premiumTable']
            analysis_cache['claimTable'] = tables_dict['claimTable']
            analysis_cache['commissionTable'] = tables_dict['commissionTable']
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Failed to construct tables: {str(e)}',
                'data': None
            }), 500
        
        # Prepare response
        data_json = dataframe_to_json(loaded_data)
        headers = get_dataframe_headers(loaded_data)
        
        return jsonify({
            'status': 'success',
            'data': data_json,
            'metadata': {
                'rows': len(loaded_data),
                'columns': headers,
                'source': source_type,
                'url': source_url,
                'fileName': source_name,
                'sheetName': sheet_name if source_type == 'excel' else None
            }
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Data loading error: {str(e)}',
            'data': None
        }), 500


@app.route('/api/analysis', methods=['POST'])
def run_analysis():
    """
    Run performance analysis on cached tables with form parameters
    
    POST request: {
        "analysisType": "performance",
        "params": {
            "categoryHeader": str,
            "dataFieldHeader": str,
            "grossDataFieldHeader": str,
            "netManagementExpenseRatio": float
        },
        "filters": [[header, value, operation], ...]
    }
    
    Returns: {
        "status": "success" | "error",
        "data": [...],
        "metadata": {...}
    }
    """
    try:
        analysis_cache = get_session_cache()
        
        if performanceAnalysis is None:
            return jsonify({
                'status': 'error',
                'message': 'Performance analysis function not available',
                'data': None
            }), 500
        
        request_data = request.get_json()
        analysis_type = request_data.get('analysisType', 'performance')
        params = request_data.get('params', {})
        filters = request_data.get('filters', [])
        active_view_filter_bundle = analysis_cache.get('activeViewFilterBundle')
        if active_view_filter_bundle is None:
            active_view_filter_bundle = []
        elif not isinstance(active_view_filter_bundle, list):
            return jsonify({
                'status': 'error',
                'message': 'Cached active view filter bundle is invalid',
                'data': None
            }), 500
        
        # DEBUG: Print filters to console
        print(f"\n{'='*60}")
        print(f"DEBUG: Received Filters")
        print(f"{'='*60}")
        print(f"Filter type: {type(filters)}")
        print(f"Filter value: {filters}")
        print(f"Number of filters: {len(filters) if isinstance(filters, list) else 'N/A'}")
        if isinstance(filters, list) and len(filters) > 0:
            for i, f in enumerate(filters):
                print(f"  Filter {i}: {f} (type: {type(f)})")
        print(f"{'='*60}\n")
        
        # Validate source data exists
        if analysis_cache['sourceData'] is None:
            return jsonify({
                'status': 'error',
                'message': 'No source data available. Load data first.',
                'data': None
            }), 400
        
        source_data = analysis_cache['sourceData']
        
        # Extract form parameters
        category_header = params.get('categoryHeader', 'Reporting Unit1 Leaf Name')
        data_field_header = params.get('dataFieldHeader', 'Retained Amt Base')
        gross_data_field_header = params.get('grossDataFieldHeader', 'Detail Amount (Base)')
        net_management_expense_ratio = float(params.get('netManagementExpenseRatio', 0.12))
        
        # Prepare tables_dict: use cached tables or reconstruct as safety net
        
        if (analysis_cache['premiumTable'] is not None and
            analysis_cache['claimTable'] is not None and
            analysis_cache['commissionTable'] is not None):
            
            # Use cached tables
            tables_dict = {
                'premiumTable': analysis_cache['premiumTable'],
                'claimTable': analysis_cache['claimTable'],
                'commissionTable': analysis_cache['commissionTable']
            }
        else:
            # Safety net: reconstruct tables if not cached
            if premiumClaimCommissionTableConstruct is None:
                return jsonify({
                    'status': 'error',
                    'message': 'Cannot reconstruct tables: function not available',
                    'data': None
                }), 500
            
            try:
                tables_dict = premiumClaimCommissionTableConstruct(source_data)
                analysis_cache['premiumTable'] = tables_dict['premiumTable']
                analysis_cache['claimTable'] = tables_dict['claimTable']
                analysis_cache['commissionTable'] = tables_dict['commissionTable']
            except Exception as e:
                return jsonify({
                    'status': 'error',
                    'message': f'Failed to reconstruct tables: {str(e)}',
                    'data': None
                }), 500
        
        # Run performance analysis
        try:
            analysis_output = performanceAnalysis(
                data=source_data,
                tableDict=tables_dict,
                category_header=category_header,
                data_field_header=data_field_header,
                gross_data_field_header=gross_data_field_header,
                net_management_expense_ratio=net_management_expense_ratio,
                filterArray=filters
            )

            if isinstance(analysis_output, (list, tuple)) and len(analysis_output) >= 2:
                view_result_table = analysis_output[0]
                manipulation_result_table = analysis_output[1]
            else:
                # Backward compatibility if function returns a single DataFrame.
                manipulation_result_table = analysis_output
                view_result_table = analysis_output
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Analysis error: {str(e)}',
                'data': None
            }), 500
        
        # Prepare response
        analysis_cache['latestResultTableView'] = view_result_table.copy().reset_index(drop=True)
        analysis_cache['latestResultTableManipulation'] = manipulation_result_table.copy().reset_index(drop=True)

        response_table = view_result_table
        if active_view_filter_bundle:
            if viewFilter is None:
                return jsonify({
                    'status': 'error',
                    'message': 'View filter function not available for active view filter bundle',
                    'data': None
                }), 500

            try:
                response_table = viewFilter(
                    analysis_cache['latestResultTableManipulation'].copy(),
                    active_view_filter_bundle
                )
            except Exception as e:
                return jsonify({
                    'status': 'error',
                    'message': f'Failed to apply active view filter bundle: {str(e)}',
                    'data': None
                }), 500

        results_json = dataframe_to_json(response_table)
        columns = get_dataframe_headers(response_table)
        
        return jsonify({
            'status': 'success',
            'data': results_json,
            'metadata': {
                'analysisType': analysis_type,
                'rows': len(response_table),
                'columns': columns,
                'params': params
            }
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Analysis error: {str(e)}',
            'data': None
        }), 500


@app.route('/api/metadata', methods=['GET'])
def get_metadata():
    """Get metadata about available analysis types"""
    try:
        return jsonify({
            'status': 'success',
            'dataHeaders': [],
            'analysisTypes': [
                {
                    'type': 'performance',
                    'name': 'Performance Analysis',
                    'description': 'Analyze insurance performance metrics using premium, claim, and commission tables',
                    'params': {
                        'categoryHeader': 'Column to group analysis by',
                        'dataFieldHeader': 'Net data field column',
                        'grossDataFieldHeader': 'Gross data field column',
                        'netManagementExpenseRatio': 'Management expense ratio (0-1)'
                    }
                }
            ]
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Metadata error: {str(e)}'
        }), 500


@app.route('/api/view-filter', methods=['POST'])
def run_view_filter():
    """
    Filter already-generated analysis results without recomputing analysis.

    POST request: {
        "filterBundle": [[header, value, operation], ...]
    }
    """
    try:
        analysis_cache = get_session_cache()

        if viewFilter is None:
            return jsonify({
                'status': 'error',
                'message': 'View filter function not available',
                'data': None
            }), 500

        if analysis_cache['latestResultTableManipulation'] is None:
            return jsonify({
                'status': 'error',
                'message': 'No result table available. Run analysis first.',
                'data': None
            }), 400

        request_data = request.get_json() or {}
        filter_bundle = request_data.get('filterBundle', [])
        print(f"filter_bundle {filter_bundle}\n\n\n")
        # print(f"analysis table {analysis_cache['latestResultTableManipulation']}")

        if not isinstance(filter_bundle, list):
            return jsonify({
                'status': 'error',
                'message': 'filterBundle must be an array',
                'data': None
            }), 400

        if len(filter_bundle) == 0:
            filtered_view_df = analysis_cache['latestResultTableView'].copy()
        else:
            filtered_df = viewFilter(analysis_cache['latestResultTableManipulation'].copy(), filter_bundle)
            filtered_view_df = filtered_df.copy()

        analysis_cache['activeViewFilterBundle'] = filter_bundle

        # filtered_view_df = analysis_cache['latestResultTableView'].loc[filtered_df.index].copy()

        return jsonify({
            'status': 'success',
            'data': dataframe_to_json(filtered_view_df),
            'metadata': {
                'rows': len(filtered_view_df),
                'columns': list(filtered_view_df.columns)
            }
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'View filter error: {str(e)}',
            'data': None
        }), 500


@app.route('/api/export/excel', methods=['POST'])
@app.route('/api/export/excel/', methods=['POST'])
@app.route('/api/write-to-excel', methods=['POST'])
def export_excel():
    """
    Generate Excel workbook from analysis parameters.

    POST request: {
        "analysisType": str,
        "categoryBundle": [str, ...],
        "oneSheet": bool,
        "workbook_name": str (optional),
        "data_field_header": str,
        "gross_data_field_header": str,
        "net_management_expense_ratio": float,
        "filterArray": [[header, value, operation], ...]
    }
    """
    try:
        analysis_cache = get_session_cache()

        if excelSheetsGenerator is None:
            return jsonify({
                'status': 'error',
                'message': 'Excel generator function not available'
            }), 500

        if analysis_cache['sourceData'] is None:
            return jsonify({
                'status': 'error',
                'message': 'No source data available. Load data first.'
            }), 400

        request_data = request.get_json() or {}

        analysis_type = request_data.get('analysisType')
        category_bundle = request_data.get('categoryBundle')
        one_sheet = request_data.get('oneSheet')
        workbook_name = request_data.get('workbook_name', '')
        category_header = request_data.get('category_header')
        data_field_header = request_data.get('data_field_header')
        gross_data_field_header = request_data.get('gross_data_field_header')
        net_management_expense_ratio = request_data.get('net_management_expense_ratio')
        filter_array = request_data.get('filterArray', [])
        thresholds = request_data.get('thresholds', {})
        conditional_formatting_enable = request_data.get('conditionalFormattingEnable', True)

        if isinstance(conditional_formatting_enable, str):
            lowered = conditional_formatting_enable.strip().lower()
            conditional_formatting_enable = lowered in ('true', '1', 'yes', 'on')
        else:
            conditional_formatting_enable = bool(conditional_formatting_enable)

        missing_fields = []
        for field_name, field_value in [
            ('analysisType', analysis_type),
            ('categoryBundle', category_bundle),
            ('oneSheet', one_sheet),
            ('category_header', category_header),
            ('data_field_header', data_field_header),
            ('gross_data_field_header', gross_data_field_header),
            ('net_management_expense_ratio', net_management_expense_ratio)
        ]:
            if field_value is None:
                missing_fields.append(field_name)

        if missing_fields:
            return jsonify({
                'status': 'error',
                'message': f"Missing required export fields: {', '.join(missing_fields)}"
            }), 400

        if not isinstance(category_bundle, list) or len(category_bundle) == 0:
            return jsonify({
                'status': 'error',
                'message': 'categoryBundle must be a non-empty array of category headers'
            }), 400

        if (analysis_cache['premiumTable'] is not None and
            analysis_cache['claimTable'] is not None and
            analysis_cache['commissionTable'] is not None):
            tables_dict = {
                'premiumTable': analysis_cache['premiumTable'],
                'claimTable': analysis_cache['claimTable'],
                'commissionTable': analysis_cache['commissionTable']
            }
        else:
            if premiumClaimCommissionTableConstruct is None:
                return jsonify({
                    'status': 'error',
                    'message': 'Cannot build analysis tables: function not available'
                }), 500

            tables_dict = premiumClaimCommissionTableConstruct(analysis_cache['sourceData'])
            analysis_cache['premiumTable'] = tables_dict['premiumTable']
            analysis_cache['claimTable'] = tables_dict['claimTable']
            analysis_cache['commissionTable'] = tables_dict['commissionTable']

        parsed_one_sheet = one_sheet
        if isinstance(one_sheet, str):
            lowered = one_sheet.strip().lower()
            if lowered in ('single', 'true', '1', 'yes'):
                parsed_one_sheet = True
            elif lowered in ('multiple', 'false', '0', 'no'):
                parsed_one_sheet = False
            else:
                parsed_one_sheet = bool(lowered)

        filter_count = len(filter_array) if isinstance(filter_array, list) else 0
        app.logger.info(
            "excel_export_request timestamp=%s analysis_type=%s one_sheet=%s category_headers=%d filter_count=%d",
            datetime.utcnow().isoformat() + 'Z',
            analysis_type,
            bool(parsed_one_sheet),
            len(category_bundle),
            filter_count
        )

        workbook_stream = excelSheetsGenerator(
            analysisType=analysis_type,
            categoryBundle=category_bundle,
            oneSheet=bool(parsed_one_sheet),
            data=analysis_cache['sourceData'],
            tableDict=tables_dict,
            category_header=category_header,
            data_field_header=data_field_header,
            gross_data_field_header=gross_data_field_header,
            net_management_expense_ratio=float(net_management_expense_ratio),
            filterArray=filter_array,
            thresholds=thresholds,
            conditionalFormattingEnable=conditional_formatting_enable
        )

        default_file_name = f"{analysis_type}_analysis_export.xlsx"
        file_name = default_file_name
        if isinstance(workbook_name, str) and workbook_name.strip():
            safe_base = re.sub(r'[\\/:*?"<>|]+', '_', workbook_name.strip())
            safe_base = safe_base.rstrip('.')
            if safe_base:
                file_name = safe_base if safe_base.lower().endswith('.xlsx') else f"{safe_base}.xlsx"

        return send_file(
            workbook_stream,
            as_attachment=True,
            download_name=file_name,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

    except Exception as e:
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': f'Excel export error: {str(e)}'
        }), 500


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'status': 'error',
        'message': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({
        'status': 'error',
        'message': 'Internal server error'
    }), 500


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    app.run(host='localhost', port=5000, debug=True)


