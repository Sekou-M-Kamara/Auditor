import React, { useState, useMemo } from 'react';

function RatioAnalysisForm({ onSubmit, sourceData }) {
  const [formData, setFormData] = useState({
    categoryHeader: 'Reporting Unit1 Leaf Name',
    codeHeader: 'Entry Code',
    dataFieldHeader: 'Retained Amt Base',
    grossDataFieldHeader: 'Detail Amount (Base)',
    netManagementExpenseRatio: 12
  });

  // Extract available headers from source data
  const availableHeaders = useMemo(() => {
    if (!Array.isArray(sourceData) || sourceData.length === 0) return [];
    return Object.keys(sourceData[0]);
  }, [sourceData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'netManagementExpenseRatio' ? parseFloat(value) : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const ratioValue = parseFloat(formData.netManagementExpenseRatio);
    onSubmit({
      ...formData,
      netManagementExpenseRatio: isNaN(ratioValue) ? 0 : ratioValue / 100
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="control-group">
        <label htmlFor="categoryHeader">Category Header:</label>
        <select
          id="categoryHeader"
          name="categoryHeader"
          value={formData.categoryHeader}
          onChange={handleInputChange}
        >
          <option value="">-- Select --</option>
          {availableHeaders.map((header) => (
            <option key={header} value={header}>
              {header}
            </option>
          ))}
        </select>
      </div>

      <div className="control-group">
        <label htmlFor="dataFieldHeader">Data Field Header:</label>
        <select
          id="dataFieldHeader"
          name="dataFieldHeader"
          value={formData.dataFieldHeader}
          onChange={handleInputChange}
        >
          <option value="">-- Select --</option>
          {availableHeaders.map((header) => (
            <option key={header} value={header}>
              {header}
            </option>
          ))}
        </select>
      </div>

      <div className="control-group">
        <label htmlFor="grossDataFieldHeader">Gross Data Field Header:</label>
        <select
          id="grossDataFieldHeader"
          name="grossDataFieldHeader"
          value={formData.grossDataFieldHeader}
          onChange={handleInputChange}
        >
          <option value="">-- Select --</option>
          {availableHeaders.map((header) => (
            <option key={header} value={header}>
              {header}
            </option>
          ))}
        </select>
      </div>

      <div className="control-group">
        <label htmlFor="netManagementExpenseRatio">Net Management Expense Ratio (%):</label>
        <input
          type="number"
          id="netManagementExpenseRatio"
          name="netManagementExpenseRatio"
          value={formData.netManagementExpenseRatio}
          onChange={handleInputChange}
          step="0.01"
          min="0"
          max="100"
        />
      </div>

      <button type="submit" className="btn btn-primary" style={{ marginTop: '12px' }}>
        Run Analysis
      </button>
    </form>
  );
}

export default RatioAnalysisForm;
