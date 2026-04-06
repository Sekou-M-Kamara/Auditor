import React, { useState } from 'react';
import Viewport from './Viewport';
import DataPreviewTable from './DataPreviewTable';
import LoadingIndicator from './LoadingIndicator';

function DataSection({ onDataFetch, onSetLoading, onSetError, loading, error, data, dataSourceUrl, setDataSourceUrl, dataSourceType, setDataSourceType, excelSheetName, setExcelSheetName }) {
  const [loadingDetails, setLoadingDetails] = useState(null);

  const handleFetchData = async () => {
    try {
      onSetError(null);
      onSetLoading(true);
      const startTime = Date.now();

      setLoadingDetails({
        status: 'Retrieving data...',
        startTime,
        elapsed: 0
      });

      const interval = setInterval(() => {
        setLoadingDetails((prev) => (prev ? {
          ...prev,
          elapsed: Date.now() - startTime
        } : prev));
      }, 100);

      const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          source: dataSourceType,
          url: dataSourceUrl,
          sheetName: dataSourceType === 'excel' ? excelSheetName : undefined
        })
      });

      clearInterval(interval);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      setLoadingDetails((prev) => (prev ? {
        ...prev,
        status: 'Processing data...'
      } : prev));

      const result = await response.json();

      if (result.status === 'error') {
        throw new Error(result.message || 'Unknown error from server');
      }

      const elapsed = Date.now() - startTime;
      setLoadingDetails({
        status: 'Success!',
        startTime,
        elapsed,
        rowsLoaded: result.metadata?.rows || 0
      });

      // Extract the data array from the API response
      onDataFetch(result.data);

      setTimeout(() => {
        setLoadingDetails(null);
        onSetLoading(false);
      }, 2000);
    } catch (err) {
      console.error('Data fetch error:', err);
      const elapsed = Date.now() - (loadingDetails?.startTime || Date.now());
      
      const errorMessage = err.message || 'Unknown error occurred';
      onSetError(errorMessage);

      setLoadingDetails({
        status: 'Failed!',
        error: errorMessage,
        elapsed
      });

      onSetLoading(false);
    }
  };

  return (
    <div className="data-section">
      <h2 className="section-title">Data Input & Preview</h2>

      <div className="data-controls">
        <div className="form-group">
          <label htmlFor="data-source">Data Source Connector:</label>
          <select
            id="data-source"
            value={dataSourceType}
            onChange={(e) => setDataSourceType(e.target.value)}
            disabled={loading}
          >
            <option value="excel">Excel File</option>
            <option value="csv">CSV File</option>
            <option value="api">API Endpoint</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="data-source-url">
            {dataSourceType === 'excel' && 'Excel File Path:'}
            {dataSourceType === 'csv' && 'CSV File Path:'}
            {dataSourceType === 'api' && 'API URL:'}
          </label>
          <input
            id="data-source-url"
            type="text"
            value={dataSourceUrl}
            onChange={(e) => setDataSourceUrl(e.target.value)}
            disabled={loading}
            placeholder={dataSourceType === 'excel' ? 'C:/path/to/file.xlsx' : dataSourceType === 'csv' ? 'C:/path/to/file.csv' : 'https://api.example.com/data'}
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              width: '100%',
              fontSize: '14px'
            }}
          />
        </div>

        {dataSourceType === 'excel' && (
          <div className="form-group">
            <label htmlFor="sheet-name">Sheet Name:</label>
            <input
              id="sheet-name"
              type="text"
              value={excelSheetName}
              onChange={(e) => setExcelSheetName(e.target.value)}
              disabled={loading}
              placeholder="e.g., Detailed, Sheet1"
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                width: '100%',
                fontSize: '14px'
              }}
            />
          </div>
        )}

        <button 
          className="btn btn-primary" 
          onClick={handleFetchData}
          disabled={loading}
          style={{ opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Loading...' : 'Load Data'}
        </button>
      </div>

      {loadingDetails && <LoadingIndicator details={loadingDetails} showSpinner={false} />}
      {error && <div className="error-message">❌ {error}</div>}

      <ul className="viewport-list">
        <Viewport title="Data Preview" loading={loading} collapsible={true}>
          {data && Array.isArray(data) && data.length > 0 ? (
            <DataPreviewTable data={data} />
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <p>{loading ? 'Loading data...' : 'Select a data source and click "Load Data" to begin'}</p>
            </div>
          )}
        </Viewport>
      </ul>
    </div>
  );
}

export default DataSection;
