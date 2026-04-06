import React, { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  resultFilterLoading = false,
  notebookEnabled = false,
  notebookData = null,
  notebookHeaders = []
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
  const [sourceFilterPanelPosition, setSourceFilterPanelPosition] = useState({ top: 70, right: 20 });
  const [viewFilterPanelPosition, setViewFilterPanelPosition] = useState({ top: 70, right: 20 });
  const [draggingPanel, setDraggingPanel] = useState(null);
  const [panelStackOrder, setPanelStackOrder] = useState(['source', 'view']);
  const [notebookPanelMode, setNotebookPanelMode] = useState('');
  const [notebooks, setNotebooks] = useState([]);
  const [activeNotebookId, setActiveNotebookId] = useState('');
  const [notebookStorageHydrated, setNotebookStorageHydrated] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [newNotebookDescription, setNewNotebookDescription] = useState('');
  const [writerDescriptionDraft, setWriterDescriptionDraft] = useState('');
  const [writerPanelPosition, setWriterPanelPosition] = useState({ top: 72, right: 16 });
  const [isNotebookEditorExpanded, setIsNotebookEditorExpanded] = useState(false);
  const [isEditingNotebookDescription, setIsEditingNotebookDescription] = useState(false);
  const [editingEntryMap, setEditingEntryMap] = useState({});
  const [saveToast, setSaveToast] = useState({ visible: false, message: '' });
  const saveToastTimerRef = useRef(null);
  const sourcePanelRef = useRef(null);
  const viewPanelRef = useRef(null);
  const notebookLibraryPanelRef = useRef(null);
  const notebookWriterPanelRef = useRef(null);
  const notebookEditorPanelRef = useRef(null);
  const notebookStorageKey = 'analysisNotebookStore.v1';
  const ratioHeaders = React.useMemo(() => new Set([
    'Loss Ratio',
    'Commission Ratio',
    'Net Management Expense Ratio',
    'Net Technical Margin Ratio',
    'Net Retro Expense Ratio',
    'Combined Ratio'
  ]), []);
  const negativeMagnitudeHeaders = React.useMemo(() => new Set([
    'Net Commission',
    'Net Incurred Claim'
  ]), []);
  const forcedNumericResultHeaders = React.useMemo(() => new Set([
    'Net Premium',
    'Net Incurred Claim',
    'Net Commission',
    'Net Technical Margin',
    'Loss Ratio',
    'Commission Ratio',
    'Net Management Expense Ratio',
    'Net Technical Margin Ratio',
    'Net Retro Expense Ratio',
    'Combined Ratio'
  ]), []);
  const panelOverlapOffset = { top: 22, right: 16 };
  const previousVisibilityRef = useRef({ source: false, view: false });
  const activePanels = React.useMemo(() => {
    const visible = [];
    if (showFilterConfigInFullscreen && sourceData) visible.push('source');
    if (showResultFilterConfigInFullscreen && Array.isArray(resultData)) visible.push('view');
    return panelStackOrder.filter((panel) => visible.includes(panel));
  }, [panelStackOrder, showFilterConfigInFullscreen, showResultFilterConfigInFullscreen, sourceData, resultData]);

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
    setNotebookPanelMode('');
    setIsNotebookEditorExpanded(false);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const getPanelLayer = (panelType) => {
    const index = activePanels.indexOf(panelType);
    return index === -1 ? 0 : index;
  };

  const bringPanelToFront = (panelType) => {
    setPanelStackOrder((prev) => {
      const ordered = prev.filter((panel) => panel !== panelType);
      return [...ordered, panelType];
    });
  };

  useEffect(() => {
    const sourceVisible = Boolean(showFilterConfigInFullscreen && sourceData);
    const viewVisible = Boolean(showResultFilterConfigInFullscreen && Array.isArray(resultData));

    if (sourceVisible && !previousVisibilityRef.current.source) {
      bringPanelToFront('source');
    }

    if (viewVisible && !previousVisibilityRef.current.view) {
      bringPanelToFront('view');
    }

    previousVisibilityRef.current = {
      source: sourceVisible,
      view: viewVisible
    };
  }, [showFilterConfigInFullscreen, showResultFilterConfigInFullscreen, sourceData, resultData]);

  useEffect(() => {
    if (!isFullscreen) return;

    const handleOutsideClick = (event) => {
      const target = event.target;

      if (showFilterConfigInFullscreen && sourcePanelRef.current && !sourcePanelRef.current.contains(target)) {
        setShowFilterConfigInFullscreen(false);
      }

      if (showResultFilterConfigInFullscreen && viewPanelRef.current && !viewPanelRef.current.contains(target)) {
        setShowResultFilterConfigInFullscreen(false);
      }

      if (notebookPanelMode === 'library' && notebookLibraryPanelRef.current && !notebookLibraryPanelRef.current.contains(target)) {
        setNotebookPanelMode('');
      }

      if (notebookPanelMode === 'writer' && notebookWriterPanelRef.current && !notebookWriterPanelRef.current.contains(target)) {
        setNotebookPanelMode('');
      }

      if (notebookPanelMode === 'editor' && !isNotebookEditorExpanded && notebookEditorPanelRef.current && !notebookEditorPanelRef.current.contains(target)) {
        setNotebookPanelMode('');
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [
    isFullscreen,
    showFilterConfigInFullscreen,
    showResultFilterConfigInFullscreen,
    notebookPanelMode,
    isNotebookEditorExpanded
  ]);

  const getDisplayedPanelPosition = (panelType, basePosition) => {
    const layer = getPanelLayer(panelType);
    return {
      top: basePosition.top + (layer * panelOverlapOffset.top),
      right: basePosition.right + (layer * panelOverlapOffset.right)
    };
  };

  const getPanelZIndex = (panelType) => {
    const layer = getPanelLayer(panelType);
    const dragBoost = draggingPanel === panelType ? 300 : 0;
    return 3000 + (layer * 30) + dragBoost;
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
    const isNumericHeader = forcedNumericResultHeaders.has(newResultFilterHeader) || isResultNumericColumn(newResultFilterHeader);
    return isNumericHeader ? ['Equal', 'Atlest', 'Atmost'] : ['Equal'];
  }, [newResultFilterHeader, forcedNumericResultHeaders, isResultNumericColumn, resultHeaders]);

  const isRatioResultHeader = Boolean(newResultFilterHeader && ratioHeaders.has(newResultFilterHeader));
  const isNegativeMagnitudeHeader = Boolean(newResultFilterHeader && negativeMagnitudeHeaders.has(newResultFilterHeader));
  const activeNotebook = React.useMemo(
    () => notebooks.find((n) => n.id === activeNotebookId) || null,
    [notebooks, activeNotebookId]
  );
  const effectiveNotebookData = React.useMemo(() => (
    Array.isArray(notebookData) ? notebookData : (Array.isArray(resultData) ? resultData : [])
  ), [notebookData, resultData]);
  const effectiveNotebookHeaders = React.useMemo(() => {
    if (Array.isArray(notebookHeaders) && notebookHeaders.length > 0) return notebookHeaders;
    if (effectiveNotebookData[0] && typeof effectiveNotebookData[0] === 'object') {
      return Object.keys(effectiveNotebookData[0]);
    }
    return [];
  }, [notebookHeaders, effectiveNotebookData]);

  useEffect(() => {
    if (!notebookEnabled) return;
    try {
      const raw = window.localStorage.getItem(notebookStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      setNotebooks(parsed);
      if (parsed.length > 0) {
        setActiveNotebookId(parsed[0].id);
      }
    } catch (_) {
      // Ignore malformed notebook cache to keep UI responsive.
    } finally {
      setNotebookStorageHydrated(true);
    }
  }, [notebookEnabled]);

  useEffect(() => {
    if (!notebookEnabled || !notebookStorageHydrated) return;
    try {
      window.localStorage.setItem(notebookStorageKey, JSON.stringify(notebooks));
    } catch (_) {
      // Ignore storage quota errors; in-memory state still works for the session.
    }
  }, [notebookEnabled, notebookStorageHydrated, notebooks]);

  useEffect(() => () => {
    if (saveToastTimerRef.current) {
      window.clearTimeout(saveToastTimerRef.current);
    }
  }, []);

  const showNotebookSavedToast = (message) => {
    setSaveToast({ visible: true, message });
    if (saveToastTimerRef.current) {
      window.clearTimeout(saveToastTimerRef.current);
    }
    saveToastTimerRef.current = window.setTimeout(() => {
      setSaveToast((prev) => ({ ...prev, visible: false }));
    }, 1800);
  };

  const clampPanelPosition = (position) => {
    const panelWidth = 400;
    const topMax = Math.max(window.innerHeight - 80, 0);
    const rightMax = Math.max(window.innerWidth - panelWidth, 0);
    return {
      top: Math.min(Math.max(position.top, 0), topMax),
      right: Math.min(Math.max(position.right, 0), rightMax)
    };
  };

  const clampWriterPanelPosition = (position, panelWidth) => {
    const topMax = Math.max(window.innerHeight - 120, 0);
    const rightMax = Math.max(window.innerWidth - panelWidth, 0);
    return {
      top: Math.min(Math.max(position.top, 0), topMax),
      right: Math.min(Math.max(position.right, 0), rightMax)
    };
  };

  const startWriterPanelDrag = (event) => {
    event.preventDefault();
    const writerPanelWidth = 560;
    const startX = event.clientX;
    const startY = event.clientY;
    const startTop = writerPanelPosition.top;
    const startRight = writerPanelPosition.right;

    setDraggingPanel('writer');

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const nextPosition = clampWriterPanelPosition({
        top: startTop + deltaY,
        right: startRight - deltaX
      }, writerPanelWidth);
      setWriterPanelPosition(nextPosition);
    };

    const onMouseUp = () => {
      setDraggingPanel(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const startPanelDrag = (panelType, event) => {
    event.preventDefault();
    const initialPosition = panelType === 'source' ? sourceFilterPanelPosition : viewFilterPanelPosition;
    const layer = getPanelLayer(panelType);
    const displayedInitialPosition = {
      top: initialPosition.top + (layer * panelOverlapOffset.top),
      right: initialPosition.right + (layer * panelOverlapOffset.right)
    };
    const startX = event.clientX;
    const startY = event.clientY;
    const startTop = displayedInitialPosition.top;
    const startRight = displayedInitialPosition.right;

    setDraggingPanel(panelType);

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const nextDisplayedPosition = clampPanelPosition({
        top: startTop + deltaY,
        right: startRight - deltaX
      });
      const nextPosition = {
        top: nextDisplayedPosition.top - (layer * panelOverlapOffset.top),
        right: nextDisplayedPosition.right - (layer * panelOverlapOffset.right)
      };

      if (panelType === 'source') {
        setSourceFilterPanelPosition(nextPosition);
      } else {
        setViewFilterPanelPosition(nextPosition);
      }
    };

    const onMouseUp = () => {
      bringPanelToFront(panelType);
      setDraggingPanel(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
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

  const createNotebook = () => {
    const trimmedName = (newNotebookName || '').trim();
    const notebookName = trimmedName || `Notebook ${notebooks.length + 1}`;
    const notebook = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: notebookName,
      description: (newNotebookDescription || '').trim(),
      createdAt: new Date().toISOString(),
      entries: []
    };
    setNotebooks((prev) => [...prev, notebook]);
    setActiveNotebookId(notebook.id);
    setNewNotebookName('');
    setNewNotebookDescription('');
  };

  const upsertNotebook = (id, updater) => {
    setNotebooks((prev) => prev.map((notebook) => (
      notebook.id === id ? updater(notebook) : notebook
    )));
  };

  const addCurrentTableFromWriter = () => {
    if (!activeNotebook) return;

    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'table',
      title,
      createdAt: new Date().toISOString(),
      headers: effectiveNotebookHeaders,
      rows: Array.isArray(effectiveNotebookData) ? effectiveNotebookData : [],
      description: writerDescriptionDraft || ''
    };

    upsertNotebook(activeNotebook.id, (notebook) => ({
      ...notebook,
      entries: [...notebook.entries, entry]
    }));
    setWriterDescriptionDraft('');
    showNotebookSavedToast(`Added to ${activeNotebook.name}`);
  };

  const addDescriptionCell = () => {
    if (!activeNotebook) return;

    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'description',
      createdAt: new Date().toISOString(),
      description: ''
    };

    upsertNotebook(activeNotebook.id, (notebook) => ({
      ...notebook,
      entries: [...notebook.entries, entry]
    }));
    showNotebookSavedToast('Description cell added');
  };

  const updateEntryDescription = (entryId, text) => {
    if (!activeNotebook) return;
    upsertNotebook(activeNotebook.id, (notebook) => ({
      ...notebook,
      entries: notebook.entries.map((entry) => (
        entry.id === entryId ? { ...entry, description: text } : entry
      ))
    }));
  };

  const updateNotebookDescription = (text) => {
    if (!activeNotebook) return;
    upsertNotebook(activeNotebook.id, (notebook) => ({
      ...notebook,
      description: text
    }));
  };

  const toggleEntryDescriptionEdit = (entryId) => {
    setEditingEntryMap((prev) => ({
      ...prev,
      [entryId]: !prev[entryId]
    }));
  };

  const isEntryDescriptionEditing = (entryId) => Boolean(editingEntryMap[entryId]);

  const openNotebookEditor = (notebookId) => {
    setActiveNotebookId(notebookId);
    setNotebookPanelMode('editor');
  };

  const deleteNotebook = (notebookId) => {
    const target = notebooks.find((n) => n.id === notebookId);
    if (!target) return;

    const confirmed = window.confirm(`Delete notebook \"${target.name}\"? This cannot be undone.`);
    if (!confirmed) return;

    const remaining = notebooks.filter((n) => n.id !== notebookId);
    setNotebooks(remaining);

    if (activeNotebookId === notebookId) {
      if (remaining.length > 0) {
        setActiveNotebookId(remaining[0].id);
        setNotebookPanelMode('library');
      } else {
        setActiveNotebookId('');
        setNotebookPanelMode('library');
      }
    }

    showNotebookSavedToast('Notebook deleted');
  };

  const toHtmlTable = (headers, rows) => {
    const safeHeaders = Array.isArray(headers) ? headers : [];
    const safeRows = Array.isArray(rows) ? rows : [];
    const headerHtml = safeHeaders.map((h) => `<th style="border:1px solid #ddd;padding:6px;background:#f3f6fb;text-align:left;">${String(h)}</th>`).join('');
    const rowHtml = safeRows.map((row) => {
      const cells = safeHeaders.map((h) => `<td style="border:1px solid #ddd;padding:6px;">${row && row[h] != null ? String(row[h]) : ''}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table style="border-collapse:collapse;width:100%;margin:8px 0 14px 0;"><thead><tr>${headerHtml}</tr></thead><tbody>${rowHtml}</tbody></table>`;
  };

  const notebookToHtmlDocument = (notebook) => {
    const body = (notebook.entries || []).map((entry, idx) => {
      const heading = `<h3 style="margin:16px 0 8px 0;">Cell ${idx + 1}</h3>`;
      if (entry.type === 'table') {
        const tableHtml = toHtmlTable(entry.headers, entry.rows);
        const note = `<p><strong>Description:</strong> ${entry.description ? String(entry.description) : ''}</p>`;
        return `${heading}${tableHtml}${note}`;
      }
      return `${heading}<p><strong>Description:</strong> ${entry.description ? String(entry.description) : ''}</p>`;
    }).join('');

    return `<!doctype html><html><head><meta charset="utf-8" /><title>${notebook.name}</title></head><body style="font-family:Segoe UI,Tahoma,sans-serif;padding:20px;"><h1>${notebook.name}</h1>${body || '<p>No cells yet.</p>'}</body></html>`;
  };

  const downloadNotebookWord = () => {
    if (!activeNotebook) return;
    const html = notebookToHtmlDocument(activeNotebook);
    const blob = new Blob([html], { type: 'application/msword' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeNotebook.name.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const downloadNotebookPdf = () => {
    if (!activeNotebook) return;

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;
    const maxContentWidth = pageWidth - (margin * 2);
    let y = margin;

    const ensureSpace = (requiredHeight = 40) => {
      if (y + requiredHeight > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
    };

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    const titleLines = pdf.splitTextToSize(activeNotebook.name, maxContentWidth);
    pdf.text(titleLines, margin, y);
    y += (titleLines.length * 18) + 8;

    if (activeNotebook.description) {
      ensureSpace(30);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('Notebook Description', margin, y);
      y += 14;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      const notebookDesc = pdf.splitTextToSize(String(activeNotebook.description), maxContentWidth);
      pdf.text(notebookDesc, margin, y);
      y += (notebookDesc.length * 13) + 10;
    }

    (activeNotebook.entries || []).forEach((entry, idx) => {
      ensureSpace(38);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text(`Cell ${idx + 1} - ${entry.type === 'table' ? 'Table + Description' : 'Description'}`, margin, y);
      y += 16;

      if (entry.type === 'table') {
        const headers = Array.isArray(entry.headers) ? entry.headers : [];
        const rows = Array.isArray(entry.rows) ? entry.rows : [];
        const body = rows.map((row) => headers.map((h) => (row && row[h] != null ? String(row[h]) : '')));

        autoTable(pdf, {
          startY: y,
          head: headers.length > 0 ? [headers] : [['No table headers']],
          body: headers.length > 0 ? body : [['No table rows']],
          theme: 'grid',
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 4 },
          headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59] }
        });

        y = (pdf.lastAutoTable?.finalY || y) + 12;
      }

      const description = entry.description ? String(entry.description) : '';
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      ensureSpace(20);
      pdf.text('Description:', margin, y);
      y += 14;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      const descLines = pdf.splitTextToSize(description || '-', maxContentWidth);
      ensureSpace((descLines.length * 13) + 10);
      pdf.text(descLines, margin, y);
      y += (descLines.length * 13) + 12;
    });

    pdf.save(`${activeNotebook.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <>
      {isFullscreen && <div className="fullscreen-overlay" />}
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
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#856404' }}>🔍 Active Source Filter:</span>
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
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#856404' }}>🔍 Active View Filter:</span>
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
            {isFullscreen && notebookEnabled && (
              <button
                className="btn-icon"
                onClick={() => setNotebookPanelMode(notebookPanelMode === 'library' ? '' : 'library')}
                title="Notebook"
                aria-label="Notebook"
                style={{ marginRight: '8px' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
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

        {isFullscreen && notebookEnabled && (
          <div style={{
            padding: '8px 16px',
            borderBottom: '1px solid #e6eaf0',
            background: '#f9fbfe',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '12px', color: '#4b5563', fontWeight: 600 }}>
              Notebook: capture current view table and notes for audit record keeping.
            </span>
            <button
              onClick={() => setNotebookPanelMode('writer')}
              style={{
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid #8ab4f8',
                background: '#e8f1ff',
                color: '#0b4db8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Write To Notebook
            </button>
          </div>
        )}

        {isFullscreen && showFilterConfigInFullscreen && sourceData && (
          <div style={{
            position: 'fixed',
            top: `${getDisplayedPanelPosition('source', sourceFilterPanelPosition).top}px`,
            right: `${getDisplayedPanelPosition('source', sourceFilterPanelPosition).right}px`,
            width: '400px',
            maxHeight: '70vh',
            overflowY: 'auto',
            padding: '15px',
            backgroundColor: '#f0f8ff',
            border: '2px solid #28a745',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: getPanelZIndex('source')
          }}
          onMouseDown={() => bringPanelToFront('source')}
          ref={sourcePanelRef}
          >
            <div
              onMouseDown={(e) => startPanelDrag('source', e)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
                cursor: 'grab',
                userSelect: 'none'
              }}
            >
              <h4 style={{ margin: 0, color: '#28a745' }}>Add Source Filter</h4>
              <button
                onClick={() => setShowFilterConfigInFullscreen(false)}
                onMouseDown={(e) => e.stopPropagation()}
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
            </div>
          </div>
        )}

        {isFullscreen && showResultFilterConfigInFullscreen && Array.isArray(resultData) && (
          <div style={{
            position: 'fixed',
            top: `${getDisplayedPanelPosition('view', viewFilterPanelPosition).top}px`,
            right: `${getDisplayedPanelPosition('view', viewFilterPanelPosition).right}px`,
            width: '400px',
            maxHeight: '70vh',
            overflowY: 'auto',
            padding: '15px',
            backgroundColor: '#f0f8ff',
            border: '2px solid #28a745',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: getPanelZIndex('view')
          }}
          onMouseDown={() => bringPanelToFront('view')}
          ref={viewPanelRef}
          >
            <div
              onMouseDown={(e) => startPanelDrag('view', e)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
                cursor: 'grab',
                userSelect: 'none'
              }}
            >
              <h4 style={{ margin: 0, color: '#28a745' }}>Add View Filter</h4>
              <button
                onClick={() => setShowResultFilterConfigInFullscreen(false)}
                onMouseDown={(e) => e.stopPropagation()}
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
                  Value{isRatioResultHeader ? ' (%)' : ''}:
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
                    min={isRatioResultHeader || isNegativeMagnitudeHeader ? '0' : undefined}
                    style={{
                      padding: '6px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      width: '100%'
                    }}
                    placeholder={isRatioResultHeader ? 'Enter percent (e.g., 75 for 75%)' : isNegativeMagnitudeHeader ? 'Enter positive amount (e.g., 50000)' : 'Enter numeric value'}
                  />
                )}
                {isNegativeMagnitudeHeader && (
                  <div style={{ marginTop: '4px', fontSize: '11px', color: '#666' }}>
                    Use positive values; filters are automatically matched against negative table values.
                  </div>
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

        {isFullscreen && notebookEnabled && notebookPanelMode === 'library' && (
          <div style={{
            position: 'fixed',
            top: '72px',
            right: '16px',
            width: '460px',
            maxHeight: '80vh',
            overflowY: 'auto',
            background: '#ffffff',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            boxShadow: '0 12px 24px rgba(0,0,0,0.2)',
            zIndex: 3400,
            padding: '14px'
          }} ref={notebookLibraryPanelRef}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, color: '#1d4ed8' }}>Notebook Library</h4>
              <button
                onClick={() => setNotebookPanelMode('')}
                style={{ background: 'none', border: 'none', fontSize: '20px', color: '#1d4ed8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', marginBottom: '8px' }}>
              <input
                value={newNotebookName}
                onChange={(e) => setNewNotebookName(e.target.value)}
                placeholder="New notebook name"
                style={{ padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
              <button
                onClick={createNotebook}
                style={{ padding: '7px 10px', border: 'none', borderRadius: '4px', background: '#2563eb', color: '#fff', cursor: 'pointer' }}
              >
                Create
              </button>
            </div>
            <textarea
              value={newNotebookDescription}
              onChange={(e) => setNewNotebookDescription(e.target.value)}
              placeholder="Optional notebook description"
              rows={2}
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px', marginBottom: '12px', resize: 'vertical' }}
            />

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Existing Notebooks</label>
              <div style={{ border: '1px solid #dbe4f0', borderRadius: '6px', overflow: 'hidden' }}>
                {notebooks.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#6b7280', padding: '10px' }}>No notebook yet. Create one above.</div>
                ) : (
                  notebooks.map((notebook, idx) => (
                    <div
                      key={notebook.id}
                      style={{
                        width: '100%',
                        borderBottom: idx === notebooks.length - 1 ? 'none' : '1px solid #e5edf7',
                        background: '#fff',
                        padding: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <button
                        onClick={() => openNotebookEditor(notebook.id)}
                        style={{
                          textAlign: 'left',
                          border: 'none',
                          background: 'transparent',
                          padding: 0,
                          cursor: 'pointer',
                          flex: 1
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '13px' }}>{notebook.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{notebook.description || 'No description'}</div>
                      </button>
                      <button
                        onClick={() => deleteNotebook(notebook.id)}
                        style={{
                          border: '1px solid #fecaca',
                          background: '#fef2f2',
                          color: '#b91c1c',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          padding: '4px 7px',
                          fontWeight: 700
                        }}
                        title="Delete notebook"
                      >
                        🗑
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {isFullscreen && notebookEnabled && notebookPanelMode === 'writer' && (
          <div style={{
            position: 'fixed',
            top: `${writerPanelPosition.top}px`,
            right: `${writerPanelPosition.right}px`,
            width: '560px',
            maxHeight: '82vh',
            overflowY: 'auto',
            background: '#ffffff',
            border: '2px solid #22c55e',
            borderRadius: '8px',
            boxShadow: '0 12px 24px rgba(0,0,0,0.2)',
            zIndex: draggingPanel === 'writer' ? 3700 : 3400,
            padding: '14px'
          }} ref={notebookWriterPanelRef}>
            <div
              onMouseDown={startWriterPanelDrag}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', cursor: 'grab', userSelect: 'none' }}
            >
              <h4 style={{ margin: 0, color: '#15803d' }}>Write To Notebook</h4>
              <button
                onClick={() => setNotebookPanelMode('')}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ background: 'none', border: 'none', fontSize: '20px', color: '#15803d', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Target Notebook</label>
              <select
                value={activeNotebookId}
                onChange={(e) => setActiveNotebookId(e.target.value)}
                style={{ width: '100%', padding: '7px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              >
                <option value="">-- Select Notebook --</option>
                {notebooks.map((notebook) => (
                  <option key={notebook.id} value={notebook.id}>{notebook.name}</option>
                ))}
              </select>
            </div>

            <div style={{ border: '2px solid #d1d5db', borderRadius: '8px', marginBottom: '10px', background: '#fbfdff' }}>
              <div style={{ borderBottom: '1px solid #e2e8f0', padding: '8px 10px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>Cell 1 • Table Preview</div>
              <div style={{ padding: '10px', overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: '11px' }}>
                  <thead>
                    <tr>
                      {effectiveNotebookHeaders.map((h) => (
                        <th key={`writer-header-${h}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {effectiveNotebookData.slice(0, 8).map((row, idx) => (
                      <tr key={`writer-row-${idx}`}>
                        {effectiveNotebookHeaders.map((h) => (
                          <td key={`writer-cell-${idx}-${h}`}>{row && row[h] != null ? String(row[h]) : ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {effectiveNotebookData.length > 8 && (
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '5px' }}>
                    Preview shows first 8 rows of {effectiveNotebookData.length}.
                  </div>
                )}
              </div>
            </div>

            <div style={{ border: '2px solid #d1d5db', borderRadius: '8px', marginBottom: '12px', background: '#ffffff' }}>
              <div style={{ borderBottom: '1px solid #e2e8f0', padding: '8px 10px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>Cell 2 • Description</div>
              <div style={{ padding: '10px' }}>
                <textarea
                  value={writerDescriptionDraft}
                  onChange={(e) => setWriterDescriptionDraft(e.target.value)}
                  placeholder="Write your notebook description for this table..."
                  rows={5}
                  style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px', resize: 'vertical' }}
                />
              </div>
            </div>

            <button
              onClick={addCurrentTableFromWriter}
              disabled={!activeNotebook}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '4px',
                border: '1px solid #16a34a',
                background: '#dcfce7',
                color: '#166534',
                cursor: activeNotebook ? 'pointer' : 'not-allowed',
                fontWeight: 700
              }}
            >
              <span style={{ fontSize: '16px', lineHeight: '1' }}>+</span>
              Add To Notebook
            </button>
          </div>
        )}

        {isFullscreen && notebookEnabled && notebookPanelMode === 'editor' && activeNotebook && (
          <div style={{
            position: 'fixed',
            top: isNotebookEditorExpanded ? '0' : '72px',
            right: isNotebookEditorExpanded ? '0' : '16px',
            left: isNotebookEditorExpanded ? '0' : 'auto',
            bottom: isNotebookEditorExpanded ? '0' : 'auto',
            width: isNotebookEditorExpanded ? '100vw' : '560px',
            maxHeight: isNotebookEditorExpanded ? '100vh' : '82vh',
            overflowY: 'auto',
            background: '#ffffff',
            border: '2px solid #1d4ed8',
            borderRadius: isNotebookEditorExpanded ? '0' : '8px',
            boxShadow: '0 12px 24px rgba(0,0,0,0.2)',
            zIndex: isNotebookEditorExpanded ? 3800 : 3400,
            padding: isNotebookEditorExpanded ? '18px 20px' : '14px'
          }} ref={notebookEditorPanelRef}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, color: '#1d4ed8' }}>{activeNotebook.name}</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setNotebookPanelMode('library')}
                  style={{ background: 'none', border: 'none', fontSize: '20px', color: '#1d4ed8', cursor: 'pointer' }}
                  title="Back to notebook list"
                >
                  ←
                </button>
                <button
                  onClick={() => setNotebookPanelMode('')}
                  style={{ background: 'none', border: 'none', fontSize: '20px', color: '#1d4ed8', cursor: 'pointer' }}
                  title="Close notebook panel"
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button
                onClick={() => setIsNotebookEditorExpanded((prev) => !prev)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: '1px solid #93c5fd',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                {isNotebookEditorExpanded ? 'Normal View' : 'Expand View'}
              </button>
            </div>

            <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px', color: '#334155' }}>
              Notebook Description
            </label>

            {isEditingNotebookDescription ? (
              <textarea
                value={activeNotebook.description || ''}
                onChange={(e) => updateNotebookDescription(e.target.value)}
                placeholder="Notebook description (optional)"
                rows={2}
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px', marginBottom: '6px', resize: 'vertical' }}
              />
            ) : (
              <div style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px', marginBottom: '6px', minHeight: '52px', background: '#f8fafc', color: '#334155', whiteSpace: 'pre-wrap' }}>
                {(activeNotebook.description || '').trim() || 'No notebook description yet.'}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <button
                onClick={() => setIsEditingNotebookDescription((prev) => !prev)}
                style={{
                  padding: '5px 8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#334155',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 700
                }}
                title={isEditingNotebookDescription ? 'Done editing description' : 'Edit description'}
              >
                {isEditingNotebookDescription ? '✓' : '✎'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <button
                onClick={() => deleteNotebook(activeNotebook.id)}
                style={{
                  padding: '7px 10px',
                  borderRadius: '4px',
                  border: '1px solid #ef4444',
                  background: '#fee2e2',
                  color: '#b91c1c',
                  cursor: 'pointer',
                  fontWeight: 700
                }}
                title="Delete notebook"
              >
                Delete Notebook
              </button>
              <button
                onClick={addDescriptionCell}
                style={{
                  padding: '7px 10px',
                  borderRadius: '4px',
                  border: '1px solid #d97706',
                  background: '#ffedd5',
                  color: '#9a3412',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontWeight: 700
                }}
              >
                <span style={{ fontSize: '16px', lineHeight: '1' }}>+</span>
                Add Description Cell
              </button>
              <button
                onClick={downloadNotebookWord}
                style={{
                  padding: '7px 8px',
                  borderRadius: '4px',
                  border: '1px solid #475569',
                  background: '#eef2ff',
                  color: '#334155',
                  cursor: 'pointer'
                }}
                title="Download DOC"
              >
                <span style={{ fontSize: '14px' }}>⬇</span>
                <span style={{ marginLeft: '4px', fontSize: '11px', fontWeight: 700 }}>DOC</span>
              </button>
              <button
                onClick={downloadNotebookPdf}
                style={{
                  padding: '7px 8px',
                  borderRadius: '4px',
                  border: '1px solid #475569',
                  background: '#f1f5f9',
                  color: '#334155',
                  cursor: 'pointer'
                }}
                title="Download PDF"
              >
                <span style={{ fontSize: '14px' }}>⬇</span>
                <span style={{ marginLeft: '4px', fontSize: '11px', fontWeight: 700 }}>PDF</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(activeNotebook.entries || []).length === 0 && (
                <div style={{ fontSize: '12px', color: '#6b7280', padding: '8px', background: '#f8fafc', borderRadius: '4px' }}>
                  No cells yet. Use "Write To Notebook" to add a table cell, or click + to create a description cell.
                </div>
              )}
              {(activeNotebook.entries || []).map((entry, idx) => (
                <div key={entry.id} style={{ border: '2px solid #d1d5db', borderRadius: '8px', background: '#ffffff' }}>
                  <div style={{ borderBottom: '1px solid #e2e8f0', padding: '8px 10px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                    Cell {idx + 1} • {entry.type === 'table' ? 'Table + Description' : 'Description'}
                  </div>
                  <div style={{ padding: '10px' }}>
                    {entry.type === 'table' && (
                      <div style={{ overflowX: 'auto', marginBottom: '8px' }}>
                        <table className="data-table" style={{ fontSize: '11px' }}>
                          <thead>
                            <tr>
                              {(entry.headers || []).map((h) => (
                                <th key={`${entry.id}-${h}`}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(entry.rows || []).slice(0, 5).map((row, rowIdx) => (
                              <tr key={`${entry.id}-${rowIdx}`}>
                                {(entry.headers || []).map((h) => (
                                  <td key={`${entry.id}-${rowIdx}-${h}`}>{row && row[h] != null ? String(row[h]) : ''}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {isEntryDescriptionEditing(entry.id) ? (
                      <textarea
                        value={entry.description || ''}
                        onChange={(e) => updateEntryDescription(entry.id, e.target.value)}
                        placeholder="Write your notes/description..."
                        rows={4}
                        style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px', resize: 'vertical' }}
                      />
                    ) : (
                      <div style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px', minHeight: '92px', background: '#f8fafc', color: '#334155', whiteSpace: 'pre-wrap' }}>
                        {(entry.description || '').trim() || 'No description yet. Click edit to add notes.'}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                      <button
                        onClick={() => toggleEntryDescriptionEdit(entry.id)}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          color: '#334155',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 700
                        }}
                        title={isEntryDescriptionEditing(entry.id) ? 'Done editing' : 'Edit description'}
                      >
                        {isEntryDescriptionEditing(entry.id) ? '✓' : '✎'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isFullscreen && (
          <div
            style={{
              position: 'fixed',
              right: '22px',
              bottom: '24px',
              zIndex: 4200,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#ecfdf3',
              color: '#166534',
              border: '1px solid #86efac',
              borderRadius: '999px',
              padding: '9px 14px',
              boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
              opacity: saveToast.visible ? 1 : 0,
              transform: saveToast.visible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.98)',
              transition: 'opacity 220ms ease, transform 220ms ease',
              pointerEvents: 'none'
            }}
          >
            <span
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#16a34a',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              ✓
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700 }}>
              {saveToast.message || 'Saved to notebook'}
            </span>
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
