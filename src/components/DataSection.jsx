import React, { useState } from 'react';
import Viewport from './Viewport';
import DataPreviewTable from './DataPreviewTable';
import LoadingIndicator from './LoadingIndicator';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const apiUrl = (path) => `${API_BASE_URL}${path}`;

function DataSection({ onDataFetch, onSetLoading, onSetError, loading, error, data, dataSourceUrl, setDataSourceUrl, dataSourceType, setDataSourceType, excelSheetName, setExcelSheetName }) {
  const [loadingDetails, setLoadingDetails] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);

  const handleFetchData = async () => {
    let interval;
    let startTime;
    try {
      onSetError(null);
      onSetLoading(true);
      startTime = Date.now();

      setLoadingDetails({
        status: 'Retrieving data...',
        startTime,
        elapsed: 0
      });

      interval = setInterval(() => {
        setLoadingDetails((prev) => (prev ? {
          ...prev,
          elapsed: Date.now() - startTime
        } : prev));
      }, 100);

      let response;
      if (dataSourceType === 'excel' || dataSourceType === 'csv') {
        if (!uploadedFile) {
          throw new Error(`Please select a ${dataSourceType.toUpperCase()} file to upload`);
        }

        const formData = new FormData();
        formData.append('source', dataSourceType);
        formData.append('file', uploadedFile);
        if (dataSourceType === 'excel') {
          formData.append('sheetName', excelSheetName);
        }

        response = await fetch(apiUrl('/api/data'), {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
      } else {
        response = await fetch(apiUrl('/api/data'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: dataSourceType,
            url: dataSourceUrl,
            sheetName: dataSourceType === 'excel' ? excelSheetName : undefined
          })
        });
      }

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
      const elapsed = Date.now() - (startTime || Date.now());
      
      const errorMessage = err.message || 'Unknown error occurred';
      onSetError(errorMessage);

      setLoadingDetails({
        status: 'Failed!',
        error: errorMessage,
        elapsed
      });

      onSetLoading(false);
    } finally {
      if (interval) {
        clearInterval(interval);
      }
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
            onChange={(e) => {
              setDataSourceType(e.target.value);
              setUploadedFile(null);
            }}
            disabled={loading}
          >
            <option value="excel">Excel File</option>
            <option value="csv">CSV File</option>
            <option value="api">API Endpoint</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="data-source-url">
            {dataSourceType === 'excel' && 'Excel Upload:'}
            {dataSourceType === 'csv' && 'CSV Upload:'}
            {dataSourceType === 'api' && 'API URL:'}
          </label>
          {dataSourceType === 'api' ? (
            <input
              id="data-source-url"
              type="text"
              value={dataSourceUrl}
              onChange={(e) => setDataSourceUrl(e.target.value)}
              disabled={loading}
              placeholder="https://api.example.com/data"
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                width: '100%',
                fontSize: '14px'
              }}
            />
          ) : (
            <input
              id="data-source-url"
              type="file"
              accept={dataSourceType === 'excel' ? '.xlsx,.xls' : '.csv'}
              disabled={loading}
              onChange={(e) => {
                const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                setUploadedFile(file);
              }}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                width: '100%',
                fontSize: '14px'
              }}
            />
          )}
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
