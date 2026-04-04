import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Viewport from './Viewport';
import RatioAnalysisForm from './analysisTypes/RatioAnalysisForm';
import RatioAnalysisResults from './analysisTypes/RatioAnalysisResults';
import ExcelExportPanel from './ExcelExportPanel';

function AnalysisSection({ sourceData }) {
  const [analysisType, setAnalysisType] = useState('performance');
  const [analysisResults, setAnalysisResults] = useState(null);
  const [resultLoading, setResultLoading] = useState(false);
  const [resultError, setResultError] = useState(null);
  const [showThresholdConfig, setShowThresholdConfig] = useState(false);
  const [showFilterConfig, setShowFilterConfig] = useState(false);
  const [showExcelExportPanel, setShowExcelExportPanel] = useState(false);
  const [excelExportLoading, setExcelExportLoading] = useState(false);
  const [excelExportProgress, setExcelExportProgress] = useState({
    current: 0,
    total: 0
  });
  const [excelExportStatus, setExcelExportStatus] = useState({
    state: 'idle',
    message: ''
  });
  const [viewFilters, setViewFilters] = useState([]);
  const [viewFilterLoading, setViewFilterLoading] = useState(false);
  const [viewFilteredResults, setViewFilteredResults] = useState(null);
  const [lastFormParams, setLastFormParams] = useState(null);
  // Session memory: thresholds persist during the session
  const [thresholds, setThresholds] = useState({
    'Loss Ratio': { condition: 'atleast', value: '0.75' },
    'Commission Ratio': { condition: 'atleast', value: '0.20' },
    'Net Management Expense Ratio': { condition: 'atleast', value: '0.12' },
    'Net Technical Margin Ratio': { condition: 'atmost', value: '0.05' },
    'Net Retro Expense Ratio': { condition: 'atleast', value: '' },
    'Combined Ratio': { condition: 'atleast', value: '1.00' }
  });

  // Filter state: array of [header, item, operation]
  const [filters, setFilters] = useState([]);
  const [exportFilters, setExportFilters] = useState([]);
  const [filterChangeSource, setFilterChangeSource] = useState(null); // Track if change is from Viewport
  const [newFilterHeader, setNewFilterHeader] = useState('');
  const [newFilterItem, setNewFilterItem] = useState('');
  const [newFilterOperation, setNewFilterOperation] = useState('Equal');

  // Get available headers from source data
  const availableHeaders = useMemo(() => {
    if (!Array.isArray(sourceData) || sourceData.length === 0) return [];
    return Object.keys(sourceData[0]);
  }, [sourceData]);

  // Get unique values for selected header (preserve types from source)
  const filterItemsForHeader = useMemo(() => {
    if (!newFilterHeader || !Array.isArray(sourceData) || sourceData.length === 0) return [];
    const uniqueValues = [...new Set(sourceData.map(row => row[newFilterHeader]).filter(val => val != null))];
    
    // Sort values based on type: numbers numerically, strings alphabetically
    return uniqueValues.sort((a, b) => {
      const typeA = typeof a;
      const typeB = typeof b;
      
      // Both numbers: numeric sort
      if (typeA === 'number' && typeB === 'number') {
        return a - b;
      }
      // Both strings: alphabetic sort
      if (typeA === 'string' && typeB === 'string') {
        return a.localeCompare(b);
      }
      // Mixed types: numbers first, then strings
      return typeA === 'number' ? -1 : 1;
    });
  }, [newFilterHeader, sourceData]);

  // Determine if a column is numeric based on all its values
  const isNumericColumn = useCallback((columnName) => {
    if (!Array.isArray(sourceData) || sourceData.length === 0) return false;
    
    // Check if all non-null values in the column can be parsed as numbers
    const values = sourceData
      .map(row => row[columnName])
      .filter(val => val != null && val !== '');
    
    if (values.length === 0) return false;
    
    // If all values can be parsed as numbers, it's a numeric column
    return values.every(val => !isNaN(parseFloat(val)));
  }, [sourceData]);

  // Convert filter value to appropriate type based on column
  const convertFilterValue = useCallback((columnName, value) => {
    if (isNumericColumn(columnName)) {
      const numValue = parseFloat(value);
      return isNaN(numValue) ? value : numValue;
    }
    return value;
  }, [isNumericColumn]);

  // Determine operations based on column type
  const getOperationsForColumn = useCallback((columnName) => {
    if (isNumericColumn(columnName)) {
      return ['Equal', 'Atlest', 'Atmost'];
    }
    return ['Equal'];
  }, [isNumericColumn]);

  const availableOperations = useMemo(() => {
    if (!newFilterHeader) return [];
    return getOperationsForColumn(newFilterHeader);
  }, [newFilterHeader, getOperationsForColumn]);

  const getResultSignature = useCallback((resultObj) => {
    if (!resultObj || !Array.isArray(resultObj.data)) return '';
    const columns = resultObj?.metadata?.columns || [];
    const params = resultObj?.metadata?.params || {};
    return JSON.stringify({
      analysisType,
      rows: resultObj.data.length,
      columns,
      params
    });
  }, [analysisType]);

  const getViewFilterCacheStore = useCallback(() => {
    try {
      const raw = window.sessionStorage.getItem('resultViewFilterCacheStore');
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }, []);

  const setViewFilterCacheStore = useCallback((store) => {
    try {
      window.sessionStorage.setItem('resultViewFilterCacheStore', JSON.stringify(store));
    } catch (_) {
      // Ignore storage issues silently to avoid blocking UX.
    }
  }, []);

  const isSameFilter = useCallback((a, b) => {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length < 3 || b.length < 3) return false;
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  }, []);

  const handleAddFilter = (filterFromViewport) => {
    // If called from Viewport with a filter array, use it directly
    if (filterFromViewport && Array.isArray(filterFromViewport)) {
      setFilters((prev) => {
        if (prev.some((existingFilter) => isSameFilter(existingFilter, filterFromViewport))) {
          return prev;
        }
        return [...prev, filterFromViewport];
      });
      setFilterChangeSource('viewport'); // Mark as Viewport change
      return;
    }
    
    // Otherwise, use local state (called from left panel)
    if (newFilterHeader && newFilterItem) {
      const convertedValue = convertFilterValue(newFilterHeader, newFilterItem);
      const nextFilter = [newFilterHeader, convertedValue, newFilterOperation];
      setFilters((prev) => {
        if (prev.some((existingFilter) => isSameFilter(existingFilter, nextFilter))) {
          return prev;
        }
        return [...prev, nextFilter];
      });
      setFilterChangeSource('leftpanel'); // Mark as left panel change
      setNewFilterHeader('');
      setNewFilterItem('');
      setNewFilterOperation('Equal');
    }
  };

  // Helper to run analysis with specific filters
  const handleRunAnalysisWithFilters = async (filtersToUse, formParams) => {
    setResultLoading(true);
    setResultError(null);

    console.log('%c=== FRONTEND DEBUG: Filters Being Sent ===', 'background: #4CAF50; color: white; padding: 5px;');
    console.log('Total filters:', filtersToUse.length);
    filtersToUse.forEach((f, i) => {
      const [column, value, operation] = f;
      const valueType = typeof value;
      const isNumeric = !isNaN(value) && value !== '';
      console.log(`Filter ${i}: "${column}" ${operation} ${value} (type: ${valueType}, numeric: ${isNumeric}, isNumber: ${typeof value === 'number'})`);
    });
    console.log('%c=== END DEBUG ===', 'background: #4CAF50; color: white; padding: 5px;');

    try {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisType,
          params: formParams,
          sourceData,
          filters: filtersToUse
        })
      });

      if (!response.ok) throw new Error('Failed to run analysis');

      const result = await response.json();
      setAnalysisResults(result);
      setViewFilteredResults(null);
      setViewFilters([]);
    } catch (err) {
      setResultError(err.message);
      console.error('Analysis error:', err);
    } finally {
      setResultLoading(false);
    }
  };

  const handleRemoveFilter = (index) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters);
    setFilterChangeSource('viewport'); // Removal from status bar is associated with viewport context
  };

  const handleClearAllFilters = () => {
    setFilters([]);
    setFilterChangeSource('viewport');
  };

  const handleRunAnalysis = async (formParams) => {
    setResultLoading(true);
    setResultError(null);

    // Store the form params for refresh functionality in expanded viewport
    const paramsToUse = formParams || lastFormParams;
    if (!paramsToUse) {
      setResultError('No analysis parameters available');
      setResultLoading(false);
      return;
    }

    setLastFormParams(paramsToUse);

    // DEBUG: Log filters to console with detailed type info
    console.log('%c=== FRONTEND DEBUG: Filters Being Sent ===', 'background: #4CAF50; color: white; padding: 5px;');
    console.log('Total filters:', filters.length);
    filters.forEach((f, i) => {
      const [column, value, operation] = f;
      const valueType = typeof value;
      const isNumeric = !isNaN(value) && value !== '';
      console.log(`Filter ${i}: "${column}" ${operation} ${value} (type: ${valueType}, numeric: ${isNumeric}, isNumber: ${typeof value === 'number'})`);
    });
    console.log('%c=== END DEBUG ===', 'background: #4CAF50; color: white; padding: 5px;');

    try {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisType,
          params: paramsToUse,
          sourceData,
          filters
        })
      });

      if (!response.ok) throw new Error('Failed to run analysis');

      const result = await response.json();
      setAnalysisResults(result);
      setViewFilteredResults(null);
      setViewFilters([]);
    } catch (err) {
      setResultError(err.message);
      console.error('Analysis error:', err);
    } finally {
      setResultLoading(false);
    }
  };

  // Auto-refresh analysis when filters change from Viewport only
  useEffect(() => {
    // Only auto-refresh if:
    // 1. Change came from Viewport (not left panel)
    // 2. We have existing results and params
    // 3. Not currently loading
    if (filterChangeSource === 'viewport' && analysisResults && lastFormParams && !resultLoading) {
      handleRunAnalysisWithFilters(filters, lastFormParams);
    }
  }, [filterChangeSource, filters]);

  const AnalysisFormComponent = useMemo(() => {
    switch (analysisType) {
      case 'performance':
        return RatioAnalysisForm;
      // Future analysis types can be added here
      default:
        return RatioAnalysisForm;
    }
  }, [analysisType]);

  const AnalysisResultsComponent = useMemo(() => {
    switch (analysisType) {
      case 'performance':
        return RatioAnalysisResults;
      // Future analysis types can be added here
      default:
        return RatioAnalysisResults;
    }
  }, [analysisType]);

  const ratioColumns = [
    'Loss Ratio',
    'Commission Ratio',
    'Net Management Expense Ratio',
    'Net Technical Margin Ratio',
    'Net Retro Expense Ratio',
    'Combined Ratio'
  ];

  const getDefaultThresholdCondition = (ratioName) => (
    ratioName === 'Net Technical Margin Ratio' ? 'atmost' : 'atleast'
  );

  const decimalRatioToPercentDisplay = (decimalValue) => {
    const parsed = parseFloat(decimalValue);
    if (isNaN(parsed)) return '';
    const percentValue = parsed * 100;
    return Number.isInteger(percentValue) ? String(percentValue) : percentValue.toString();
  };

  const percentInputToDecimalRatio = (percentInput) => {
    if (percentInput === '') return '';
    const parsed = parseFloat(percentInput);
    if (isNaN(parsed)) return '';
    const decimalValue = parsed / 100;
    return decimalValue.toString();
  };

  const handleThresholdChange = (ratioName, field, value) => {
    setThresholds(prev => ({
      ...prev,
      [ratioName]: {
        ...prev[ratioName],
        [field]: field === 'value' ? percentInputToDecimalRatio(value) : value
      }
    }));
  };

  const handleAddExportFilter = (filterFromPanel) => {
    if (!filterFromPanel || !Array.isArray(filterFromPanel)) return;
    setExportFilters((prev) => [...prev, filterFromPanel]);
  };

  const handleRemoveExportFilter = (index) => {
    setExportFilters((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAllExportFilters = () => {
    setExportFilters([]);
  };

  const handleAddViewFilter = (filterFromPanel) => {
    if (!filterFromPanel || !Array.isArray(filterFromPanel)) return;
    setViewFilters((prev) => {
      const nextFilters = prev.some((existingFilter) => isSameFilter(existingFilter, filterFromPanel))
        ? prev
        : [...prev, filterFromPanel];
      handleApplyViewFilters(nextFilters);
      return nextFilters;
    });
  };

  const handleRemoveViewFilter = (index) => {
    const nextFilters = viewFilters.filter((_, i) => i !== index);
    setViewFilters(nextFilters);
    if (nextFilters.length === 0) {
      setViewFilteredResults(null);
      return;
    }
    handleApplyViewFilters(nextFilters);
  };

  const handleClearAllViewFilters = () => {
    // Keep cached filtered view in session storage; only clear active filter application.
    setViewFilters([]);
    setViewFilteredResults(null);
  };

  const handleApplyViewFilters = async (filtersToApply = viewFilters) => {
    if (!analysisResults || !Array.isArray(analysisResults.data) || filtersToApply.length === 0) return;

    const signature = getResultSignature(analysisResults);
    if (!signature) return;

    const cacheStore = getViewFilterCacheStore();
    const currentFiltersKey = JSON.stringify(filtersToApply);

    setViewFilterLoading(true);
    try {
      const response = await fetch('/api/view-filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filterBundle: filtersToApply
        })
      });

      if (!response.ok) {
        throw new Error('Failed to apply view filter');
      }

      const filteredPayload = await response.json();
      const filteredResult = {
        ...analysisResults,
        data: filteredPayload?.data || [],
        metadata: {
          ...(analysisResults.metadata || {}),
          rows: Array.isArray(filteredPayload?.data) ? filteredPayload.data.length : 0,
          columns: filteredPayload?.metadata?.columns || analysisResults?.metadata?.columns || []
        }
      };

      setViewFilteredResults(filteredResult);
      cacheStore[signature] = {
        filtersKey: currentFiltersKey,
        filters: filtersToApply,
        filteredResult
      };
      setViewFilterCacheStore(cacheStore);
    } catch (err) {
      setResultError(err.message || 'View filter error');
    } finally {
      setViewFilterLoading(false);
    }
  };

  const handleRestoreViewFilters = () => {
    const signature = getResultSignature(analysisResults);
    if (!signature) return;

    const cacheStore = getViewFilterCacheStore();
    const cacheEntry = cacheStore[signature];
    if (!cacheEntry || !cacheEntry.filteredResult) return;

    setViewFilters(Array.isArray(cacheEntry.filters) ? cacheEntry.filters : []);
    setViewFilteredResults(cacheEntry.filteredResult);
  };

  const handleExcelExportDraft = async (payload) => {
    if (excelExportLoading) {
      return;
    }

    const exportPayload = {
      ...payload,
      thresholds
    };

    const totalSteps = Array.isArray(payload?.categoryBundle) ? payload.categoryBundle.length : 0;
    setExcelExportProgress({ current: totalSteps > 0 ? 1 : 0, total: totalSteps });
    setExcelExportStatus({
      state: 'running',
      message: totalSteps > 0
        ? `Exporting ${totalSteps} selected category headers...`
        : 'Exporting workbook...'
    });
    setExcelExportLoading(true);

    let progressTimer = null;
    if (totalSteps > 1) {
      progressTimer = window.setInterval(() => {
        setExcelExportProgress((prev) => {
          if (prev.current >= prev.total) return prev;
          return { ...prev, current: prev.current + 1 };
        });
      }, 600);
    }

    try {
      setResultError(null);

      const response = await fetch('/api/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportPayload)
      });

      if (!response.ok) {
        let message = 'Failed to export Excel file';
        try {
          const err = await response.json();
          message = err?.message || message;
        } catch (_) {
          // Keep default message when non-JSON error body is returned.
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition') || '';
      const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i);
      const filename = filenameMatch ? decodeURIComponent(filenameMatch[1].replace(/\"/g, '')) : 'analysis_export.xlsx';

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setExcelExportStatus({
        state: 'success',
        message: `Export completed: ${filename}`
      });
      setShowExcelExportPanel(false);
    } catch (err) {
      const errorMessage = err.message || 'Excel export failed';
      setResultError(errorMessage);
      setExcelExportStatus({
        state: 'error',
        message: errorMessage
      });
      console.error('Excel export error:', err);
    } finally {
      if (progressTimer) {
        window.clearInterval(progressTimer);
      }

      setExcelExportProgress({ current: 0, total: 0 });
      setExcelExportLoading(false);
    }
  };

  if (!sourceData) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
        <p>Load data first to enable analysis</p>
      </div>
    );
  }

  return (
    <>
      {(() => {
        const displayedResults = viewFilteredResults || analysisResults;
        const displayedResultData = Array.isArray(displayedResults?.data) ? displayedResults.data : [];
        const displayedResultHeaders = displayedResults?.metadata?.columns || (displayedResultData[0] ? Object.keys(displayedResultData[0]) : []);
        const baseResultData = Array.isArray(analysisResults?.data) ? analysisResults.data : [];
        const baseResultHeaders = analysisResults?.metadata?.columns || (baseResultData[0] ? Object.keys(baseResultData[0]) : []);

        return (
      <div className="analysis-section">
      <div className="analysis-controls">
        <h3 className="section-title" style={{ display: 'block', margin: 0 }}>Analysis</h3>

        <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '300px' }}>
          <button
            onClick={() => setShowThresholdConfig(!showThresholdConfig)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              width: '100%'
            }}
          >
            {showThresholdConfig ? '✕ Close Threshold Config' : '⚙ Configure Thresholds'}
          </button>

          <button
            onClick={() => setShowFilterConfig(!showFilterConfig)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              width: '100%'
            }}
          >
            {showFilterConfig ? '✕ Close Filter Config' : '🔍 Configure Filters'}
          </button>

          <div className="excel-export-trigger-row">
            <button
              onClick={() => {
                if (exportFilters.length === 0 && filters.length > 0) {
                  setExportFilters([...filters]);
                }
                setShowExcelExportPanel(true);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                width: '100%',
                flexShrink: 0
              }}
            >
              📥 Write to Excel
            </button>

            {excelExportLoading && (
              <div className="excel-inline-progress-right" aria-live="polite">
                <div className="excel-inline-progress-track">
                  <div
                    className="excel-inline-progress-fill"
                    style={{ width: `${excelExportProgress.total > 0 ? Math.round((excelExportProgress.current / excelExportProgress.total) * 100) : 0}%` }}
                  />
                </div>
                <span className="excel-inline-progress-fraction">
                  {excelExportProgress.current}/{excelExportProgress.total}
                </span>
              </div>
            )}
          </div>

          {!showExcelExportPanel && excelExportStatus.state !== 'idle' && (
            <div className={`excel-export-status-under-btn ${excelExportStatus.state}`}>
              {excelExportStatus.message}
            </div>
          )}
        </div>

        {showThresholdConfig && (
          <div style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f9f9f9',
            border: '1px solid #e0e0e0',
            borderRadius: '4px'
          }}>
            <h4 style={{ marginTop: 0 }}>Ratio Threshold Configuration</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
              {ratioColumns.map(ratioName => (
                <div key={ratioName} style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
                    {ratioName}
                  </label>
                  
                  <div style={{ marginBottom: '8px' }}>
                    <select
                      value={thresholds[ratioName]?.condition || getDefaultThresholdCondition(ratioName)}
                      onChange={(e) => handleThresholdChange(ratioName, 'condition', e.target.value)}
                      style={{
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        width: '100%',
                        marginBottom: '8px'
                      }}
                    >
                      <option value="atleast">At Least (≥)</option>
                      <option value="atmost">At Most (≤)</option>
                      <option value="equal">Equal (=)</option>
                    </select>
                  </div>

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={decimalRatioToPercentDisplay(thresholds[ratioName]?.value)}
                    onChange={(e) => handleThresholdChange(ratioName, 'value', e.target.value)}
                    style={{
                      padding: '6px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      width: '100%'
                    }}
                    placeholder="Enter threshold (%)"
                  />

                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                    <div>Cells will turn red if value</div>
                    <div>{thresholds[ratioName]?.condition === 'atleast' ? 'is greater than or equal to' : thresholds[ratioName]?.condition === 'atmost' ? 'is less than or equal to' : 'is equal to'} {decimalRatioToPercentDisplay(thresholds[ratioName]?.value)}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showFilterConfig && (
          <div style={{
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f0f8ff',
            border: '1px solid #28a745',
            borderRadius: '4px'
          }}>
            <h4 style={{ marginTop: 0, color: '#28a745' }}>Data Filter Configuration</h4>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr auto',
              gap: '10px',
              marginBottom: '15px',
              alignItems: 'end'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                  Column:
                </label>
                <select
                  value={newFilterHeader}
                  onChange={(e) => {
                    setNewFilterHeader(e.target.value);
                    setNewFilterItem('');
                    setNewFilterOperation('Equal');
                  }}
                  style={{
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    width: '100%'
                  }}
                >
                  <option value="">-- Select Column --</option>
                  {availableHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                  Value:
                </label>
                <select
                  value={newFilterItem}
                  onChange={(e) => setNewFilterItem(e.target.value)}
                  disabled={!newFilterHeader}
                  style={{
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    width: '100%'
                  }}
                >
                  <option value="">-- Select Value --</option>
                  {filterItemsForHeader.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                  Operation:
                </label>
                <select
                  value={newFilterOperation}
                  onChange={(e) => setNewFilterOperation(e.target.value)}
                  disabled={!newFilterItem}
                  style={{
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    width: '100%'
                  }}
                >
                  {availableOperations.map((op) => (
                    <option key={op} value={op}>
                      {op === 'Equal' ? '=' : op === 'Atlest' ? '≥' : '≤'}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAddFilter}
                disabled={!newFilterHeader || !newFilterItem}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: newFilterHeader && newFilterItem ? 'pointer' : 'not-allowed',
                  fontSize: '12px'
                }}
              >
                Add Filter
              </button>
            </div>

            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              padding: '10px'
            }}>
              {filters.length === 0 ? (
                <div style={{ color: '#999', fontSize: '12px' }}>No filters applied</div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                    {filters.map((filter, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: '#f9f9f9',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          border: '1px solid #e0e0e0',
                          fontSize: '13px'
                        }}
                      >
                        <span>
                          <strong>{filter[0]}</strong> {filter[2] === 'Equal' ? '=' : filter[2] === 'Atlest' ? '≥' : '≤'} <strong>{filter[1]}</strong>
                        </span>
                        <button
                          onClick={() => handleRemoveFilter(idx)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <div style={{
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffc107',
                    borderRadius: '4px',
                    padding: '8px 10px',
                    fontSize: '12px',
                    color: '#856404',
                    fontWeight: '500'
                  }}>
                    ⚠️ Filters active. Click "Run Analysis" or use "Refresh Analysis" in expanded view to see results with filters applied.
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="control-group">
          <label htmlFor="analysis-type">Analysis Type:</label>
          <select
            id="analysis-type"
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value)}
          >
            <option value="performance">Performance Analysis</option>
            {/* Additional analysis types can be added here */}
          </select>
        </div>

        <AnalysisFormComponent onSubmit={handleRunAnalysis} sourceData={sourceData} />
      </div>

      <div className="analysis-results">
        <h3 className="section-title">Results</h3>

        {resultError && <div className="error-message">{resultError}</div>}

        <ul className="viewport-list">
          <Viewport 
            title="Performance Analysis Results" 
            loading={resultLoading} 
            filters={filters}
            resultFilters={viewFilters}
            sourceData={sourceData}
            resultData={baseResultData}
            availableHeaders={availableHeaders}
            resultHeaders={baseResultHeaders}
            onRunAnalysis={handleRunAnalysis}
            resultLoading={resultLoading}
            onAddFilter={handleAddFilter}
            onRemoveFilter={handleRemoveFilter}
            onClearAllFilters={handleClearAllFilters}
            onAddResultFilter={handleAddViewFilter}
            onRemoveResultFilter={handleRemoveViewFilter}
            onClearAllResultFilters={handleClearAllViewFilters}
            onApplyResultFilters={handleApplyViewFilters}
            onRestoreResultFilters={handleRestoreViewFilters}
            resultFilterLoading={viewFilterLoading}
          >
            {displayedResults ? (
              <AnalysisResultsComponent results={displayedResults} thresholds={thresholds} />
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📈</div>
                <p>Configure analysis parameters and run to see results</p>
              </div>
            )}
          </Viewport>
        </ul>
      </div>
      </div>

        );
      })()}

      <ExcelExportPanel
        isOpen={showExcelExportPanel}
        onClose={() => setShowExcelExportPanel(false)}
        onSubmit={handleExcelExportDraft}
        availableHeaders={availableHeaders}
        sourceData={sourceData}
        analysisType={analysisType}
        currentFilters={exportFilters}
        exportLoading={excelExportLoading}
        exportProgress={excelExportProgress}
        exportStatus={excelExportStatus}
        onAddFilter={handleAddExportFilter}
        onRemoveFilter={handleRemoveExportFilter}
        onClearAllFilters={handleClearAllExportFilters}
      />
    </>
  );
}

export default AnalysisSection;
