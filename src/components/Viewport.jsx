import React, { useEffect, useState } from 'react';

function Viewport({ 
  title, 
  children, 
  loading = false, 
  filters = [],
  resultFilters = [],
  sourceData = null,
  resultData = null,
  availableHeaders = [],
  resultHeaders = [],
  onRunAnalysis = null,
  resultLoading = false,
  collapsible = false,
  onAddFilter = null,
  onRemoveFilter = null,
  onClearAllFilters = null,
  onAddResultFilter = null,
  onRemoveResultFilter = null,
  onClearAllResultFilters = null,
  onApplyResultFilters = null,
  onRestoreResultFilters = null,
  resultFilterLoading = false
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showFilterConfigInFullscreen, setShowFilterConfigInFullscreen] = useState(false);
  const [showResultFilterConfigInFullscreen, setShowResultFilterConfigInFullscreen] = useState(false);
  const [newFilterHeader, setNewFilterHeader] = useState('');
  const [newFilterItem, setNewFilterItem] = useState('');
  const [newFilterOperation, setNewFilterOperation] = useState('Equal');
  const [newResultFilterHeader, setNewResultFilterHeader] = useState('');
  const [newResultFilterItem, setNewResultFilterItem] = useState('');
  const [newResultFilterOperation, setNewResultFilterOperation] = useState('Equal');

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setShowFilterConfigInFullscreen(false);
    setShowResultFilterConfigInFullscreen(false);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Get unique values for selected header (preserve types from source)
  const filterItemsForHeader = React.useMemo(() => {
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
  const isNumericColumn = React.useCallback((columnName) => {
    if (!Array.isArray(sourceData) || sourceData.length === 0) return false;
    
    // Check if all non-null values in the column can be parsed as numbers
    const values = sourceData
      .map(row => row[columnName])
      .filter(val => val != null && val !== '');
    
    if (values.length === 0) return false;
    
    // If all values can be parsed as numbers, it's a numeric column
    return values.every(val => !isNaN(parseFloat(val)));
  }, [sourceData]);

  // Determine operations based on column type
  const getOperationsForColumn = React.useCallback((columnName) => {
    if (isNumericColumn(columnName)) {
      return ['Equal', 'Atlest', 'Atmost'];
    }
    return ['Equal'];
  }, [isNumericColumn]);

  const availableOperations = React.useMemo(() => {
    if (!newFilterHeader) return [];
    return getOperationsForColumn(newFilterHeader);
  }, [newFilterHeader, getOperationsForColumn]);

  const resultFilterItemsForHeader = React.useMemo(() => {
    if (!newResultFilterHeader || !Array.isArray(resultData) || resultData.length === 0) return [];
    const uniqueValues = [...new Set(resultData.map(row => row[newResultFilterHeader]).filter(val => val != null))];

    return uniqueValues.sort((a, b) => {
      const typeA = typeof a;
      const typeB = typeof b;

      if (typeA === 'number' && typeB === 'number') {
        return a - b;
      }
      if (typeA === 'string' && typeB === 'string') {
        return a.localeCompare(b);
      }
      return typeA === 'number' ? -1 : 1;
    });
  }, [newResultFilterHeader, resultData]);

  const isResultNumericColumn = React.useCallback((columnName) => {
    if (!Array.isArray(resultData) || resultData.length === 0) return false;

    const values = resultData
      .map(row => row[columnName])
      .filter(val => val != null && val !== '');

    if (values.length === 0) return false;
    return values.every(val => !isNaN(parseFloat(val)));
  }, [resultData]);

  const resultAvailableOperations = React.useMemo(() => {
    if (!newResultFilterHeader) return [];
    if (resultHeaders[0] && newResultFilterHeader === resultHeaders[0]) return ['Equal'];
    return isResultNumericColumn(newResultFilterHeader) ? ['Equal', 'Atlest', 'Atmost'] : ['Equal'];
  }, [newResultFilterHeader, isResultNumericColumn, resultHeaders]);

  const handleRefreshAnalysis = () => {
    if (onRunAnalysis) {
      onRunAnalysis();
    }
  };

  // Convert filter value to appropriate type based on column
  const convertFilterValue = React.useCallback((columnName, value) => {
    if (isNumericColumn(columnName)) {
      const numValue = parseFloat(value);
      return isNaN(numValue) ? value : numValue;
    }
    return value;
  }, [isNumericColumn]);

  const handleAddFilterInFullscreen = () => {
    if (onAddFilter && newFilterHeader && newFilterItem) {
      // Convert filter value to appropriate type
      const convertedValue = convertFilterValue(newFilterHeader, newFilterItem);
      onAddFilter([newFilterHeader, convertedValue, newFilterOperation]);
      setNewFilterHeader('');
      setNewFilterItem('');
      setNewFilterOperation('Equal');
    }
  };

  const handleAddResultFilterInFullscreen = () => {
    if (onAddResultFilter && newResultFilterHeader && newResultFilterItem) {
      const convertedValue = (resultHeaders[0] && newResultFilterHeader === resultHeaders[0])
        ? newResultFilterItem
        : isResultNumericColumn(newResultFilterHeader)
        ? (() => {
            const parsed = parseFloat(newResultFilterItem);
            return isNaN(parsed) ? newResultFilterItem : parsed;
          })()
        : newResultFilterItem;

      onAddResultFilter([newResultFilterHeader, convertedValue, newResultFilterOperation]);
      setNewResultFilterHeader('');
      setNewResultFilterItem('');
      setNewResultFilterOperation('Equal');
    }
  };

  return (
    <>
      {isFullscreen && <div className="fullscreen-overlay" onClick={toggleFullscreen} />}
      <li className={`viewport-item ${isFullscreen ? 'fullscreen' : ''}`}>
        <div className="viewport-header">
          <div className="viewport-title">{title}</div>
          {isFullscreen && filters.length > 0 && (
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap',
              gap: '6px',
              alignItems: 'center',
              flex: 1,
              marginLeft: '20px',
              marginRight: '20px',
              backgroundColor: '#fff3cd',
              padding: '8px 12px',
              borderRadius: '4px',
              border: '2px solid #ffc107'
            }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#856404' }}>🔍 Active Filters:</span>
              {filters.map((filter, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#e7f3ff',
                    border: '1px solid #91d5ff',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    color: '#0050b3',
                    fontWeight: '500'
                  }}
                >
                  <span>
                    {filter[0]} {filter[2] === 'Equal' ? '=' : filter[2] === 'Atlest' ? '≥' : '≤'} {filter[1]}
                  </span>
                  <button
                    onClick={() => onRemoveFilter && onRemoveFilter(idx)}
                    disabled={!onRemoveFilter}
                    style={{
                      padding: '0px 4px',
                      backgroundColor: 'transparent',
                      color: '#0050b3',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: onRemoveFilter ? 'pointer' : 'not-allowed',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      lineHeight: '1'
                    }}
                    title="Remove filter"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => onClearAllFilters && onClearAllFilters()}
                disabled={!onClearAllFilters}
                style={{
                  marginLeft: 'auto',
                  padding: '4px 10px',
                  backgroundColor: '#ffebee',
                  color: '#c62828',
                  border: '1px solid #ef5350',
                  borderRadius: '3px',
                  cursor: onClearAllFilters ? 'pointer' : 'not-allowed',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
                title="Clear all filters"
              >
                Clear All ✕
              </button>
            </div>
          )}
          {isFullscreen && resultFilters.length > 0 && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              alignItems: 'center',
              flex: 1,
              marginLeft: '20px',
              marginRight: '20px',
              backgroundColor: '#fff3cd',
              padding: '8px 12px',
              borderRadius: '4px',
              border: '2px solid #ffc107'
            }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#856404' }}>🔍 Active Filters:</span>
              {resultFilters.map((filter, idx) => (
                <div
                  key={`${filter[0]}-${filter[1]}-${idx}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#e7f3ff',
                    border: '1px solid #91d5ff',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    color: '#0050b3',
                    fontWeight: '500'
                  }}
                >
                  <span>
                    {filter[0]} {filter[2] === 'Equal' ? '=' : filter[2] === 'Atlest' ? '≥' : '≤'} {filter[1]}
                  </span>
                  <button
                    onClick={() => onRemoveResultFilter && onRemoveResultFilter(idx)}
                    disabled={!onRemoveResultFilter}
                    style={{
                      padding: '0px 4px',
                      backgroundColor: 'transparent',
                      color: '#0050b3',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: onRemoveResultFilter ? 'pointer' : 'not-allowed',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      lineHeight: '1'
                    }}
                    title="Remove filter"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => onClearAllResultFilters && onClearAllResultFilters()}
                disabled={!onClearAllResultFilters}
                style={{
                  marginLeft: 'auto',
                  padding: '4px 10px',
                  backgroundColor: '#ffebee',
                  color: '#c62828',
                  border: '1px solid #ef5350',
                  borderRadius: '3px',
                  cursor: onClearAllResultFilters ? 'pointer' : 'not-allowed',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
                title="Clear all filters"
              >
                Clear All ✕
              </button>
            </div>
          )}
          <div className="viewport-controls">
            {collapsible && (
              <button
                className="btn-icon"
                onClick={toggleCollapse}
                title={isCollapsed ? "Expand" : "Collapse"}
                aria-label={isCollapsed ? "Expand" : "Collapse"}
                style={{ marginRight: '8px' }}
              >
                {isCollapsed ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                )}
              </button>
            )}
            {isFullscreen && sourceData && (
              <button
                className="btn-icon"
                onClick={() => setShowFilterConfigInFullscreen(!showFilterConfigInFullscreen)}
                title="Configure Filters"
                aria-label="Configure Filters"
                style={{ marginRight: '8px' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-.293.707l-6.414 6.414a1 1 0 0 0-.293.707v4.586a1 1 0 0 1-1.414.914l-4-2.667a1 1 0 0 1-.293-.914v-1.919a1 1 0 0 0-.293-.707L3.293 8.707A1 1 0 0 1 3 8V6z" />
                </svg>
              </button>
            )}
            {isFullscreen && Array.isArray(resultData) && resultData.length > 0 && (
              <button
                className="btn-icon"
                onClick={() => setShowResultFilterConfigInFullscreen(!showResultFilterConfigInFullscreen)}
                title="Configure View Filters"
                aria-label="Configure View Filters"
                style={{ marginRight: '8px' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v8" />
                  <path d="M8 12h8" />
                </svg>
              </button>
            )}
            <button
              className="btn-icon"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {isFullscreen && showFilterConfigInFullscreen && sourceData && (
          <div style={{
            position: 'fixed',
            top: '70px',
            right: '20px',
            width: '400px',
            maxHeight: '70vh',
            overflowY: 'auto',
            padding: '15px',
            backgroundColor: '#f0f8ff',
            border: '2px solid #28a745',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: '1000'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, color: '#28a745' }}>Add Filter</h4>
              <button
                onClick={() => setShowFilterConfigInFullscreen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#28a745',
                  padding: '0px 4px'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '10px',
              marginBottom: '15px'
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
                onClick={handleAddFilterInFullscreen}
                disabled={!onAddFilter || !newFilterHeader || !newFilterItem}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: onAddFilter && newFilterHeader && newFilterItem ? 'pointer' : 'not-allowed',
                  fontSize: '12px'
                }}
              >
                Add Filter
              </button>

              <button
                onClick={handleRefreshAnalysis}
                disabled={!onRunAnalysis || resultLoading}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: onRunAnalysis && !resultLoading ? 'pointer' : 'not-allowed',
                  fontSize: '12px'
                }}
              >
                Refresh Analysis
              </button>
            </div>
          </div>
        )}

        {isFullscreen && showResultFilterConfigInFullscreen && Array.isArray(resultData) && (
          <div style={{
            position: 'fixed',
            top: '70px',
            right: '440px',
            width: '400px',
            maxHeight: '70vh',
            overflowY: 'auto',
            padding: '15px',
            backgroundColor: '#f0f8ff',
            border: '2px solid #28a745',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: '1000'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, color: '#28a745' }}>Add Filter</h4>
              <button
                onClick={() => setShowResultFilterConfigInFullscreen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#28a745',
                  padding: '0px 4px'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '10px',
              marginBottom: '15px'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                  Column:
                </label>
                <select
                  value={newResultFilterHeader}
                  onChange={(e) => {
                    setNewResultFilterHeader(e.target.value);
                    setNewResultFilterItem('');
                    if (resultHeaders[0] && e.target.value === resultHeaders[0]) {
                      setNewResultFilterOperation('Equal');
                    } else {
                      setNewResultFilterOperation('Equal');
                    }
                  }}
                  style={{
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    width: '100%'
                  }}
                >
                  <option value="">-- Select Header --</option>
                  {resultHeaders.map((header) => (
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
                {resultHeaders[0] && newResultFilterHeader === resultHeaders[0] ? (
                  <select
                    value={newResultFilterItem}
                    onChange={(e) => setNewResultFilterItem(e.target.value)}
                    disabled={!newResultFilterHeader}
                    style={{
                      padding: '6px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      width: '100%'
                    }}
                  >
                    <option value="">-- Select Value --</option>
                    {resultFilterItemsForHeader.map((item) => (
                      <option key={String(item)} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    value={newResultFilterItem}
                    onChange={(e) => setNewResultFilterItem(e.target.value)}
                    disabled={!newResultFilterHeader}
                    step="any"
                    style={{
                      padding: '6px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      width: '100%'
                    }}
                    placeholder="Enter numeric value"
                  />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                  Operation:
                </label>
                <select
                  value={newResultFilterOperation}
                  onChange={(e) => setNewResultFilterOperation(e.target.value)}
                  disabled={!newResultFilterItem}
                  style={{
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    width: '100%'
                  }}
                >
                  {resultAvailableOperations.map((op) => (
                    <option key={op} value={op}>
                      {op === 'Equal' ? '=' : op === 'Atlest' ? '≥' : '≤'}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAddResultFilterInFullscreen}
                disabled={!onAddResultFilter || !newResultFilterHeader || !newResultFilterItem}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: onAddResultFilter && newResultFilterHeader && newResultFilterItem ? 'pointer' : 'not-allowed',
                  fontSize: '12px'
                }}
              >
                Add Filter
              </button>

              {resultFilterLoading && (
                <div style={{ color: '#0050b3', fontSize: '12px', fontWeight: 'bold' }}>
                  Applying filter...
                </div>
              )}
            </div>
          </div>
        )}

        <div className="viewport-content">
          {!isCollapsed && (
            loading ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <span>Loading...</span>
              </div>
            ) : (
              children
            )
          )}
          {isCollapsed && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
              <p>Content collapsed</p>
            </div>
          )}
        </div>
      </li>
    </>
  );
}

export default Viewport;
