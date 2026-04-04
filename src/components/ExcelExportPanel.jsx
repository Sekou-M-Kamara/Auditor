import React, { useEffect, useMemo, useState } from 'react';

function ExcelExportPanel({
  isOpen,
  onClose,
  onSubmit,
  availableHeaders,
  sourceData,
  analysisType,
  currentFilters = [],
  exportLoading = false,
  exportProgress = { current: 0, total: 0 },
  exportStatus = { state: 'idle', message: '' },
  onAddFilter,
  onRemoveFilter,
  onClearAllFilters
}) {
  const [formData, setFormData] = useState({
    dataFieldHeader: 'Retained Amt Base',
    grossDataFieldHeader: 'Detail Amount (Base)',
    netManagementExpenseRatio: 12,
    oneSheet: true,
    workbookName: '',
    categoryBundle: []
  });
  const [categorySearch, setCategorySearch] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [newFilterHeader, setNewFilterHeader] = useState('');
  const [newFilterItem, setNewFilterItem] = useState('');
  const [newFilterOperation, setNewFilterOperation] = useState('Equal');

  useEffect(() => {
    if (!isOpen) return;

    setFormData((prev) => {
      const safeDataHeader =
        availableHeaders.includes(prev.dataFieldHeader)
          ? prev.dataFieldHeader
          : availableHeaders[0] || '';
      const safeGrossHeader =
        availableHeaders.includes(prev.grossDataFieldHeader)
          ? prev.grossDataFieldHeader
          : availableHeaders[0] || '';

      return {
        ...prev,
        dataFieldHeader: safeDataHeader,
        grossDataFieldHeader: safeGrossHeader,
        categoryBundle: prev.categoryBundle.filter((header) => availableHeaders.includes(header))
      };
    });
  }, [isOpen, availableHeaders]);

  const filteredHeaders = useMemo(() => {
    const term = categorySearch.trim().toLowerCase();
    if (!term) return availableHeaders;
    return availableHeaders.filter((header) => header.toLowerCase().includes(term));
  }, [availableHeaders, categorySearch]);

  const filterItemsForHeader = useMemo(() => {
    if (!newFilterHeader || !Array.isArray(sourceData) || sourceData.length === 0) return [];
    const uniqueValues = [...new Set(sourceData.map((row) => row[newFilterHeader]).filter((val) => val != null))];

    return uniqueValues.sort((a, b) => {
      const typeA = typeof a;
      const typeB = typeof b;

      if (typeA === 'number' && typeB === 'number') return a - b;
      if (typeA === 'string' && typeB === 'string') return a.localeCompare(b);
      return typeA === 'number' ? -1 : 1;
    });
  }, [newFilterHeader, sourceData]);

  const isNumericColumn = (columnName) => {
    if (!Array.isArray(sourceData) || sourceData.length === 0) return false;

    const values = sourceData
      .map((row) => row[columnName])
      .filter((val) => val != null && val !== '');

    if (values.length === 0) return false;
    return values.every((val) => !isNaN(parseFloat(val)));
  };

  const availableOperations = useMemo(() => {
    if (!newFilterHeader) return [];
    return isNumericColumn(newFilterHeader) ? ['Equal', 'Atlest', 'Atmost'] : ['Equal'];
  }, [newFilterHeader, sourceData]);

  const selectedCount = formData.categoryBundle.length;
  const totalCount = availableHeaders.length;
  const selectionRatio = totalCount === 0 ? 0 : Math.round((selectedCount / totalCount) * 100);

  const updateFormValue = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryHeaderToggle = (headerName) => {
    setFormData((prev) => {
      const exists = prev.categoryBundle.includes(headerName);
      if (exists) {
        return {
          ...prev,
          categoryBundle: prev.categoryBundle.filter((item) => item !== headerName)
        };
      }
      return {
        ...prev,
        categoryBundle: [...prev.categoryBundle, headerName]
      };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (exportLoading) return;
    const ratioValue = parseFloat(formData.netManagementExpenseRatio);
    onSubmit({
      analysisType,
      category_header: formData.categoryBundle[0] || '',
      data_field_header: formData.dataFieldHeader,
      gross_data_field_header: formData.grossDataFieldHeader,
      net_management_expense_ratio: isNaN(ratioValue) ? 0 : ratioValue / 100,
      oneSheet: formData.oneSheet,
      workbook_name: formData.workbookName?.trim() || '',
      categoryBundle: formData.categoryBundle,
      filterArray: currentFilters
    });
  };

  const handleAddFilterClick = () => {
    if (!newFilterHeader || !newFilterItem || typeof onAddFilter !== 'function') return;

    const convertedValue = isNumericColumn(newFilterHeader)
      ? (() => {
          const parsed = parseFloat(newFilterItem);
          return isNaN(parsed) ? newFilterItem : parsed;
        })()
      : newFilterItem;

    onAddFilter([newFilterHeader, convertedValue, newFilterOperation]);
    setNewFilterHeader('');
    setNewFilterItem('');
    setNewFilterOperation('Equal');
  };

  if (!isOpen) return null;

  const currentProgressHeader =
    exportLoading && exportProgress.current > 0 && formData.categoryBundle.length > 0
      ? formData.categoryBundle[Math.max(0, Math.min(exportProgress.current - 1, formData.categoryBundle.length - 1))]
      : null;

  return (
    <div className="excel-export-overlay" onClick={onClose}>
      <div className="excel-export-panel" onClick={(event) => event.stopPropagation()}>
        <div className="excel-export-panel-header">
          <div>
            <h3>Excel Output Builder</h3>
            <p>You can select multiples headers.</p>
          </div>
          <div className="excel-header-actions">
            <button
              type="button"
              className="excel-filter-toggle"
              onClick={() => setShowFilterPanel((prev) => !prev)}
              aria-label="Toggle filter panel"
              title="Configure filters"
            >
              🔍
            </button>
            <button type="button" className="excel-close-btn" onClick={onClose} aria-label="Close panel">
              x
            </button>
          </div>
        </div>

        <form className="excel-export-form" onSubmit={handleSubmit}>
          <div className="excel-grid">
            <div className="control-group">
              <label htmlFor="export-analysis-type">Analysis Type</label>
              <input id="export-analysis-type" value={analysisType} disabled />
            </div>

            <div className="control-group">
              <label htmlFor="export-data-header">Data Field Header</label>
              <select
                id="export-data-header"
                value={formData.dataFieldHeader}
                onChange={(event) => updateFormValue('dataFieldHeader', event.target.value)}
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
              <label htmlFor="export-gross-header">Gross Data Field Header</label>
              <select
                id="export-gross-header"
                value={formData.grossDataFieldHeader}
                onChange={(event) => updateFormValue('grossDataFieldHeader', event.target.value)}
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
              <label htmlFor="export-management-ratio">Net Management Expense Ratio (%)</label>
              <input
                id="export-management-ratio"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.netManagementExpenseRatio}
                onChange={(event) => updateFormValue('netManagementExpenseRatio', event.target.value)}
              />
            </div>

            <div className="control-group">
              <label htmlFor="export-sheet-mode">Sheet Layout</label>
              <select
                id="export-sheet-mode"
                value={formData.oneSheet ? 'single' : 'multiple'}
                onChange={(event) => updateFormValue('oneSheet', event.target.value === 'single')}
              >
                <option value="single">Single sheet (all selected category headers)</option>
                <option value="multiple">Separate sheet per selected category header</option>
              </select>
            </div>

            <div className="control-group">
              <label htmlFor="export-workbook-name">Excel Workbook Name (Optional)</label>
              <input
                id="export-workbook-name"
                type="text"
                value={formData.workbookName}
                onChange={(event) => updateFormValue('workbookName', event.target.value)}
                placeholder={`${analysisType}_analysis_export.xlsx`}
              />
              <small style={{ color: '#5c6674' }}>
                Optional. If left empty, the default naming convention is used.
              </small>
            </div>
          </div>

          <div className="excel-filter-indicator" aria-label="Current filter state">
            <span className="excel-filter-icon">🔍</span>
            <span>{currentFilters.length} active filter{currentFilters.length === 1 ? '' : 's'} will be sent with this export</span>
          </div>

          {showFilterPanel && (
            <div className="excel-filter-panel">
              <h4>Filter Configuration</h4>
              <div className="excel-filter-grid">
                <div className="control-group">
                  <label htmlFor="excel-filter-header">Column</label>
                  <select
                    id="excel-filter-header"
                    value={newFilterHeader}
                    onChange={(event) => {
                      setNewFilterHeader(event.target.value);
                      setNewFilterItem('');
                      setNewFilterOperation('Equal');
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

                <div className="control-group">
                  <label htmlFor="excel-filter-item">Value</label>
                  <select
                    id="excel-filter-item"
                    value={newFilterItem}
                    onChange={(event) => setNewFilterItem(event.target.value)}
                    disabled={!newFilterHeader}
                  >
                    <option value="">-- Select Value --</option>
                    {filterItemsForHeader.map((item) => (
                      <option key={String(item)} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="control-group">
                  <label htmlFor="excel-filter-op">Operation</label>
                  <select
                    id="excel-filter-op"
                    value={newFilterOperation}
                    onChange={(event) => setNewFilterOperation(event.target.value)}
                    disabled={!newFilterItem}
                  >
                    {availableOperations.map((op) => (
                      <option key={op} value={op}>
                        {op === 'Equal' ? '=' : op === 'Atlest' ? '≥' : '≤'}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="btn btn-primary excel-filter-add-btn"
                  onClick={handleAddFilterClick}
                  disabled={!newFilterHeader || !newFilterItem}
                >
                  Add Filter
                </button>
              </div>
            </div>
          )}

          <div className="excel-filter-status-bar">
            {currentFilters.length === 0 ? (
              <div className="excel-filter-status-empty">No filters applied</div>
            ) : (
              <>
                <div className="excel-filter-status-list">
                  {currentFilters.map((filter, index) => (
                    <div key={`${filter[0]}-${filter[1]}-${index}`} className="excel-filter-status-pill">
                      <span>
                        <strong>{filter[0]}</strong> {filter[2] === 'Equal' ? '=' : filter[2] === 'Atlest' ? '≥' : '≤'} <strong>{filter[1]}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => typeof onRemoveFilter === 'function' && onRemoveFilter(index)}
                        aria-label="Remove filter"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn excel-secondary-btn"
                  onClick={() => typeof onClearAllFilters === 'function' && onClearAllFilters()}
                >
                  Clear All Filters
                </button>
              </>
            )}
          </div>

          <div className="excel-category-card">
            <div className="excel-category-headline">
              <h4>Category Header</h4>
              <span>{selectedCount} selected</span>
            </div>

            <div className="excel-selection-meter" role="progressbar" aria-valuenow={selectionRatio} aria-valuemin="0" aria-valuemax="100">
              <div className="excel-selection-fill" style={{ width: `${selectionRatio}%` }} />
            </div>

            <div className="excel-selected-strip" aria-live="polite">
              {selectedCount === 0 ? (
                <span className="excel-empty-pill">No category headers selected yet</span>
              ) : (
                formData.categoryBundle.map((header) => (
                  <span key={header} className="excel-selected-pill">
                    {header}
                  </span>
                ))
              )}
            </div>

            <div className="excel-category-actions">
              <input
                type="text"
                placeholder="Search category headers"
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
              />
              <button
                type="button"
                className="btn excel-secondary-btn"
                onClick={() => updateFormValue('categoryBundle', [...availableHeaders])}
                disabled={availableHeaders.length === 0}
              >
                Select all
              </button>
              <button
                type="button"
                className="btn excel-secondary-btn"
                onClick={() => updateFormValue('categoryBundle', [])}
                disabled={selectedCount === 0}
              >
                Clear
              </button>
            </div>

            <div className="excel-category-grid">
              {filteredHeaders.length === 0 ? (
                <p className="excel-category-empty">No category headers match your search.</p>
              ) : (
                filteredHeaders.map((header) => {
                  const checked = formData.categoryBundle.includes(header);
                  return (
                    <label key={header} className={`excel-category-item ${checked ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleCategoryHeaderToggle(header)}
                      />
                      <span>{header}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="excel-footer">
            <div className="excel-footer-status">
              {exportLoading ? (
                <>
                  <div className="excel-inline-progress-track">
                    <div
                      className="excel-inline-progress-fill"
                      style={{ width: `${exportProgress.total > 0 ? Math.round((exportProgress.current / exportProgress.total) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="excel-inline-progress-fraction">
                    {exportProgress.current}/{exportProgress.total}
                  </span>
                  {currentProgressHeader && (
                    <span className="excel-export-progress-label">{currentProgressHeader}</span>
                  )}
                </>
              ) : (
                <span className={`excel-footer-status-text ${exportStatus.state}`}>
                  {exportStatus.state === 'success'
                    ? 'Export complete'
                    : exportStatus.state === 'error'
                      ? 'Export failed, review settings and retry'
                      : `Ready to export ${selectedCount} selected header${selectedCount === 1 ? '' : 's'}`}
                </span>
              )}
            </div>

            <div className="excel-footer-actions">
              <button type="button" className="btn excel-secondary-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={selectedCount === 0 || exportLoading}
              >
                {exportLoading ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ExcelExportPanel;
