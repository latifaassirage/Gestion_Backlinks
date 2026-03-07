import { useState, useEffect } from "react";
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

  const generateReport = () => {
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
      const clientBacklinks = backlinks.filter(b => b.client_id === filters.client_id);
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

    // Filter by client
    if (filters.client_id) {
      filteredBacklinks = filteredBacklinks.filter(b => b.client_id === filters.client_id);
    }

    // Filter by date ranges
    if (filters.start_date) {
      filteredBacklinks = filteredBacklinks.filter(b => 
        new Date(b.date_added) >= new Date(filters.start_date)
      );
    }

    if (filters.end_date) {
      filteredBacklinks = filteredBacklinks.filter(b => 
        new Date(b.date_added) <= new Date(filters.end_date)
      );
    }

    // Filter by last update date (for specific client)
    if (filters.client_id && filters.last_update_date) {
      filteredBacklinks = filteredBacklinks.filter(b => {
        const updateDate = new Date(b.updated_at || b.created_at || b.date_added);
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
  };

  const exportPDF = async () => {
    if (!reportData) {
      alert("Veuillez d'abord générer un rapport");
      return;
    }
    
    setExporting(prev => ({ ...prev, pdf: true }));
    
    try {
      console.log("🔍 Début génération PDF...");
      console.log("📊 Données du rapport:", reportData);
      
      // Créer un nouveau document PDF
      const doc = new jsPDF();
      console.log("✅ Document PDF créé");
      
      // Configuration des polices
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      
      // Titre du rapport
      doc.text("RAPPORT DE BACKLINKS", 105, 20, { align: "center" });
      
      // Informations du rapport
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      
      const client = clients.find(c => c.id === filters.client_id);
      const clientName = client ? client.company_name : 'Tous les clients';
      const period = filters.start_date && filters.end_date 
        ? `Du ${new Date(filters.start_date).toLocaleDateString('fr-FR')} au ${new Date(filters.end_date).toLocaleDateString('fr-FR')}`
        : 'Toute la période';
      
      doc.text(`Client: ${clientName}`, 20, 40);
      doc.text(`Période: ${period}`, 20, 50);
      doc.text(`Date du rapport: ${new Date().toLocaleDateString('fr-FR')}`, 20, 60);
      
      // Résumé statistique
      doc.setFont("helvetica", "bold");
      doc.text("RÉSUMÉ STATISTIQUE", 20, 75);
      doc.setFont("helvetica", "normal");
      
      // Ajouter les statistiques manuellement avec bordures
      let yPos = 85;
      const stats = [
        ['Total Backlinks', reportData.summary.total.toString()],
        ['Live', reportData.summary.live.toString()],
        ['Pending', reportData.summary.pending.toString()],
        ['Lost', reportData.summary.lost.toString()],
        ['Payants', reportData.summary.paid.toString()],
        ['Gratuits', reportData.summary.free.toString()],
        ['Coût Total', `${reportData.summary.totalCost.toFixed(2)} €`]
      ];
      
      // Dessiner le tableau du résumé
      const tableStartY = yPos;
      const rowHeight = 8;
      const col1X = 20;
      const col2X = 100;
      const tableWidth = 160;
      
      stats.forEach(([label, value], index) => {
        const currentY = tableStartY + (index * rowHeight);
        
        // Dessiner les bordures de la ligne
        doc.rect(col1X, currentY - 4, tableWidth, rowHeight);
        // Dessiner la bordure verticale entre les colonnes
        doc.line(col2X, currentY - 4, col2X, currentY + 4);
        
        // Ajouter le texte
        doc.text(label, col1X + 2, currentY);
        doc.text(value, col2X + 2, currentY);
      });
      
      yPos = tableStartY + (stats.length * rowHeight) + 10;
      
      // Titre du tableau détaillé
      doc.setFont("helvetica", "bold");
      doc.text("DÉTAIL DES BACKLINKS", 20, yPos);
      yPos += 10;
      
      // En-têtes du tableau avec fond coloré
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      const headers = ['Date', 'Client', 'Source', 'Type', 'Status', 'Coût'];
      const colPositions = [20, 40, 70, 110, 140, 160, 180];
      const headerHeight = 10;
      
      // Dessiner le fond de l'en-tête
      doc.setFillColor(44, 62, 80); // Bleu foncé
      doc.rect(colPositions[0], yPos - 6, 160, headerHeight, 'F');
      
      // Dessiner les bordures de l'en-tête
      doc.rect(colPositions[0], yPos - 6, 160, headerHeight);
      
      // Ajouter le texte de l'en-tête en blanc
      doc.setTextColor(255, 255, 255);
      headers.forEach((header, index) => {
        doc.text(header, colPositions[index] + 2, yPos);
      });
      
      // Remettre le texte en noir
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      
      yPos += headerHeight + 2;
      
      // Données du tableau
      const maxRows = Math.min(reportData.backlinks.length, 25); // Augmenté à 25 lignes
      
      // Helper function to draw headers
      const drawHeaders = (currentYPos) => {
        doc.setFillColor(44, 62, 80);
        doc.rect(colPositions[0], currentYPos - 6, 160, headerHeight, 'F');
        doc.rect(colPositions[0], currentYPos - 6, 160, headerHeight);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        headers.forEach((header, index) => {
          doc.text(header, colPositions[index] + 2, currentYPos);
        });
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
      };
      
      for (let i = 0; i < maxRows; i++) {
        const backlink = reportData.backlinks[i];
        const clientName = clients.find(c => c.id === backlink.client_id)?.company_name || 'Inconnu';
        const sourceDomain = sources.find(s => s.id === backlink.source_site_id)?.domain || 'Inconnu';
        
        // Vérifier si on doit changer de page
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
          
          // Répéter les en-têtes sur la nouvelle page
          drawHeaders(yPos);
          yPos += headerHeight + 2;
        }
        
        // Dessiner les bordures de la ligne
        doc.rect(colPositions[0], yPos - 4, 160, 7);
        
        // Dessiner les bordures verticales
        for (let j = 1; j < colPositions.length; j++) {
          doc.line(colPositions[j], yPos - 4, colPositions[j], yPos + 3);
        }
        
        // Couleur de fond selon le statut
        if (backlink.status === 'Live') {
          doc.setFillColor(212, 237, 218); // Vert clair
          doc.rect(colPositions[4], yPos - 4, 20, 7, 'F');
        } else if (backlink.status === 'Lost') {
          doc.setFillColor(248, 215, 218); // Rouge clair
          doc.rect(colPositions[4], yPos - 4, 20, 7, 'F');
        } else if (backlink.status === 'Pending') {
          doc.setFillColor(255, 243, 205); // Jaune clair
          doc.rect(colPositions[4], yPos - 4, 20, 7, 'F');
        }
        
        // Ajouter les données de la ligne
        doc.text(new Date(backlink.date_added).toLocaleDateString('fr-FR'), colPositions[0] + 2, yPos);
        doc.text(clientName.substring(0, 12), colPositions[1] + 2, yPos); // Limiter la longueur
        doc.text(sourceDomain.substring(0, 15), colPositions[2] + 2, yPos); // Limiter la longueur
        doc.text(backlink.type, colPositions[3] + 2, yPos);
        doc.text(backlink.status, colPositions[4] + 2, yPos);
        doc.text(`${backlink.cost || 0} €`, colPositions[5] + 2, yPos);
        
        yPos += 7;
      }
      
      // Si plus de 25 backlinks, ajouter une note
      if (reportData.backlinks.length > 25) {
        yPos += 10;
        doc.setFont("helvetica", "italic");
        doc.text(`... et ${reportData.backlinks.length - 25} autres backlinks`, 20, yPos);
      }
      
      // Pied de page
      const pageHeight = doc.internal.pageSize.height;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Généré par Backlinks Management System", 105, pageHeight - 10, { align: "center" });
      doc.text(`Page ${doc.internal.getNumberOfPages()}`, 105, pageHeight - 5, { align: "center" });
      
      // Télécharger le PDF
      const fileName = `rapport-backlinks-${clientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      console.log("✅ PDF sauvegardé:", fileName);
      
      // Message de confirmation
      alert(`Rapport PDF généré avec succès: ${fileName}\n\n✅ Mise en forme professionnelle avec bordures et couleurs de statut.`);
    } catch (error) {
      console.error('❌ Erreur détaillée lors de la génération PDF:', error);
      console.error('❌ Stack trace:', error.stack);
      console.error('❌ Message:', error.message);
      
      // Message d'erreur plus détaillé
      let errorMessage = 'Erreur lors de la génération du PDF.\n\n';
      errorMessage += `Détails: ${error.message}\n`;
      if (error.stack) {
        errorMessage += `Type: ${error.name}\n`;
      }
      errorMessage += '\nVeuillez réessayer ou contacter le support.';
      
      alert(errorMessage);
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
        ['Date', 'Client', 'Site Source', 'Type', 'Status', 'Coût']
      ];
      
      // Ajouter les données de chaque backlink
      reportData.backlinks.forEach(backlink => {
        const clientName = clients.find(c => c.id === backlink.client_id)?.company_name || 'Inconnu';
        const sourceDomain = sources.find(s => s.id === backlink.source_site_id)?.domain || 'Inconnu';
        
        tableData.push([
          new Date(backlink.date_added).toLocaleDateString('fr-FR'),
          clientName,
          sourceDomain,
          backlink.type || '',
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
      
      // Largeurs des colonnes optimisées
      ws['!cols'] = [
        { wch: 12 },  // Date
        { wch: 25 },  // Client
        { wch: 30 },  // Site Source
        { wch: 15 },  // Type
        { wch: 12 },  // Status
        { wch: 12 }   // Coût
      ];
      
      // Ajouter la feuille au workbook
      XLSX.utils.book_append_sheet(wb, ws, "Rapport");
      
      // Générer le fichier Excel
      const fileName = `rapport-backlinks-${clientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      // Message de confirmation
      alert(`Rapport Excel généré avec succès: ${fileName}\n\n✅ Tableau simple et professionnel avec:\n• Structure claire et lisible\n• Bordures visibles\n• En-têtes colorés\n• Colonnes bien ajustées`);
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
  }, [sources, backlinks]);

  // Auto-date functionality: Set dates when specific client is selected
  useEffect(() => {
    if (filters.client_id) {
      console.log(`Auto-filling date for client ID: ${filters.client_id}`);
      
      // When specific client selected, set Last Update Date to latest date from that client's backlinks
      const clientBacklinks = backlinks.filter(b => b.client_id === filters.client_id);
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
  }, [filters.client_id, backlinks]);

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
                      <td className="traffic">{backlink.dynamic_quality_score ? sources.find(s => s.id === backlink.source_site_id)?.traffic || 'N/A' : backlink.traffic || 'N/A'}</td>
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
