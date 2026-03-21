import { useState, useEffect } from "react";
import api from "../../api/api";
import Navbar from "../../components/Navbar";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import "./Backlinks.css";

export default function Backlinks() {
  const [backlinks, setBacklinks] = useState([]);
  const [clients, setClients] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBacklink, setEditingBacklink] = useState(null);
  const [showSourceSitesView, setShowSourceSitesView] = useState(false);
  
  const [dynamicTypes, setDynamicTypes] = useState([]);
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");

  const [formData, setFormData] = useState({
    client_id: "",
    source_site_id: "",
    type: "Guest Post",
    link_type: "DoFollow",
    target_url: "",
    anchor_text: "",
    placement_url: "",
    date_added: new Date().toISOString().split('T')[0],
    status: "Pending",
    cost: "",
    quality_score: 3,
    traffic_estimated: 0
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const fetchTypes = async () => {
    try {
      const res = await api.get("/backlink-types");
      setDynamicTypes(res.data);
    } catch (error) {
      console.error("Error fetching types:", error);
    }
  };

  const handleAddNewType = async () => {
    if (!newTypeName.trim()) {
      alert('Veuillez entrer un nom de type');
      return;
    }
    
    // Vérifier si le type existe déjà (casse insensible)
    const existingTypes = [
      'Guest Post', 'Directory', 'Profile', 'Comment',
      ...dynamicTypes.map(t => t.name.toLowerCase())
    ];
    
    if (existingTypes.includes(newTypeName.toLowerCase().trim())) {
      alert('Ce type existe déjà !');
      return;
    }
    
    try {
      const res = await api.post("/backlink-types", { name: newTypeName.trim() });
      setDynamicTypes([...dynamicTypes, res.data]);
      setFormData({ ...formData, type: res.data.name });
      setNewTypeName("");
      setShowAddType(false);
    } catch (error) {
      alert("Erreur lors de l'ajout du type");
    }
  };

  const handleDeleteType = async (typeId, typeName) => {
    if (window.confirm(`Supprimer le type "${typeName}" ?`)) {
      try {
        await api.delete(`/backlink-types/${typeId}`);
        setDynamicTypes(dynamicTypes.filter(t => t.id !== typeId));
        
        // Si le type supprimé était sélectionné, réinitialiser à vide
        if (formData.type === typeName) {
          setFormData({ ...formData, type: "" });
        }
        
        alert('Type supprimé avec succès');
      } catch (error) {
        console.error("Error deleting type:", error);
        
        // Gérer les erreurs spécifiques du backend
        if (error.response?.status === 422) {
          // Le type est utilisé par des backlinks
          alert(error.response.data.message || 'Ce type ne peut pas être supprimé car il est utilisé par des backlinks existants.');
        } else if (error.response?.status === 404) {
          alert('Type non trouvé ou déjà supprimé');
        } else {
          alert("Erreur lors de la suppression du type");
        }
      }
    }
  };

  const fetchBacklinks = async () => {
    try {
      const res = await api.get("/backlinks");
      setBacklinks(res.data);
    } catch (error) {
      console.error("Error fetching backlinks:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const checkDuplicate = (clientId, sourceId, excludeId = null) => {
    return backlinks.some(backlink => 
      backlink.client_id === clientId && 
      backlink.source_site_id === sourceId && 
      backlink.id !== excludeId
    );
  };

  const addBacklink = async (e) => {
    e.preventDefault();
    if (checkDuplicate(formData.client_id, formData.source_site_id)) {
      const sourceSite = sources.find(s => s.id === formData.source_site_id);
      const confirmDuplicate = window.confirm(
        `⚠️ This client already has a backlink on "${sourceSite?.domain || 'Unknown site'}".\n\nDo you want to continue adding another backlink on the same source?`
      );
      if (!confirmDuplicate) return;
    }

    try {
      const source = sources.find(s => s.id === formData.source_site_id);
      const submitData = {
        ...formData,
        quality_score: source?.quality_score || 3,
        traffic_estimated: parseInt(source?.traffic_estimated || source?.traffic || 0) 
      };
      const res = await api.post("/backlinks", submitData);
      setBacklinks([...backlinks, res.data]);
      resetForm();
      setShowForm(false);
      alert("Backlink added successfully!");
      fetchBacklinks();
    } catch (error) {
      alert("Error adding backlink");
    }
  };

  const updateBacklink = async (e) => {
    e.preventDefault();
    try {
      const source = sources.find(s => s.id === formData.source_site_id);
      const submitData = {
        ...formData,
        quality_score: source?.quality_score || 3,
        traffic_estimated: parseInt(source?.traffic_estimated || source?.traffic || 0)
      };
      const res = await api.put(`/backlinks/${editingBacklink.id}`, submitData);
      setBacklinks(backlinks.map(b => b.id === editingBacklink.id ? res.data : b));
      resetForm();
      setEditingBacklink(null);
      setShowForm(false);
      alert("Backlink updated successfully!");
      fetchBacklinks();
    } catch (error) {
      alert("Error updating backlink");
    }
  };

  const deleteBacklink = async (id) => {
    if (window.confirm("Are you sure?")) {
      try {
        await api.delete(`/backlinks/${id}`);
        setBacklinks(backlinks.filter(b => b.id !== id));
      } catch (error) {
        alert("Error deleting backlink");
      }
    }
  };

  const editBacklink = (backlink) => {
    setEditingBacklink(backlink);
    setFormData({ ...backlink });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      source_site_id: "",
      type: "Guest Post",
      link_type: "DoFollow",
      target_url: "",
      anchor_text: "",
      placement_url: "",
      date_added: new Date().toISOString().split('T')[0],
      status: "Pending",
      cost: "",
      quality_score: 3,
      traffic_estimated: 0
    });
  };

  const handleTypeChange = async (sourceId, newType) => {
    // Find the backlink associated with this source
    const associatedBacklink = backlinks.find(b => b.source_site_id === sourceId);
    
    if (!associatedBacklink) {
      // If no backlink exists, we can't update the type
      alert('No backlink found for this source site. Please create a backlink first.');
      return;
    }

    try {
      // Update the backlink type with only the required fields
      const res = await api.put(`/backlinks/${associatedBacklink.id}`, {
        client_id: associatedBacklink.client_id,
        source_site_id: associatedBacklink.source_site_id,
        type: newType,
        target_url: associatedBacklink.target_url,
        anchor_text: associatedBacklink.anchor_text,
        placement_url: associatedBacklink.placement_url,
        date_added: associatedBacklink.date_added,
        status: associatedBacklink.status,
        cost: associatedBacklink.cost,
        quality_score: associatedBacklink.quality_score,
        traffic_estimated: associatedBacklink.traffic_estimated
      });
      
      // Update the backlinks array
      setBacklinks(backlinks.map(b => b.id === associatedBacklink.id ? res.data : b));
      console.log('Type updated successfully!');
    } catch (error) {
      console.error('Error updating backlink type:', error);
      alert('Error updating type');
    }
  };

  const handleLinkTypeChange = async (sourceId, newLinkType) => {
    // Find the backlink associated with this source
    const associatedBacklink = backlinks.find(b => b.source_site_id === sourceId);
    
    if (!associatedBacklink) {
      // If no backlink exists, we can't update the link type
      alert('No backlink found for this source site. Please create a backlink first.');
      return;
    }

    try {
      // Update the backlink link_type with only the required fields
      const res = await api.put(`/backlinks/${associatedBacklink.id}`, {
        client_id: associatedBacklink.client_id,
        source_site_id: associatedBacklink.source_site_id,
        type: associatedBacklink.type,
        link_type: newLinkType,
        target_url: associatedBacklink.target_url,
        anchor_text: associatedBacklink.anchor_text,
        placement_url: associatedBacklink.placement_url,
        date_added: associatedBacklink.date_added,
        status: associatedBacklink.status,
        cost: associatedBacklink.cost,
        quality_score: associatedBacklink.quality_score,
        traffic_estimated: associatedBacklink.traffic_estimated
      });
      
      // Update the backlinks array
      setBacklinks(backlinks.map(b => b.id === associatedBacklink.id ? res.data : b));
      console.log('Link type updated successfully!');
    } catch (error) {
      console.error('Error updating backlink link type:', error);
      alert('Error updating link type');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Live': return 'status-live';
      case 'Pending': return 'status-pending';
      case 'Lost': return 'status-lost';
      default: return 'status-pending';
    }
  };

  useEffect(() => { 
    fetchBacklinks(); fetchClients(); fetchSources(); fetchTypes();
  }, []);

  useEffect(() => {
    if (formData.source_site_id && sources.length > 0) {
      const selectedSource = sources.find(source => source.id === parseInt(formData.source_site_id));
      if (selectedSource) {
        setFormData(prev => ({
          ...prev,
          quality_score: selectedSource.quality_score || 3,
          traffic_estimated: selectedSource.traffic_estimated || 0
        }));
      }
    }
  }, [formData.source_site_id, sources]);

  useEffect(() => {
    if (formData.source_site_id && formData.quality_score) {
      const sourceIndex = sources.findIndex(s => s.id === parseInt(formData.source_site_id));
      if (sourceIndex !== -1) {
        const updatedSources = [...sources];
        updatedSources[sourceIndex] = {
          ...updatedSources[sourceIndex],
          quality_score: formData.quality_score
        };
        setSources(updatedSources);
      }
    }
  }, [formData.quality_score]);

  const exportToCSV = () => {
    // Prepare CSV data
    const csvData = sources.map(source => {
      // Find associated client through backlinks
      const associatedBacklink = backlinks.find(b => b.source_site_id === source.id);
      const associatedClient = associatedBacklink ? clients.find(c => c.id === associatedBacklink.client_id) : null;
      
      return {
        Website: source.domain,
        Cost: associatedBacklink?.cost || 0,
        LinkType: associatedBacklink?.link_type || 'DoFollow',
        ContactEmail: associatedClient?.contact_email || '-',
        SpamScore: source.spam_score || 0
      };
    });

    // Create CSV content with semicolon delimiter and UTF-8 BOM
    const headers = ['Website', 'Cost', 'Link Type', 'Contact Email', 'Spam Score'];
    const csvContent = [
      '\uFEFF' + headers.join(';'), // Add UTF-8 BOM for Excel
      ...csvData.map(row => [
        `"${row.Website}"`,
        row.Cost,
        `"${row.LinkType}"`,
        `"${row.ContactEmail}"`,
        row.SpamScore
      ].join(';'))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Generate filename with date
    const today = new Date().toLocaleDateString();
    const filename = `Backlinks_Report_${today}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    // Prepare PDF data
    const pdfData = sources.map(source => {
      // Find associated client through backlinks
      const associatedBacklink = backlinks.find(b => b.source_site_id === source.id);
      const associatedClient = associatedBacklink ? clients.find(c => c.id === associatedBacklink.client_id) : null;
      
      return [
        source.domain,
        `$${associatedBacklink?.cost || 0}`,
        associatedBacklink?.link_type || 'DoFollow',
        associatedClient?.contact_email || '-',
        `${source.spam_score || 0}%`
      ];
    });

    // Create PDF
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString();
    
    // Add title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Source Sites Summary Report', 14, 20);
    
    // Add date
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${today}`, 14, 30);
    
    // Add table using autoTable
    autoTable(doc, {
      head: [['Website', 'Cost', 'Type', 'Email', 'Spam']],
      body: pdfData,
      startY: 40,
      styles: {
        font: 'helvetica',
        fontSize: 10,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 40 }, // Website
        1: { cellWidth: 20, halign: 'right' }, // Cost
        2: { cellWidth: 25, halign: 'center' }, // Type
        3: { cellWidth: 50 }, // Email
        4: { cellWidth: 20, halign: 'center' } // Spam
      }
    });
    
    // Save PDF
    doc.save(`Backlinks_Report_${today}.pdf`);
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="backlinks">
      <Navbar />
      <div className="backlinks-content">
        <div className="backlinks-header">
          <h2>Backlinks Management</h2>
          <div className="header-buttons">
            <button className="source-sites-view-btn" onClick={() => setShowSourceSitesView(true)}>
              Source Sites View
            </button>
            <button className="add-backlink-btn" onClick={() => { resetForm(); setEditingBacklink(null); setShowForm(!showForm); }}>
              {editingBacklink ? 'Edit Backlink' : 'Add Backlink'}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="backlink-form-container">
            <form onSubmit={editingBacklink ? updateBacklink : addBacklink} className="backlink-form">
              <div className="form-row">
                <select value={formData.client_id} onChange={e=>setFormData({...formData, client_id: e.target.value})} required>
                  <option value="">Select Client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
                <select value={formData.source_site_id} onChange={e=>setFormData({...formData, source_site_id: e.target.value})} required>
                  <option value="">Select Source</option>
                  {sources.map(s => <option key={s.id} value={s.id}>{s.domain}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>TARGET URL</label>
                  <input value={formData.target_url} onChange={e=>setFormData({...formData, target_url: e.target.value})} placeholder="ex: https://monsite.com/page" required />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>ANCHOR TEXT</label>
                  <input value={formData.anchor_text} onChange={e=>setFormData({...formData, anchor_text: e.target.value})} placeholder="ex: Meilleure Agence SEO" />
                </div>
              </div>
              <div className="form-row">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>TYPE</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <select 
                          style={{ flex: 1, width: '100%' }}
                          value={formData.type} 
                          onChange={e=>setFormData({...formData, type: e.target.value})}
                        >
                          <option value="">Select Type</option>
                          {dynamicTypes.map(t => (
                            <option key={t.id} value={t.name}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                      {isAdmin && (
                        <>
                          <button 
                            type="button" 
                            onClick={() => setShowAddType(!showAddType)}
                            style={{
                              padding: '8px 12px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              backgroundColor: '#fff',
                              cursor: 'pointer',
                              fontSize: '16px',
                              fontWeight: 'bold',
                              minWidth: '40px',
                              height: '40px'
                            }}
                          >
                            +
                          </button>
                          {formData.type && (
                            <button
                              type="button"
                              onClick={() => {
                                const typeToDelete = dynamicTypes.find(t => t.name === formData.type);
                                if (typeToDelete && window.confirm(`Supprimer le type "${formData.type}" ?`)) {
                                  handleDeleteType(typeToDelete.id, formData.type);
                                }
                              }}
                              style={{
                                padding: '8px 12px',
                                border: '1px solid #dc3545',
                                borderRadius: '4px',
                                backgroundColor: '#fff',
                                color: '#dc3545',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                minWidth: '40px',
                                height: '40px'
                              }}
                              title={`Supprimer "${formData.type}"`}
                            >
                              -
                            </button>
                          )}
                        </>
                      )}
                    </div>

                  {isAdmin && showAddType && (
                    <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                      <input 
                        type="text" 
                        placeholder="ex: Press Release" 
                        value={newTypeName} 
                        onChange={e => setNewTypeName(e.target.value)} 
                        style={{ flex: 1 }}
                      />
                      <button type="button" onClick={handleAddNewType}>Add</button>
                    </div>
                  )}
                </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>LINK TYPE</label>
                  <select value={formData.link_type} onChange={e=>setFormData({...formData, link_type: e.target.value})}>
                    <option value="DoFollow">DoFollow</option>
                    <option value="NoFollow">NoFollow</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>PLACEMENT URL</label>
                  <input value={formData.placement_url} onChange={e=>setFormData({...formData, placement_url: e.target.value})} placeholder="ex: https://blog.com/article" />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>DATE ADDED</label>
                  <input type="date" value={formData.date_added} onChange={e=>setFormData({...formData, date_added: e.target.value})} />
                </div>
              </div>
              <div className="form-row">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>STATUS</label>
                  <select value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value})}>
                    <option value="Live">Live</option>
                    <option value="Pending">Pending</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>COST ($)</label>
                  <input type="number" value={formData.cost} onChange={e=>setFormData({...formData, cost: e.target.value})} placeholder="Cost (0 = Free)" />
                </div>
                {isAdmin && (
                  <div className="quality-score-container">
                    <label className="quality-label">Quality Score: {formData.quality_score} ⭐</label>
                    <div className="quality-progress-bar">
                      <div 
                        className="quality-progress-fill" 
                        style={{
                          width: `${(formData.quality_score / 5) * 100}%`,
                          backgroundColor: formData.quality_score >= 4 ? '#10B981' : 
                                         formData.quality_score >= 3 ? '#F59E0B' : '#EF4444'
                        }}
                      ></div>
                    </div>
                    <select 
                      value={formData.quality_score} 
                      onChange={e=>setFormData({...formData, quality_score: parseInt(e.target.value)})}
                      className="quality-select"
                    >
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} ⭐</option>)}
                    </select>
                  </div>
                )}
              </div>
              {isAdmin && (
                <div className="form-row">
                  <div className="traffic-container">
                    <label className="traffic-label">Traffic: {(formData.traffic_estimated || 0).toLocaleString()} visitors/month 📊</label>
                    <div className="traffic-display">
                      <span className="traffic-value">{(formData.traffic_estimated || 0).toLocaleString()}</span>
                      <span className="traffic-unit">visitors/month</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="form-actions">
                <button type="submit" className="submit-btn">Save</button>
                <button type="button" className="cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="backlinks-table-container">
          <table className="backlinks-table">
            <thead>
              <tr>
                <th>Client</th><th>Source</th><th>Date</th><th>Status</th><th>Cost</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backlinks.map(b => (
                <tr key={b.id}>
                  <td>{clients.find(c => c.id === b.client_id)?.company_name || '...'}</td>
                  <td>{sources.find(s => s.id === b.source_site_id)?.domain || '...'}</td>
                  <td>{new Date(b.date_added || b.created_at || b.date).toLocaleDateString('fr-FR')}</td>
                  <td><span className={`status ${getStatusColor(b.status)}`}>{b.status}</span></td>
                  <td>${b.cost || '0'}</td>
                  <td className="actions">
                    <button className="edit-btn" onClick={() => editBacklink(b)}>Edit</button>
                    {isAdmin && <button className="delete-btn" onClick={() => deleteBacklink(b.id)}>Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Source Sites View Modal */}
      {showSourceSitesView && (
        <div className="modal-overlay">
          <div className="modal source-sites-modal">
            <div className="modal-header">
              <div className="modal-header-left">
                <h3>Source Sites Summary</h3>
              </div>
              <div className="modal-header-right">
                <button className="export-csv-btn" onClick={exportToCSV}>
                  Export Excel
                </button>
                <button className="export-pdf-btn" onClick={exportToPDF}>
                  Export PDF
                </button>
                <button className="close-btn" onClick={() => setShowSourceSitesView(false)}>×</button>
              </div>
            </div>
            <div className="modal-content">
              <div className="source-sites-table-container">
                {sources.length === 0 ? (
                  <div className="no-sources">
                    <p>No source sites found</p>
                  </div>
                ) : (
                  <table className="source-sites-summary-table">
                    <thead>
                      <tr>
                        <th>Website</th>
                        <th>Cost</th>
                        <th>Link Type</th>
                        <th>Contact Email</th>
                        <th>Spam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sources.map(source => {
                        // Find associated client through backlinks
                        const associatedBacklink = backlinks.find(b => b.source_site_id === source.id);
                        const associatedClient = associatedBacklink ? clients.find(c => c.id === associatedBacklink.client_id) : null;
                        
                        return (
                          <tr key={source.id}>
                            <td className="website-cell">
                              <a href={`https://${source.domain}`} target="_blank" rel="noopener noreferrer">
                                {source.domain}
                              </a>
                            </td>
                            <td className="cost-cell">
                              ${associatedBacklink?.cost || '0'}
                            </td>
                            <td className="link-type-cell">
                              <select 
                                value={associatedBacklink?.link_type || 'DoFollow'} 
                                onChange={(e) => handleLinkTypeChange(source.id, e.target.value)}
                                className="link-type-dropdown"
                              >
                                <option value="DoFollow">DoFollow</option>
                                <option value="NoFollow">NoFollow</option>
                              </select>
                            </td>
                            <td className="email-cell">
                              {associatedClient?.contact_email || '-'}
                            </td>
                            <td className="spam-cell">
                              <span className={`spam-score ${source.spam_score > 30 ? 'spam-danger' : 'spam-safe'}`}>
                                {source.spam_score || 0}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}