import React from 'react';

function LoadingIndicator({ details, showSpinner = true }) {
  if (!details) return null;

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const isSuccess = details.status === 'Success!';
  const isFailed = details.status === 'Failed!';
  const isLoading = !isSuccess && !isFailed;

  return (
    <div className={`loading-indicator ${isSuccess ? 'success' : isFailed ? 'error' : 'loading'}`}>
      <div className="loading-content">
        <div className="loading-animation">
          {isLoading && showSpinner && <div className="spinner-small"></div>}
          <span className={`status-icon ${isSuccess ? 'success' : isFailed ? 'error' : ''}`}>
            {isLoading ? '⏳' : isSuccess ? '✓' : '✗'}
          </span>
        </div>

        <div className="loading-text">
          <div className="loading-status">{details.status}</div>
          <div className="loading-details">
            <span>Elapsed: {formatTime(details.elapsed)}</span>
            {details.rowsLoaded && (
              <span> • Rows loaded: {details.rowsLoaded.toLocaleString()}</span>
            )}
            {details.error && (
              <div className="loading-error">{details.error}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoadingIndicator;
