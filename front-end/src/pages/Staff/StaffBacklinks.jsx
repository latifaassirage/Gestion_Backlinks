import { useState, useEffect } from "react";
import api from "../../api/api";
import StaffNavbar from "../../components/StaffNavbar";
import "./StaffBacklinks.css";

export default function StaffBacklinks() {
  const [backlinks, setBacklinks] = useState([]);
  const [clients, setClients] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBacklink, setEditingBacklink] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const itemsPerPage = 10;
  
  const [dynamicTypes, setDynamicTypes] = useState([]);
  
  const [formData, setFormData] = useState({
    client_id: "",
    source_site_id: "",
    type: "",
    target_url: "",
    anchor_text: "",
    placement_url: "",
    date_added: new Date().toISOString().split('T')[0],
    status: "Pending",
    cost: ""
  });

  const fetchTypes = async () => {
    try {
      const res = await api.get("/backlink-types");
      setDynamicTypes(res.data);
    } catch (error) {
      console.error("Error fetching types:", error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchTypes();
  }, []);

  const fetchData = async (page = 1) => {
    try {
      setLoading(true);
      const res = await Promise.all([
        api.get(`/backlinks?page=${page}&per_page=${itemsPerPage}`), // 
        api.get("/clients?page=1&per_page=50"), // 
        api.get("/sources?page=1&per_page=50")  // 
      ]);
      setBacklinks(res[0].data.data || []);
      setTotal(res[0].data.total || 0);
      setTotalPages(res[0].data.last_page || 1);
      setCurrentPage(res[0].data.current_page || 1);
      setClients(res[1].data.data || []);
      setSources(res[2].data.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setBacklinks([]);
      setClients([]);
      setSources([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClientChange = (clientId) => {
    setFormData({
      ...formData,
      client_id: clientId
    });
  };

  const handleSourceChange = (sourceId) => {
    setFormData({
      ...formData,
      source_site_id: sourceId
    });
  };

  const checkDuplicate = (clientId, sourceId) => {
    return backlinks.some(backlink => 
      backlink.client_id === clientId && 
      backlink.source_site_id === sourceId
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!editingBacklink && checkDuplicate(formData.client_id, formData.source_site_id)) {
      const sourceSite = sources.find(s => s.id === formData.source_site_id);
      const confirmDuplicate = window.confirm(
        `⚠️ Doublon détecté! Un backlink existe déjà pour ce client sur "${sourceSite?.domain || 'Site inconnu'}".\n\nVoulez-vous continuer malgré tout?`
      );
      if (!confirmDuplicate) return;
    }

    try {
      let submitData;
      
      if (editingBacklink) {
        
        submitData = {
          ...formData,
          link_type: "DoFollow"
        };
        console.log("📝 Editing backlink with data:", submitData);
      } else {
        
        const source = sources.find(s => s.id === formData.source_site_id);
        submitData = {
          ...formData,
          link_type: "DoFollow"
        };
        console.log("➕ Adding new backlink with data:", submitData);
      }
      
      if (editingBacklink) {
        await api.put(`/backlinks/${editingBacklink.id}`, submitData);
        alert("✅ Backlink updated successfully!");
      } else {
        await api.post("/backlinks", submitData);
        alert("✅ Backlink added successfully!");
      }
      
      resetForm();
      fetchData(currentPage);
    } catch (error) {
      console.error("Error saving backlink:", error);
      
      // Error handling
      if (error.response?.status === 401) {
        alert("❌ Session expired! Please reconnect.");
        // Redirect to login page if necessary
        window.location.href = '/login';
      } else if (error.response?.status === 403) {
        alert("❌ Access denied! You don't have permissions for this action.");
      } else if (error.response?.status === 409) {
        alert("❌ Duplicate detected! This backlink already exists.");
      } else {
        alert(`❌ Error saving: ${error.response?.data?.message || error.message || 'Please check the console for more details.'}`);
      }
    }
  };

  const handleEdit = (backlink) => {
    setEditingBacklink(backlink);
    setFormData({
      client_id: backlink.client_id,
      source_site_id: backlink.source_site_id,
      type: backlink.type,
      target_url: backlink.target_url,
      anchor_text: backlink.anchor_text,
      placement_url: backlink.placement_url,
      date_added: backlink.date_added || backlink.date,
      status: backlink.status,
      cost: backlink.cost
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      source_site_id: "",
      type: "",
      target_url: "",
      anchor_text: "",
      placement_url: "",
      date_added: new Date().toISOString().split('T')[0],
      status: "Pending",
      cost: ""
    });
    setEditingBacklink(null);
    setShowForm(false);
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.company_name : "Unknown Client";
  };

  if (loading) {
    return (
      <div className="staff-backlinks">
        <StaffNavbar />
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="staff-backlinks">
      <StaffNavbar />
      <div className="staff-backlinks-content">
        <div className="backlinks-header">
          <h1>Backlinks Management</h1>
          <div className="header-buttons">
            <button className="add-backlink-btn" onClick={() => { resetForm(); setEditingBacklink(null); setShowForm(!showForm); }}>
              {editingBacklink ? 'Edit Backlink' : 'Add Backlink'}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="backlink-form-container">
            <form onSubmit={handleSubmit} className="backlink-form">
              <h2>{editingBacklink ? "Edit Backlink" : "Add Backlink"}</h2>
              <div className="form-row">
                <select value={formData.client_id} onChange={(e) => handleClientChange(e.target.value)} required>
                  <option value="">Select Client</option>
                  {clients.map(client => <option key={client.id} value={client.id}>{client.company_name}</option>)}
                </select>
                <select value={formData.source_site_id} onChange={(e) => handleSourceChange(e.target.value)} required>
                  <option value="">Select Source</option>
                  {sources.map(source => <option key={source.id} value={source.id}>{source.domain}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>TARGET URL</label>
                  <input type="url" value={formData.target_url} onChange={(e) => setFormData({...formData, target_url: e.target.value})} placeholder="ex: https://monsite.com/page" required />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>ANCHOR TEXT</label>
                  <input type="text" value={formData.anchor_text} onChange={(e) => setFormData({...formData, anchor_text: e.target.value})} placeholder="ex: Meilleure Agence SEO" required />
                </div>
              </div>
              <div className="form-row">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>TYPE</label>
                  <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} required>
                    <option value="">Select Type</option>
                    {dynamicTypes.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>STATUS</label>
                  <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} required>
                    <option value="Pending">Pending</option>
                    <option value="Live">Live</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>PLACEMENT URL</label>
                  <input type="url" value={formData.placement_url} onChange={(e) => setFormData({...formData, placement_url: e.target.value})} placeholder="ex: https://blog.com/article" required />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>DATE ADDED</label>
                  <input type="date" value={formData.date_added} onChange={(e) => setFormData({...formData, date_added: e.target.value})} required />
                </div>
              </div>
              <div className="form-row">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>COST ($)</label>
                  <input type="number" min="0" step="0.01" value={formData.cost} onChange={(e) => setFormData({...formData, cost: e.target.value})} placeholder="Cost (0 = Free)" required />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="submit-btn">{editingBacklink ? "Update" : "Add"}</button>
                <button type="button" className="cancel-btn" onClick={resetForm}>Cancel</button>
              </div>
            </form>
          </div>
        )}
        <div className="backlinks-table-container">
          <table className="backlinks-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Source Site</th>
                <th>Type</th>
                <th>Status</th>
                <th>Date</th>
                <th>Cost</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backlinks.map(backlink => (
                <tr key={backlink.id}>
                  <td className="client-name">{getClientName(backlink.client_id)}</td>
                  <td className="source-domain">{backlink.source_site?.domain || backlink.source_site}</td>
                  <td><span className="type">{backlink.type}</span></td>
                  <td><span className={`status status-${backlink.status.toLowerCase()}`}>{backlink.status}</span></td>
                  <td className="date-added">{new Date(backlink.date_added || backlink.date).toLocaleDateString()}</td>
                  <td className="cost">
                    {backlink.cost == 0 || backlink.cost === "0" || backlink.cost === null || backlink.cost === undefined ? 
                      <span className="cost-free">Free</span> : 
                      `${backlink.cost}€`
                    }
                  </td>
                  <td className="actions">
                    <button className="edit-btn" onClick={() => handleEdit(backlink)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination-controls">
          <div className="pagination-info">
            <span>
              Affichage de {((currentPage - 1) * itemsPerPage) + 1} à{' '}
              {Math.min(currentPage * itemsPerPage, total)} sur{' '}
              {total} résultats
            </span>
          </div>
          
          <div className="pagination-buttons">
            <button 
              className="pagination-btn" 
              onClick={() => fetchData(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Précédent
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                onClick={() => fetchData(page)}
              >
                {page}
              </button>
            ))}
            
            <button 
              className="pagination-btn" 
              onClick={() => fetchData(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}