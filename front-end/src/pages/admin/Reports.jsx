import { useState, useEffect, useCallback } from "react";
import api from "../../api/api";
import Navbar from "../../components/Navbar";

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import "./Reports.css";
import "./ReportsCheckboxStyles.css";

export default function Reports() {
  const [clients, setClients] = useState([]);
  const [sources, setSources] = useState([]);
  const [backlinks, setBacklinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [exporting, setExporting] = useState({ pdf: false, excel: false });
  const [filters, setFilters] = useState({
    client_id: "",
    start_date: "",
    end_date: "",
    last_update_date: "" 
  });
  
  const [selectedColumns, setSelectedColumns] = useState({
    date_added: true,
    source_website: true,
    traffic: true,
    type: true,
    target_url: true,
    anchor_text: true,
    placement_url: true,
    status: true,
    quality_score: true,
    cost: true
  });

  const columnLabels = {
    date_added: "Date Added",
    source_website: "Source Website",
    traffic: "Traffic",
    type: "Type",
    target_url: "Target URL",
    anchor_text: "Anchor Text",
    placement_url: "Placement URL",
    status: "Status",
    quality_score: "Quality Score",
    cost: "Cost"
  };

  const toggleColumn = (col) => {
    setSelectedColumns(prev => ({ ...prev, [col]: !prev[col] }));
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';
  
  if (isAdmin && false) { 
    console.log('User is admin');
  }

  const fetchClients = async () => {
    try {
      const res = await api.get("/clients");
      setClients(res.data.data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchSources = async () => {
    try {
      const res = await api.get("/all-sources");
      setSources(res.data);
    } catch (error) {
      console.error("Error fetching sources:", error);
    }
  };

  const fetchBacklinks = async () => {
    try {
      const res = await api.get("/all-backlinks");
      setBacklinks(res.data);
    } catch (error) {
      console.error("Error fetching backlinks:", error);
    }
  };

  const generateReport = useCallback(() => {
    if (!backlinks.length || !sources.length) {
      return;
    }
    
    if (!filters.client_id && (!filters.start_date || !filters.end_date)) {
      const allDates = backlinks
        .map(b => new Date(b.date_added || b.created_at || b.date))
        .filter(date => !isNaN(date.getTime()))
        .sort((a, b) => a - b); 
      
      if (allDates.length > 0) {
        const earliestDate = allDates[0].toISOString().split('T')[0];
        const latestDate = allDates[allDates.length - 1].toISOString().split('T')[0];
        
        setFilters(prev => ({
          ...prev,
          start_date: earliestDate,
          end_date: latestDate
        }));
        return; 
      }
    }
    
    let filteredBacklinks = backlinks;

    if (filters.client_id) {
      const clientId = parseInt(filters.client_id);
      filteredBacklinks = filteredBacklinks.filter(b => b.client_id === clientId);
    } 

    if (filters.start_date) {
      const startDate = new Date(filters.start_date);
      filteredBacklinks = filteredBacklinks.filter(b => 
        new Date(b.date_added || b.created_at || b.date) >= startDate
      );
    }

    if (filters.end_date) {
      const endDate = new Date(filters.end_date);
      filteredBacklinks = filteredBacklinks.filter(b => 
        new Date(b.date_added || b.created_at || b.date) <= endDate
      );
    }

    if (filters.client_id && filters.last_update_date) {
      const lastUpdateDate = new Date(filters.last_update_date);
      filteredBacklinks = filteredBacklinks.filter(b => {
        const updateDate = new Date(b.date_added || b.created_at || b.updated_at || b.date);
        return updateDate <= lastUpdateDate;
      });
    }

    const enrichedBacklinks = filteredBacklinks.map(backlink => {
      const source = sources.find(s => s.id === backlink.source_site_id);
      return {
        ...backlink,
        dynamic_quality_score: source?.quality_score || backlink.quality_score || 3,
      };
    });

    const total = enrichedBacklinks.length;
    const live = enrichedBacklinks.filter(b => b.status === 'Live').length;
    const lost = enrichedBacklinks.filter(b => b.status === 'Lost').length;
    const pending = enrichedBacklinks.filter(b => b.status === 'Pending').length;
    const totalCost = enrichedBacklinks.reduce((sum, b) => sum + (parseFloat(b.cost) || 0), 0);
    const paid = enrichedBacklinks.filter(b => b.cost && parseFloat(b.cost) > 0).length;
    const free = total - paid;

    const newReportData = {
      backlinks: enrichedBacklinks,
      summary: { total, live, lost, pending, totalCost, paid, free }
    };

    if (!reportData || 
        JSON.stringify(reportData.backlinks) !== JSON.stringify(newReportData.backlinks) ||
        JSON.stringify(reportData.summary) !== JSON.stringify(newReportData.summary)) {
      setReportData(newReportData);
    }
  }, [backlinks, sources, filters]); 

  
  const exportPDF = () => {
    try {
      setExporting(prev => ({ ...prev, pdf: true }));
      
      // Créer les en-têtes dynamiques basées sur selectedColumns
      const headers = Object.keys(selectedColumns)
        .filter(col => selectedColumns[col])
        .map(col => columnLabels[col]);

      // Créer les données de tableau dynamiques
      const body = reportData.backlinks.map(backlink => 
        Object.keys(selectedColumns)
          .filter(col => selectedColumns[col])
          .map(col => {
            // Mapper les clés de colonnes aux valeurs réelles des backlinks
            switch(col) {
              case 'date_added':
                return new Date(backlink.date_added).toLocaleDateString();
              case 'source_website':
                return getSourceDomain(backlink.source_site_id);
              case 'traffic':
                return backlink.source_site?.traffic_estimated || backlink.traffic_estimated || 'N/A';
              case 'type':
                return backlink.type || '-';
              case 'target_url':
                return backlink.target_url || '-';
              case 'anchor_text':
                return backlink.anchor_text || '-';
              case 'placement_url':
                return backlink.placement_url || '-';
              case 'status':
                return backlink.status || '-';
              case 'quality_score':
                return `${backlink.dynamic_quality_score || 3}/5`;
              case 'cost':
                return `$${backlink.cost || '0'}`;
              default:
                return '-';
            }
          })
      );

      // Initialiser jsPDF
      const doc = new jsPDF();
      
      // Ajouter le titre
      doc.setFontSize(20);
      doc.text('RAPPORT DE BACKLINKS', 105, 20, { align: 'center' });
      
      // Ajouter la date de génération
      doc.setFontSize(12);
      doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, 105, 30, { align: 'center' });
      
      // Ajouter la période si applicable
      if (filters.start_date && filters.end_date) {
        doc.text(`Période : Du ${filters.start_date} au ${filters.end_date}`, 105, 40, { align: 'center' });
      } else {
        doc.text('Période : Rapport Global', 105, 40, { align: 'center' });
      }
      
      // Ajouter les statistiques
      doc.setFontSize(14);
      doc.text('Résumé', 20, 60);
      doc.setFontSize(10);
      
      const summary = reportData.summary;
      const summaryY = 70;
      doc.text(`Total: ${summary.total}`, 20, summaryY);
      doc.text(`Live: ${summary.live}`, 60, summaryY);
      doc.text(`Lost: ${summary.lost}`, 100, summaryY);
      doc.text(`Paid: ${summary.paid}`, 140, summaryY);
      doc.text(`Coût Total: $${summary.totalCost.toFixed(2)}`, 20, summaryY + 10);
      
      // Générer le tableau avec autoTable
      autoTable(doc, {
        head: [headers],
        body: body,
        startY: summaryY + 25,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [44, 62, 80],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: {
          0: { cellWidth: 20 }, // Date
          1: { cellWidth: 25 }, // Source
          2: { cellWidth: 15 }, // Traffic/Type/Score
          3: { cellWidth: 30 }, // Target URL/Placement URL
          4: { cellWidth: 20 }, // Anchor Text
          5: { cellWidth: 15 }, // Status
          6: { cellWidth: 15 }, // Cost
        },
        didDrawPage: (data) => {
          // Footer
          doc.setFontSize(9);
          doc.setTextColor(150);
          doc.text(
            'Gestion Backlinks - Rapport Confidentiel - Page ' + doc.internal.getNumberOfPages(),
            105,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
          );
        },
      });
      
      // Télécharger le PDF
      const client = filters.client_id 
        ? clients.find(c => c.id === parseInt(filters.client_id))
        : null;
      const clientName = client ? client.company_name : 'tous-les-clients';
      
      const fileName = `rapport-backlinks-${clientName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      doc.save(fileName);
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Erreur lors de la génération du PDF");
    } finally {
      setExporting(prev => ({ ...prev, pdf: false }));
    }
  };

  const exportExcel = () => {
    try {
      setExporting(prev => ({ ...prev, excel: true }));
      
      // Créer les en-têtes dynamiques basées sur selectedColumns
      const headers = Object.keys(selectedColumns)
        .filter(col => selectedColumns[col])
        .map(col => columnLabels[col]);

      // Créer les données de tableau dynamiques
      const data = reportData.backlinks.map(backlink => {
        const row = {};
        Object.keys(selectedColumns)
          .filter(col => selectedColumns[col])
          .forEach(col => {
            // Mapper les clés de colonnes aux valeurs réelles des backlinks
            switch(col) {
              case 'date_added':
                row[columnLabels[col]] = new Date(backlink.date_added).toLocaleDateString();
                break;
              case 'source_website':
                row[columnLabels[col]] = getSourceDomain(backlink.source_site_id);
                break;
              case 'traffic':
                row[columnLabels[col]] = backlink.source_site?.traffic_estimated || backlink.traffic_estimated || 'N/A';
                break;
              case 'type':
                row[columnLabels[col]] = backlink.type || '-';
                break;
              case 'target_url':
                row[columnLabels[col]] = backlink.target_url || '-';
                break;
              case 'anchor_text':
                row[columnLabels[col]] = backlink.anchor_text || '-';
                break;
              case 'placement_url':
                row[columnLabels[col]] = backlink.placement_url || '-';
                break;
              case 'status':
                row[columnLabels[col]] = backlink.status || '-';
                break;
              case 'quality_score':
                row[columnLabels[col]] = `${backlink.dynamic_quality_score || 3}/5`;
                break;
              case 'cost':
                row[columnLabels[col]] = backlink.cost || 0;
                break;
              default:
                row[columnLabels[col]] = '-';
            }
          });
        return row;
      });

      // Créer le workbook et la worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data, { header: headers });
      
      // Ajuster la largeur des colonnes
      const colWidths = headers.map((header, index) => {
        // Définir la largeur basée sur le type de contenu
        const maxWidth = Math.max(
          header.length,
          ...data.map(row => (Object.values(row)[index] || '').toString().length)
        );
        return { wch: Math.min(maxWidth + 2, 30) }; // Max 30 characters width
      });
      ws['!cols'] = colWidths;

      // Ajouter la worksheet au workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Backlinks Report');
      
      // Ajouter une worksheet pour le résumé
      const summaryData = [
        ['Statistiques', 'Valeur'],
        ['Total Backlinks', reportData.summary.total],
        ['Live', reportData.summary.live],
        ['Lost', reportData.summary.lost],
        ['Pending', reportData.summary.pending],
        ['Paid', reportData.summary.paid],
        ['Free', reportData.summary.free],
        ['Coût Total', reportData.summary.totalCost]
      ];
      
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Résumé');
      
      // Télécharger le fichier Excel
      const client = filters.client_id 
        ? clients.find(c => c.id === parseInt(filters.client_id))
        : null;
      const clientName = client ? client.company_name : 'tous-les-clients';
      
      const fileName = `rapport-backlinks-${clientName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.xlsx`;
      
      XLSX.writeFile(wb, fileName);
      
    } catch (error) {
      console.error("Error generating Excel:", error);
      alert("Erreur lors de la génération du fichier Excel");
    } finally {
      setExporting(prev => ({ ...prev, excel: false }));
    }
  };

  const getSourceDomain = (sourceId) => {
    const source = sources.find(s => s.id === sourceId);
    return source ? source.domain : 'Unknown';
  };

  const renderQualityStars = (score) => {
    return "⭐".repeat(score || 1) + "☆".repeat(5 - (score || 1));
  };

  useEffect(() => { 
    fetchClients();
    fetchSources();
    fetchBacklinks();
    setLoading(false);
  }, []);

  useEffect(() => {
    if (sources.length > 0 && backlinks.length > 0) {
      generateReport();
    }
  }, [sources, backlinks, generateReport]);

  useEffect(() => {
    if (filters.client_id) {
      const clientId = parseInt(filters.client_id);
      const clientBacklinks = backlinks.filter(b => b.client_id === clientId);
      
      if (clientBacklinks.length > 0) {
        const dates = clientBacklinks
          .map(b => new Date(b.date_added || b.created_at || b.updated_at || b.date))
          .filter(date => !isNaN(date.getTime()))
          .sort((a, b) => b - a); 
        
        if (dates.length > 0) {
          const latestDate = dates[0].toISOString().split('T')[0];
          setFilters(prev => ({
            ...prev,
            last_update_date: latestDate, 
            start_date: "", 
            end_date: ""    
          }));
        }
      }
    } else {
      setFilters(prev => ({
        ...prev,
        last_update_date: "",
        start_date: prev.start_date,
        end_date: prev.end_date
      }));
    }
  }, [filters.client_id, backlinks]);

  useEffect(() => {
    if (backlinks.length > 0 && sources.length > 0) {
      generateReport();
    }
  }, [backlinks, sources, generateReport]);

  if (loading) {
    return <div className="loading">Loading reports...</div>;
  }

  return (
    <div className="reports">
      <Navbar />
      <div className="reports-content">
        <div className="reports-header">
          <h2>Reports Generator</h2>
        </div>

        <div className="filters-container">
          <h3>Report Filters</h3>
          <div className="filters-form">
            <div className="filter-row">
              <select 
                value={filters.client_id}
                onChange={e=>setFilters({...filters, client_id: e.target.value})}
              >
                <option value="">All Clients</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.company_name}
                  </option>
                ))}
              </select>
              
              {filters.client_id ? (
                <div>
                  <label>Last Update Date</label>
                  <input 
                    type="date"
                    value={filters.last_update_date}
                    onChange={e=>setFilters({...filters, last_update_date: e.target.value})}
                    placeholder="Last Update Date"
                  />
                </div>
              ) : (
                <div>
                  <label>Start Date</label>
                  <input 
                    type="date"
                    value={filters.start_date}
                    onChange={e=>setFilters({...filters, start_date: e.target.value})}
                    placeholder="Start Date"
                  />
                  <label>End Date</label>
                  <input 
                    type="date"
                    value={filters.end_date}
                    onChange={e=>setFilters({...filters, end_date: e.target.value})}
                    placeholder="End Date"
                  />
                </div>
              )}
            </div>
            <button className="generate-btn" onClick={generateReport}>
               Generate Report
            </button>
          </div>
        </div>

        {reportData && (
          <div className="report-results">
            <div className="summary-section">
              <h3>Summary</h3>
              <div className="summary-grid">
                <div className="summary-card total">
                  <h4> Total Backlinks</h4>
                  <p>{reportData.summary.total}</p>
                </div>
                <div className="summary-card live">
                  <h4> Live</h4>
                  <p>{reportData.summary.live}</p>
                </div>
                <div className="summary-card pending">
                  <h4> Pending</h4>
                  <p>{reportData.summary.pending}</p>
                </div>
                <div className="summary-card lost">
                  <h4> Lost</h4>
                  <p>{reportData.summary.lost}</p>
                </div>
                <div className="summary-card paid">
                  <h4> Paid</h4>
                  <p>{reportData.summary.paid}</p>
                </div>
                <div className="summary-card free">
                  <h4> Free</h4>
                  <p>{reportData.summary.free}</p>
                </div>
              </div>
            </div>

            <div className="export-section">
              <h3>Export Options</h3>
              <div className="export-buttons">
                <button 
                  className={`export-btn pdf ${exporting.pdf ? 'loading' : ''}`} 
                  onClick={exportPDF}
                  disabled={exporting.pdf}
                >
                  {exporting.pdf ? '⏳ Génération...' : '📄 Export PDF'}
                </button>
                <button 
                  className={`export-btn excel ${exporting.excel ? 'loading' : ''}`} 
                  onClick={exportExcel}
                  disabled={exporting.excel}
                >
                  {exporting.excel ? '⏳ Génération...' : '📊 Export Excel'}
                </button>
              </div>
            </div>

            <div className="results-table">
              <h3>Results ({reportData.backlinks.length} backlinks)</h3>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>
                      <div className="export-header">
                        <input 
                          type="checkbox" 
                          checked={selectedColumns.date_added}
                          onChange={() => toggleColumn('date_added')}
                          className="export-checkbox"
                        />
                        <span className="export-label">Date Added</span>
                      </div>
                    </th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedColumns.source_website}
                          onChange={() => toggleColumn('source_website')}
                          style={{ 
                            cursor: 'pointer',
                            width: '16px',
                            height: '16px',
                            accentColor: '#2c3e50',
                            border: '2px solid #e0e0e0',
                            borderRadius: '3px',
                            transition: 'all 0.2s ease'
                          }}
                          className="export-checkbox"
                          title="Export: Source Website"
                        />
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>Source Website</span>
                      </div>
                    </th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedColumns.traffic}
                          onChange={() => toggleColumn('traffic')}
                          style={{ 
                            cursor: 'pointer',
                            width: '16px',
                            height: '16px',
                            accentColor: '#2c3e50',
                            border: '2px solid #e0e0e0',
                            borderRadius: '3px',
                            transition: 'all 0.2s ease'
                          }}
                          className="export-checkbox"
                          title="Export: Traffic"
                        />
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>Traffic</span>
                      </div>
                    </th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedColumns.type}
                          onChange={() => toggleColumn('type')}
                          style={{ 
                            cursor: 'pointer',
                            width: '16px',
                            height: '16px',
                            accentColor: '#2c3e50',
                            border: '2px solid #e0e0e0',
                            borderRadius: '3px',
                            transition: 'all 0.2s ease'
                          }}
                          className="export-checkbox"
                          title="Export: Type"
                        />
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>Type</span>
                      </div>
                    </th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedColumns.target_url}
                          onChange={() => toggleColumn('target_url')}
                          style={{ 
                            cursor: 'pointer',
                            width: '16px',
                            height: '16px',
                            accentColor: '#2c3e50',
                            border: '2px solid #e0e0e0',
                            borderRadius: '3px',
                            transition: 'all 0.2s ease'
                          }}
                          className="export-checkbox"
                          title="Export: Target URL"
                        />
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>Target URL</span>
                      </div>
                    </th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedColumns.anchor_text}
                          onChange={() => toggleColumn('anchor_text')}
                          style={{ 
                            cursor: 'pointer',
                            width: '16px',
                            height: '16px',
                            accentColor: '#2c3e50',
                            border: '2px solid #e0e0e0',
                            borderRadius: '3px',
                            transition: 'all 0.2s ease'
                          }}
                          className="export-checkbox"
                          title="Export: Anchor Text"
                        />
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>Anchor Text</span>
                      </div>
                    </th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedColumns.placement_url}
                          onChange={() => toggleColumn('placement_url')}
                          style={{ 
                            cursor: 'pointer',
                            width: '16px',
                            height: '16px',
                            accentColor: '#2c3e50',
                            border: '2px solid #e0e0e0',
                            borderRadius: '3px',
                            transition: 'all 0.2s ease'
                          }}
                          className="export-checkbox"
                          title="Export: Placement URL"
                        />
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>Placement URL</span>
                      </div>
                    </th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedColumns.status}
                          onChange={() => toggleColumn('status')}
                          style={{ 
                            cursor: 'pointer',
                            width: '16px',
                            height: '16px',
                            accentColor: '#2c3e50',
                            border: '2px solid #e0e0e0',
                            borderRadius: '3px',
                            transition: 'all 0.2s ease'
                          }}
                          className="export-checkbox"
                          title="Export: Status"
                        />
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>Status</span>
                      </div>
                    </th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedColumns.quality_score}
                          onChange={() => toggleColumn('quality_score')}
                          style={{ 
                            cursor: 'pointer',
                            width: '16px',
                            height: '16px',
                            accentColor: '#2c3e50',
                            border: '2px solid #e0e0e0',
                            borderRadius: '3px',
                            transition: 'all 0.2s ease'
                          }}
                          className="export-checkbox"
                          title="Export: Quality Score"
                        />
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>Quality Score </span>
                      </div>
                    </th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedColumns.cost}
                          onChange={() => toggleColumn('cost')}
                          style={{ 
                            cursor: 'pointer',
                            width: '16px',
                            height: '16px',
                            accentColor: '#2c3e50',
                            border: '2px solid #e0e0e0',
                            borderRadius: '3px',
                            transition: 'all 0.2s ease'
                          }}
                          className="export-checkbox"
                          title="Export: Cost"
                        />
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>Cost</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.backlinks.map(backlink => (
                    <tr key={backlink.id}>
                      <td className="date">{new Date(backlink.date_added).toLocaleDateString()}</td>
                      <td className="source-domain">
                        <a href={`https://${getSourceDomain(backlink.source_site_id)}`} target="_blank" rel="noopener noreferrer">
                          {getSourceDomain(backlink.source_site_id)}
                        </a>
                      </td>
                      <td className="traffic">{backlink.source_site?.traffic_estimated || backlink.traffic_estimated || 'N/A'}</td>
                      <td className="type">{backlink.type}</td>
                      <td className="target-url">
                        <a href={backlink.target_url} target="_blank" rel="noopener noreferrer">
                          {backlink.target_url}
                        </a>
                      </td>
                      <td className="anchor-text">{backlink.anchor_text || '-'}</td>
                      <td className="placement-url">
                        {backlink.placement_url ? (
                          <a href={backlink.placement_url} target="_blank" rel="noopener noreferrer">
                            {backlink.placement_url}
                          </a>
                        ) : '-'}
                      </td>
                      <td className={`status ${backlink.status === 'Live' ? 'status-live' : backlink.status === 'Lost' ? 'status-lost' : 'status-pending'}`}>
                        {backlink.status}
                      </td>
                      <td className="quality">{renderQualityStars(backlink.dynamic_quality_score)}</td>
                      <td className="cost">${backlink.cost || '0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}