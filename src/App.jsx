import React, { useState, useCallback } from 'react';
import DataSection from './components/DataSection';
import AnalysisSection from './components/AnalysisSection';
import waicaLogo from '../Images/Waica Re Logo.jpg';

function App() {
  const [sourceData, setSourceData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState(null);
  const [dataSourceUrl, setDataSourceUrl] = useState('C:/Auditor Valuation Framework/exccute.py/Profitability results from FY 2024 to FY 2025.xlsx');
  const [dataSourceType, setDataSourceType] = useState('excel');
  const [excelSheetName, setExcelSheetName] = useState('Detailed');

  const handleDataFetch = useCallback((data) => {
    setSourceData(data);
  }, []);

  const handleSetLoading = useCallback((isLoading) => {
    setDataLoading(isLoading);
  }, []);

  const handleSetError = useCallback((errorMsg) => {
    setDataError(errorMsg);
  }, []);

  return (
    <div className="app-container">
      <div className="header">
        <div className="brand-wrap">
          <img className="brand-logo" src={waicaLogo} alt="WAICA Reinsurance Corporation logo" />
          <div className="brand-copy">
            <h1>Auditor Analysis Framework</h1>
            <p>Explore, analyze, and audit.</p>
          </div>
        </div>
        <div className="brand-tag">Risk Analytics</div>
      </div>

      <DataSection
        onDataFetch={handleDataFetch}
        onSetLoading={handleSetLoading}
        onSetError={handleSetError}
        loading={dataLoading}
        error={dataError}
        data={sourceData}
        dataSourceUrl={dataSourceUrl}
        setDataSourceUrl={setDataSourceUrl}
        dataSourceType={dataSourceType}
        setDataSourceType={setDataSourceType}
        excelSheetName={excelSheetName}
        setExcelSheetName={setExcelSheetName}
      />

      <AnalysisSection sourceData={sourceData} />
    </div>
  );
}

export default App;
