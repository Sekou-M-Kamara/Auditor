import React, { useState, useMemo } from 'react';

function DataPreviewTable({ data }) {
  const [displayLimit, setDisplayLimit] = useState(10);

  const displayData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.slice(0, displayLimit);
  }, [data, displayLimit]);

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📭</div>
        <p>No data available</p>
      </div>
    );
  }

  const columns = Array.isArray(data) && data.length > 0
    ? Object.keys(data[0])
    : [];

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayData.map((row, idx) => (
            <tr key={idx}>
              {columns.map((col) => (
                <td key={`${idx}-${col}`}>
                  {String(row[col] || '').substring(0, 100)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {Array.isArray(data) && data.length > displayLimit && (
        <div style={{ padding: '15px', textAlign: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={() => setDisplayLimit((prev) => prev + 10)}
          >
            Load More ({displayData.length} of {data.length})
          </button>
        </div>
      )}
    </div>
  );
}

export default DataPreviewTable;
