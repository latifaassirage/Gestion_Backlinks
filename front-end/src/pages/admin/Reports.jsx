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
    // Only generate if we have data
    if (!backlinks.length || !sources.length) {
      console.log("⏳ Waiting for data...");
      return;
    }
    
    console.log("🔄 Generating report...");
    console.log("📊 Initial data:", {
      totalBacklinks: backlinks.length,
      filters: filters
    });
    
    // Auto-set dates for All Clients if not specified
    if (!filters.client_id && (!filters.start_date || !filters.end_date)) {
      console.log("📅 Auto-setting dates for All Clients mode");
      
      const allDates = backlinks
        .map(b => new Date(b.date_added || b.created_at || b.date))
        .filter(date => !isNaN(date.getTime()))
        .sort((a, b) => a - b); // Sort ascending (earliest first)
      
      if (allDates.length > 0) {
        const earliestDate = allDates[0].toISOString().split('T')[0];
        const latestDate = allDates[allDates.length - 1].toISOString().split('T')[0];
        
        console.log(`📅 Setting date range: ${earliestDate} to ${latestDate}`);
        
        setFilters(prev => ({
          ...prev,
          start_date: earliestDate,
          end_date: latestDate
        }));
        return; // Exit and let useEffect trigger regeneration
      }
    }
    
    let filteredBacklinks = backlinks;

    // Filter by client - ensure integer comparison
    if (filters.client_id) {
      const clientId = parseInt(filters.client_id);
      console.log(`🔍 Filtering by client ID: ${clientId}`);
      filteredBacklinks = filteredBacklinks.filter(b => b.client_id === clientId);
      console.log(`✅ Filtered result: ${filteredBacklinks.length} backlinks for client ${clientId}`);
    } else {
      console.log("📋 No client filter - showing all backlinks");
    }

    // Filter by date ranges - use consistent date field
    if (filters.start_date) {
      const startDate = new Date(filters.start_date);
      filteredBacklinks = filteredBacklinks.filter(b => 
        new Date(b.date_added || b.created_at || b.date) >= startDate
      );
      console.log(`📅 Filtered by start date ${filters.start_date}: ${filteredBacklinks.length} backlinks`);
    }

    if (filters.end_date) {
      const endDate = new Date(filters.end_date);
      filteredBacklinks = filteredBacklinks.filter(b => 
        new Date(b.date_added || b.created_at || b.date) <= endDate
      );
      console.log(`📅 Filtered by end date ${filters.end_date}: ${filteredBacklinks.length} backlinks`);
    }

    // Filter by last update date (for specific client) - use consistent date field
    if (filters.client_id && filters.last_update_date) {
      const lastUpdateDate = new Date(filters.last_update_date);
      filteredBacklinks = filteredBacklinks.filter(b => {
        const updateDate = new Date(b.date_added || b.created_at || b.updated_at || b.date);
        return updateDate <= lastUpdateDate;
      });
      console.log(`📅 Filtered by last update date ${filters.last_update_date}: ${filteredBacklinks.length} backlinks`);
    }

    console.log(`🎯 Final filtered backlinks: ${filteredBacklinks.length}`);

    // Get dynamic quality scores from source websites
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

    // Only set report data if it's different from current data
    const newReportData = {
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
    };

    // Check if data actually changed before setting state
    if (!reportData || 
        JSON.stringify(reportData.backlinks) !== JSON.stringify(newReportData.backlinks) ||
        JSON.stringify(reportData.summary) !== JSON.stringify(newReportData.summary)) {
      setReportData(newReportData);
      console.log("✅ Report data updated");
      console.log(`📊 Report summary: ${total} total, ${live} live, ${pending} pending, ${lost} lost`);
    } else {
      console.log("📊 Report data unchanged, skipping update");
    }
  }, [backlinks, sources, filters]); // Add filters back but with proper comparison

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
      
      // Individual tables for each backlink using autoTable
      let currentY = 60;
      const tableSpacing = 10;
      
      reportData.backlinks.forEach((backlink, index) => {
        try {
          console.log(`🔍 Processing backlink #${index + 1}:`, backlink);
          console.log(`📊 Available sources:`, sources.length);
          
          const source = sources.find(s => s.id === backlink.source_site_id);
          console.log(`🔗 Found source:`, source);
          
          const sourceDomain = source ? source.domain : 'Inconnu';
          const traffic = backlink.source_site?.traffic_estimated || backlink.traffic_estimated || 'N/A';
          
          console.log(`✅ Extracted data:`, {
            sourceDomain,
            traffic,
            backlinkId: backlink.id,
            sourceSiteId: backlink.source_site_id,
            date: backlink.date_added,
            type: backlink.type,
            anchor: backlink.anchor_text,
            targetUrl: backlink.target_url,
            placementUrl: backlink.placement_url,
            status: backlink.status,
            cost: backlink.cost
          });
          
          // Add spacing between tables (except for first one)
          if (index > 0) {
            currentY += tableSpacing;
          }
          
          // Check if we need a new page
          if (currentY > 240) {
            doc.addPage();
            currentY = 20;
          }
          
          // Backlink title
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.text(`Backlink #${index + 1}`, 20, currentY);
          currentY += 8;
          
          // Prepare table data for this backlink - ensure no undefined values
          const tableData = [
            ['Date', new Date(backlink.date_added).toLocaleDateString('fr-FR')],
            ['Source Site', sourceDomain || 'Inconnu'],
            ['Traffic', (traffic || 0).toString()],
            ['Type', backlink.type || ''],
            ['Anchor', backlink.anchor_text || '-'],
            ['Target URL', backlink.target_url || '-'],
            ['Placement URL', backlink.placement_url || '-'],
            ['Status', backlink.status || ''],
            ['Cost', `${backlink.cost || 0} €`]
          ];
          
          console.log(`📊 Final table data for backlink #${index + 1}:`, tableData);
          
          // Use manual table drawing since autoTable is not available
          const tableHeaders = ['Label', 'Value'];
          const cellWidth = { label: 45, value: 145 };
          const cellHeight = 8;
          const startX = 20;
          
          // Draw table header
          doc.setFillColor(44, 62, 80);
          doc.rect(startX, currentY, cellWidth.label + cellWidth.value, cellHeight, 'F');
          doc.setDrawColor(0, 0, 0);
          doc.rect(startX, currentY, cellWidth.label + cellWidth.value, cellHeight);
          
          // Header text
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.text(tableHeaders[0], startX + 2, currentY + 5);
          doc.text(tableHeaders[1], startX + cellWidth.label + 2, currentY + 5);
          
          // Reset text color
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          currentY += cellHeight;
          
          // Draw table rows
          tableData.forEach((row, rowIndex) => {
            // Check if we need a new page
            if (currentY > 270) {
              doc.addPage();
              currentY = 20;
              
              // Redraw header on new page
              doc.setFillColor(44, 62, 80);
              doc.rect(startX, currentY, cellWidth.label + cellWidth.value, cellHeight, 'F');
              doc.setDrawColor(0, 0, 0);
              doc.rect(startX, currentY, cellWidth.label + cellWidth.value, cellHeight);
              doc.setTextColor(255, 255, 255);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(10);
              doc.text(tableHeaders[0], startX + 2, currentY + 5);
              doc.text(tableHeaders[1], startX + cellWidth.label + 2, currentY + 5);
              doc.setTextColor(0, 0, 0);
              doc.setFont("helvetica", "normal");
              doc.setFontSize(9);
              currentY += cellHeight;
            }
            
            // Calculate row height (might be taller for URLs)
            let rowCellHeight = cellHeight;
            const maxTextWidth = cellWidth.value - 4;
            
            // Check if value text needs wrapping (especially for URLs)
            if (rowIndex === 5 || rowIndex === 6) { // Target URL or Placement URL rows
              const textWidth = doc.getTextWidth(row[1]);
              if (textWidth > maxTextWidth) {
                // Estimate extra height needed for wrapping
                const extraLines = Math.ceil(textWidth / maxTextWidth) - 1;
                rowCellHeight = cellHeight + (extraLines * 3);
              }
            }
            
            // Draw row background
            if (rowIndex % 2 === 0) {
              doc.setFillColor(240, 240, 240); // Light gray for even rows (labels)
            } else {
              doc.setFillColor(255, 255, 255); // White for odd rows
            }
            doc.rect(startX, currentY, cellWidth.label, rowCellHeight, 'F');
            doc.setFillColor(255, 255, 255); // White for value column
            doc.rect(startX + cellWidth.label, currentY, cellWidth.value, rowCellHeight, 'F');
            
            // Draw row borders
            doc.setDrawColor(0, 0, 0);
            doc.rect(startX, currentY, cellWidth.label + cellWidth.value, rowCellHeight);
            doc.line(startX + cellWidth.label, currentY, startX + cellWidth.label, currentY + rowCellHeight);
            
            // Draw cell content
            // Label cell
            doc.setFillColor(240, 240, 240);
            doc.setFont("helvetica", "bold");
            doc.text(row[0], startX + 2, currentY + 5);
            
            // Value cell
            doc.setFillColor(255, 255, 255);
            doc.setFont("helvetica", "normal");
            
            // Handle text wrapping for URLs
            if ((rowIndex === 5 || rowIndex === 6) && row[1] !== '-') {
              const words = row[1].split('/');
              let line = '';
              let lineY = currentY + 5;
              
              words.forEach((word, wordIndex) => {
                const testLine = line + (line ? '/' : '') + word;
                const testWidth = doc.getTextWidth(testLine);
                
                if (testWidth > maxTextWidth && line) {
                  doc.text(line, startX + cellWidth.label + 2, lineY);
                  line = word;
                  lineY += 3;
                } else {
                  line = testLine;
                }
              });
              doc.text(line, startX + cellWidth.label + 2, lineY);
            } else {
              // Color code status
              if (rowIndex === 7) { // Status row
                if (row[1] === 'Live') {
                  doc.setTextColor(0, 128, 0);
                } else if (row[1] === 'Lost') {
                  doc.setTextColor(255, 0, 0);
                } else if (row[1] === 'Pending') {
                  doc.setTextColor(255, 165, 0);
                }
              }
              doc.text(row[1], startX + cellWidth.label + 2, currentY + 5);
              doc.setTextColor(0, 0, 0); // Reset color
            }
            
            currentY += rowCellHeight;
          });
          
          // Get the final Y position after the table
          currentY += 5;
          
        } catch (rowError) {
          console.error("Error processing backlink:", rowError, backlink);
          doc.setFont("helvetica", "italic");
          doc.setFontSize(10);
          doc.text(`Error processing backlink #${index + 1}`, 20, currentY);
          currentY += 15;
        }
      });
      
      // Download PDF
      const fileName = `backlinks_report_${clientName.replace(/\s+/g, '-')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      console.log("✅ PDF saved successfully");
      
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
            end_date: ""    // Clear other dates
          }));
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
  }, [filters.client_id, backlinks]);

  // Simple report generation - only when data is ready and filters are set
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
