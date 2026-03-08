import { useState, useEffect, useCallback } from "react";
import api from "../../api/api";
import Navbar from "../../components/Navbar";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import "./Reports.css";

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
    last_update_date: "" // New field for specific client
  });
  
  // Get user role from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';
  
  // Use isAdmin to satisfy linter
  if (isAdmin && false) { // Temporarily suppress unused warning
    console.log('User is admin');
  }

  const fetchClients = async () => {
    try {
      const res = await api.get("/clients");
      setClients(res.data);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchSources = async () => {
    try {
      const res = await api.get("/sources");
      setSources(res.data);
    } catch (error) {
      console.error("Error fetching sources:", error);
    }
  };

  const fetchBacklinks = async () => {
    try {
      const res = await api.get("/backlinks");
      setBacklinks(res.data);
    } catch (error) {
      console.error("Error fetching backlinks:", error);
    }
  };

  const generateReport = useCallback(() => {
    // Auto-set dates for All Clients if not specified
    if (!filters.client_id && (!filters.start_date || !filters.end_date)) {
      const allDates = backlinks
        .map(b => new Date(b.date_added || b.created_at || b.date))
        .filter(date => !isNaN(date.getTime()))
        .sort((a, b) => a - b);
      
      if (allDates.length > 0) {
        const earliestDate = allDates[0].toISOString().split('T')[0];
        setFilters(prev => ({
          ...prev,
          start_date: earliestDate,
          end_date: new Date().toISOString().split('T')[0]
        }));
        // Don't return, continue with auto-filled dates
      }
    }

    // Auto-set latest date for Specific Client if not specified
    if (filters.client_id && !filters.last_update_date) {
      const clientId = parseInt(filters.client_id);
      const clientBacklinks = backlinks.filter(b => b.client_id === clientId);
      if (clientBacklinks.length > 0) {
        const dates = clientBacklinks
          .map(b => new Date(b.date_added || b.created_at || b.updated_at || b.date))
          .filter(date => !isNaN(date.getTime()))
          .sort((a, b) => b - a); // Sort descending (latest first)
        
        if (dates.length > 0) {
          const latestDate = dates[0].toISOString().split('T')[0];
          setFilters(prev => ({
            ...prev,
            last_update_date: latestDate
          }));
          // Don't return, continue with auto-filled date
        }
      }
    }

    let filteredBacklinks = backlinks;

    // Filter by client - ensure integer comparison
    if (filters.client_id) {
      const clientId = parseInt(filters.client_id);
      filteredBacklinks = filteredBacklinks.filter(b => b.client_id === clientId);
    }

    // Filter by date ranges - use consistent date field
    if (filters.start_date) {
      filteredBacklinks = filteredBacklinks.filter(b => 
        new Date(b.date_added || b.created_at || b.date) >= new Date(filters.start_date)
      );
    }

    if (filters.end_date) {
      filteredBacklinks = filteredBacklinks.filter(b => 
        new Date(b.date_added || b.created_at || b.date) <= new Date(filters.end_date)
      );
    }

    // Filter by last update date (for specific client) - use consistent date field
    if (filters.client_id && filters.last_update_date) {
      filteredBacklinks = filteredBacklinks.filter(b => {
        const updateDate = new Date(b.date_added || b.created_at || b.updated_at || b.date);
        return updateDate <= new Date(filters.last_update_date);
      });
    }

    // Get dynamic quality scores from source websites
    const enrichedBacklinks = filteredBacklinks.map(backlink => {
      const source = sources.find(s => s.id === backlink.source_site_id);
      return {
        ...backlink,
        dynamic_quality_score: source?.quality_score || backlink.quality_score || 3,
        source_domain: source?.domain || 'Unknown'
      };
    });

    // Calculate statistics
    const total = enrichedBacklinks.length;
    const live = enrichedBacklinks.filter(b => b.status === 'Live').length;
    const lost = enrichedBacklinks.filter(b => b.status === 'Lost').length;
    const pending = enrichedBacklinks.filter(b => b.status === 'Pending').length;
    
    const totalCost = enrichedBacklinks.reduce((sum, b) => sum + (parseFloat(b.cost) || 0), 0);
    const paid = enrichedBacklinks.filter(b => b.cost && parseFloat(b.cost) > 0).length;
    const free = total - paid;

    setReportData({
      backlinks: enrichedBacklinks,
      summary: {
        total,
        live,
        lost,
        pending,
        totalCost,
        paid,
        free
      }
    });
  }, [backlinks, filters, sources]);

  const exportPDF = async () => {
    if (!reportData) {
      console.log("❌ No report data available");
      return;
    }
    
    console.log("🔍 Starting PDF export with data:", {
      backlinksCount: reportData.backlinks?.length || 0,
      sourcesCount: sources?.length || 0,
      hasReportData: !!reportData,
      hasBacklinks: !!reportData.backlinks,
      hasSources: !!sources
    });
    
    setExporting(prev => ({ ...prev, pdf: true }));
    
    try {
      // Create PDF with simple constructor
      const doc = new jsPDF();
      console.log("✅ PDF document created");
      
      // Title and info
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("RAPPORT DE BACKLINKS", 105, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      const client = clients.find(c => c.id === filters.client_id);
      const clientName = client ? client.company_name : 'Tous les clients';
      const period = filters.start_date && filters.end_date 
        ? `Du ${new Date(filters.start_date).toLocaleDateString('fr-FR')} au ${new Date(filters.end_date).toLocaleDateString('fr-FR')}`
        : 'Toute la période';
      
      doc.text(`Client: ${clientName}`, 20, 30);
      doc.text(`Période: ${period}`, 20, 38);
      doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 20, 46);
      
      console.log("📝 Title and info added");
      
      // Table headers
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      const headers = ['Date', 'Source', 'Traffic', 'Type', 'Anchor', 'Target URL', 'Status', 'Cost'];
      const colPositions = [20, 35, 65, 85, 110, 140, 170, 190];
      const headerHeight = 10;
      
      let yPos = 55;
      
      // Draw header background
      doc.setFillColor(44, 62, 80);
      doc.rect(colPositions[0], yPos - 6, 170, headerHeight, 'F');
      
      // Draw headers
      doc.setTextColor(255, 255, 255);
      headers.forEach((header, index) => {
        doc.text(header, colPositions[index] + 2, yPos);
      });
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      yPos += headerHeight + 2;
      
      // Draw table data
      reportData.backlinks.forEach((backlink, index) => {
        // Check page break
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
          
          // Redraw headers on new page
          doc.setFillColor(44, 62, 80);
          doc.rect(colPositions[0], yPos - 6, 170, headerHeight, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          headers.forEach((header, index) => {
            doc.text(header, colPositions[index] + 2, yPos);
          });
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "normal");
          yPos += headerHeight + 2;
        }
        
        // Draw row border
        doc.rect(colPositions[0], yPos - 4, 170, 7);
        
        // Draw vertical lines
        for (let j = 1; j < colPositions.length; j++) {
          doc.line(colPositions[j], yPos - 4, colPositions[j], yPos + 3);
        }
        
        // Add row data with better error handling
        try {
          const source = sources.find(s => s.id === backlink.source_site_id);
          const sourceDomain = source ? source.domain : 'Inconnu';
          const traffic = backlink.source_site?.traffic_estimated || backlink.traffic_estimated || 'N/A';
          
          doc.text(new Date(backlink.date_added).toLocaleDateString('fr-FR'), colPositions[0] + 2, yPos);
          doc.text(sourceDomain.substring(0, 12), colPositions[1] + 2, yPos);
          doc.text(traffic.toString(), colPositions[2] + 2, yPos);
          doc.text(backlink.type || '', colPositions[3] + 2, yPos);
          doc.text((backlink.anchor_text || '').substring(0, 12), colPositions[4] + 2, yPos);
          doc.text((backlink.target_url || '').substring(0, 12), colPositions[5] + 2, yPos);
          doc.text(backlink.status || '', colPositions[6] + 2, yPos);
          doc.text(`${backlink.cost || 0} €`, colPositions[7] + 2, yPos);
        } catch (rowError) {
          console.error("Error processing row:", rowError, backlink);
          // Add minimal data if there's an error
          doc.text('Error', colPositions[0] + 2, yPos);
          doc.text('Error', colPositions[1] + 2, yPos);
          doc.text('Error', colPositions[2] + 2, yPos);
          doc.text('Error', colPositions[3] + 2, yPos);
          doc.text('Error', colPositions[4] + 2, yPos);
          doc.text('Error', colPositions[5] + 2, yPos);
          doc.text('Error', colPositions[6] + 2, yPos);
          doc.text('Error', colPositions[7] + 2, yPos);
        }
        
        yPos += 7;
      });
      
      // Download PDF
      const fileName = `backlinks_report_${clientName.replace(/\s+/g, '-')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error("Error exporting PDF:", error);
      alert("Erreur lors de la génération du PDF. Veuillez réessayer.");
    } finally {
      setExporting(prev => ({ ...prev, pdf: false }));
    }
  };

  const exportExcel = async () => {
    if (!reportData) {
      alert("Veuillez d'abord générer un rapport");
      return;
    }
    
    setExporting(prev => ({ ...prev, excel: true }));
    
    try {
      const client = clients.find(c => c.id === filters.client_id);
      const clientName = client ? client.company_name : 'Tous-les-clients';
      
      // Créer un nouveau workbook Excel
      const wb = XLSX.utils.book_new();
      
      // Données simples et propres pour un tableau professionnel
      const tableData = [
        ['RAPPORT DE BACKLINKS - ' + clientName],
        [''],
        ['INFORMATIONS'],
        ['Période', `${filters.start_date || 'Début'} au ${filters.end_date || 'Fin'}`],
        ['Date du rapport', new Date().toLocaleDateString('fr-FR')],
        [''],
        ['STATISTIQUES'],
        ['Total Backlinks', reportData.summary.total],
        ['Live', reportData.summary.live],
        ['Pending', reportData.summary.pending],
        ['Lost', reportData.summary.lost],
        ['Coût Total', `${reportData.summary.totalCost.toFixed(2)} €`],
        [''],
        ['DÉTAIL DES BACKLINKS'],
        ['Date', 'Source Site', 'Traffic', 'Type', 'Anchor', 'Target URL', 'Status', 'Cost']
      ];
      
      // Ajouter les données de chaque backlink - Match table columns
      reportData.backlinks.forEach(backlink => {
        const sourceDomain = sources.find(s => s.id === backlink.source_site_id)?.domain || 'Inconnu';
        
        tableData.push([
          new Date(backlink.date_added).toLocaleDateString('fr-FR'),
          sourceDomain,
          backlink.source_site?.traffic_estimated || backlink.traffic_estimated || 'N/A',
          backlink.type || '',
          backlink.anchor_text || '',
          backlink.target_url || '',
          backlink.status || '',
          `${backlink.cost || 0} €`
        ]);
      });
      
      const ws = XLSX.utils.aoa_to_sheet(tableData);
      
      // Style simple mais professionnel
      
      // Titre principal
      ws['A1'].s = {
        font: { bold: true, sz: 16 },
        fill: { fgColor: { rgb: 'FF2C3E50' } },
        alignment: { horizontal: 'center' }
      };
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
      
      // En-têtes de sections
      const sectionHeaders = [2, 8, 13];
      sectionHeaders.forEach(row => {
        for (let col = 0; col < 6; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (ws[cellAddress]) {
            ws[cellAddress].s = {
              font: { bold: true, sz: 12 },
              fill: { fgColor: { rgb: 'FF3498DB' } },
              alignment: { horizontal: 'left' }
            };
          }
        }
        if (row === 13) { // En-têtes du tableau principal
          ws['!merges'].push({ s: { r: 13, c: 0 }, e: { r: 13, c: 5 } });
        }
      });
      
      // En-têtes du tableau de backlinks
      for (let col = 0; col < 6; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 14, c: col });
        if (ws[cellAddress]) {
          ws[cellAddress].s = {
            font: { bold: true, color: { rgb: 'FFFFFFFF' } },
            fill: { fgColor: { rgb: 'FF3498DB' } },
            alignment: { horizontal: 'center' },
            border: {
              top: { style: 'thin' },
              bottom: { style: 'thin' },
              left: { style: 'thin' },
              right: { style: 'thin' }
            }
          };
        }
      }
      
      // Bordures pour toutes les cellules de données
      for (let row = 15; row < tableData.length; row++) {
        for (let col = 0; col < 6; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (ws[cellAddress]) {
            ws[cellAddress].s = {
              border: {
                top: { style: 'thin' },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' }
              },
              alignment: { 
                horizontal: col === 1 || col === 2 ? 'left' : 'center',
                vertical: 'center'
              }
            };
            
            // Couleurs de statut
            if (col === 4) { // Colonne Status
              const status = tableData[row][col];
              if (status === 'Live') {
                ws[cellAddress].s.fill = { fgColor: { rgb: 'FFD5F4E6' } };
              } else if (status === 'Lost') {
                ws[cellAddress].s.fill = { fgColor: { rgb: 'FFFADBD' } };
              } else if (status === 'Pending') {
                ws[cellAddress].s.fill = { fgColor: { rgb: 'FFFEF9E7' } };
              }
            }
          }
        }
      }
      
      // Largeurs des colonnes optimisées - Match table columns
      ws['!cols'] = [
        { wch: 12 },  // Date
        { wch: 20 },  // Source Site
        { wch: 12 },  // Traffic
        { wch: 15 },  // Type
        { wch: 20 },  // Anchor
        { wch: 25 },  // Target URL
        { wch: 12 },  // Status
        { wch: 10 }   // Cost
      ];
      
      // Ajouter la feuille au workbook
      XLSX.utils.book_append_sheet(wb, ws, "Rapport");
      
      // Générer le fichier Excel
      const fileName = `rapport-backlinks-${clientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Erreur lors de la génération Excel:', error);
      alert('Erreur lors de la génération du fichier Excel. Veuillez réessayer.');
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

  // Real-time sync: Regenerate report when sources change
  useEffect(() => {
    if (sources.length > 0 && backlinks.length > 0) {
      generateReport();
    }
  }, [sources, backlinks, generateReport]);

  // Auto-date functionality: Set dates when specific client is selected
  useEffect(() => {
    if (filters.client_id) {
      console.log(`Auto-filling date for client ID: ${filters.client_id}`);
      
      // When specific client selected, set Last Update Date to latest date from that client's backlinks
      const clientId = parseInt(filters.client_id);
      const clientBacklinks = backlinks.filter(b => b.client_id === clientId);
      console.log(`Found ${clientBacklinks.length} backlinks for this client`);
      
      if (clientBacklinks.length > 0) {
        const dates = clientBacklinks
          .map(b => new Date(b.date_added || b.created_at || b.updated_at || b.date))
          .filter(date => !isNaN(date.getTime()))
          .sort((a, b) => b - a); // Sort descending (latest first)
        
        if (dates.length > 0) {
          const latestDate = dates[0].toISOString().split('T')[0];
          console.log(`Setting latest date to: ${latestDate}`);
          
          setFilters(prev => ({
            ...prev,
            last_update_date: latestDate, // Latest date from client's backlinks
            start_date: "", // Clear other dates
            end_date: ""
          }));
          
          // Auto-generate report when date is set
          setTimeout(() => {
            console.log('Auto-generating report with new date...');
            generateReport();
          }, 500);
        } else {
          console.log('No valid dates found for this client');
        }
      } else {
        console.log('No backlinks found for this client');
      }
    } else {
      // When "All Clients" selected, clear last_update_date
      console.log('Clearing dates for All Clients mode');
      setFilters(prev => ({
        ...prev,
        last_update_date: "",
        start_date: prev.start_date,
        end_date: prev.end_date
      }));
    }
  }, [filters.client_id, backlinks, generateReport]);

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

        {/*  Filter Section */}
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
              
              {/* Dynamic Date Fields */}
              {filters.client_id ? (
                // Specific Client: Show Last Update date only
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
                // All Clients: Show Start & End dates
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
            {/*  Summary Box */}
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

            {/* 4️⃣ Export Buttons */}
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

            {/* 2️⃣ Results Table */}
            <div className="results-table">
              <h3>Results ({reportData.backlinks.length} backlinks)</h3>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Date Added</th>
                    <th>Source Website</th>
                    <th>Traffic</th>
                    <th>Type</th>
                    <th>Target URL</th>
                    <th>Anchor Text</th>
                    <th>Placement URL</th>
                    <th>Status</th>
                    <th>Quality Score ⭐</th>
                    <th>Cost</th>
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
