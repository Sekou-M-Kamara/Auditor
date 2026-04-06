import React, { useMemo } from 'react';

function RatioAnalysisResults({ results, thresholds = {}, thresholdsEnabled = true, activeViewFilters = [] }) {

  if (!results) {
    return (
      <div className="empty-state">
        <p>No results available</p>
      </div>
    );
  }

  // Handle both direct array and object with data property
  const resultsData = Array.isArray(results) ? results : results.data || [];

  if (!Array.isArray(resultsData) || resultsData.length === 0) {
    return (
      <div className="empty-state">
        <p>No analysis results to display</p>
      </div>
    );
  }

  // Extract columns from metadata if available, otherwise from data
  const columns = useMemo(() => {
    if (results.metadata && results.metadata.columns) {
      return results.metadata.columns;
    }
    return Object.keys(resultsData[0]);
  }, [results, resultsData]);

  const ratioColumns = [
    'Loss Ratio',
    'Commission Ratio',
    'Net Management Expense Ratio',
    'Net Technical Margin Ratio',
    'Net Retro Expense Ratio',
    'Combined Ratio'
  ];

  const configuredCategoryHeader = useMemo(() => {
    const metadataParams = results?.metadata?.params || {};
    return metadataParams.categoryHeader || metadataParams.category_header || null;
  }, [results]);

  // Keep all columns including category column
  const displayColumns = columns.filter(col => col !== '');
  const categoryColumn = useMemo(() => {
    if (configuredCategoryHeader && displayColumns.includes(configuredCategoryHeader)) {
      return configuredCategoryHeader;
    }

    const conventionalCategoryColumn = displayColumns.find(
      (col) => col.includes('Reporting Unit') || col.includes('Type of Business') || col === 'Category'
    );
    if (conventionalCategoryColumn) return conventionalCategoryColumn;

    // Fallback for filtered/cached payloads: first non-ratio column is typically the category dimension.
    const firstNonRatioColumn = displayColumns.find((col) => !ratioColumns.includes(col));
    return firstNonRatioColumn || null;
  }, [configuredCategoryHeader, displayColumns, ratioColumns]);

  const isRatioColumn = (col) => ratioColumns.includes(col);
  const isCategoryColumn = (col) => {
    if (!col) return false;
    if (categoryColumn && col === categoryColumn) return true;
    return false;
  };
  const isTotalRow = (idx) => idx === resultsData.length - 1;

  // Parse ratio value for comparison
  const parseRatioValue = (value) => {
    if (typeof value === 'number') return value;
    const str = String(value).trim();
    if (str.includes('%')) {
      return parseFloat(str) / 100;
    }
    return parseFloat(str);
  };

  // Check if cell should be highlighted based on threshold
  const shouldHighlightCell = (col, value, rowIndex) => {
    if (!thresholdsEnabled) return false;
    if (!isRatioColumn(col) || !thresholds[col]) return false;
    if (rowIndex === resultsData.length - 1) return false; // Don't highlight total row

    const threshold = thresholds[col];
    const cellValue = parseRatioValue(value);
    const thresholdValue = parseFloat(threshold.value);

    if (isNaN(cellValue) || isNaN(thresholdValue)) return false;

    // Highlight (turn red) when condition IS MET
    switch (threshold.condition) {
      case 'atleast':
        return cellValue >= thresholdValue;  // Condition met: value is at least the threshold
      case 'atmost':
        return cellValue <= thresholdValue;  // Condition met: value is at most the threshold
      case 'equal':
        return Math.abs(cellValue - thresholdValue) <= 0.0001;  // Condition met: value equals threshold
      default:
        return false;
    }
  };

  return (
    <div>
      <div style={{ 
        width: '100%', 
        overflowX: 'auto',
        overflowY: 'visible'
      }}>
        <table className="data-table" style={{ minWidth: 'max-content' }}>
          <thead>
            <tr>
              {displayColumns.map((col) => {
                const isRatio = isRatioColumn(col);
                const isCategory = isCategoryColumn(col);
                return (
                  <th key={col} style={{ 
                    textAlign: isRatio ? 'right' : 'left',
                    backgroundColor: isCategory ? '#e3f2fd' : isRatio ? '#f0e6ff' : '#f9f9f9',
                    fontWeight: isCategory ? 'bold' : 'normal',
                    minWidth: isCategory ? '200px' : 'auto'
                  }}>
                    {col}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {resultsData.map((row, idx) => (
              <tr key={idx} style={isTotalRow(idx) ? { fontWeight: 'bold', backgroundColor: '#f5f5f5' } : {}}>
                {displayColumns.map((col) => {
                  const value = row[col];
                  const isRatio = isRatioColumn(col);
                  const isCategory = isCategoryColumn(col);
                  const isTotal = isTotalRow(idx);
                  const shouldHighlight = shouldHighlightCell(col, value, idx);

                  return (
                    <td
                      key={`${idx}-${col}`}
                      style={{
                        textAlign: isRatio ? 'right' : 'left',
                        backgroundColor: shouldHighlight ? '#ffcccc' : (isCategory ? '#f5f9ff' : (isTotal && isRatio ? '#f0e6ff' : (isRatio ? '#fafafa' : 'transparent'))),
                        color: shouldHighlight ? '#d32f2f' : 'inherit',
                        fontWeight: isCategory ? '500' : 'normal'
                      }}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ margin: '15px 0', fontSize: '12px', color: '#999' }}>
        <p>• Negative amounts displayed in parentheses</p>
        <p>• Last row shows totals and aggregate ratios</p>
        <p>• Use "Configure Thresholds" button to set conditions for highlighting</p>
      </div>
    </div>
  );
}

export default RatioAnalysisResults;
