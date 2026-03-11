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
    last_update_date: "" 
  });
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';
  
  if (isAdmin && false) { 
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

  
  const exportPDF = async () => {
    try {
      setExporting(prev => ({ ...prev, pdf: true }));
      
     
      const client = filters.client_id 
        ? clients.find(c => c.id === parseInt(filters.client_id))
        : null;
      const clientName = client ? client.company_name : 'tous-les-clients';

      const params = {
        start_date: filters.start_date,
        end_date: filters.end_date
      };
      
      let url = '/reports/pdf';
      if (filters.client_id) {
        url += `/${filters.client_id}`;
      }
      
      // طلب الملف كـ Blob
      const response = await api.post(url, params, { responseType: 'blob' });
      
      // إنشاء رابط وتحميل الملف
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const fileName = `rapport-backlinks-${clientName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Erreur lors de la génération du PDF");
    } finally {
      setExporting(prev => ({ ...prev, pdf: false }));
    }
  };

 
  const exportExcel = async () => {
    try {
      setExporting(prev => ({ ...prev, excel: true }));
      
      
      const client = filters.client_id 
        ? clients.find(c => c.id === parseInt(filters.client_id))
        : null;
      const clientName = client ? client.company_name : 'tous-les-clients';

      const params = {
        start_date: filters.start_date,
        end_date: filters.end_date
      };
      
      let url = '/reports/excel';
      if (filters.client_id) {
        url += `/${filters.client_id}`;
      }
      
      
      const response = await api.post(url, params, { responseType: 'blob' });
      
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const fileName = `rapport-backlinks-${clientName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
      
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (error) {
      console.error("Error generating Excel:", error);
      alert("Erreur lors de la génération du fichier Excel/CSV");
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