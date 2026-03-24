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
  
  const [dynamicTypes, setDynamicTypes] = useState([]);
  
  // État pour la visibilité des colonnes configurée par l'admin
  const [columnVisibility, setColumnVisibility] = useState({
    client: true,
    source_site: true,
    traffic: true,
    quality: true,
    type: true,
    status: true,
    date: true,
    cost: true,
    actions: true,
  });
  
  const [formData, setFormData] = useState({
    client_id: "",
    source_site_id: "",
    type: "",
    target_url: "",
    anchor_text: "",
    placement_url: "",
    date_added: new Date().toISOString().split('T')[0],
    status: "Pending",
    cost: "",
    quality_score: 3,
    traffic_estimated: 0
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
    fetchColumnVisibilitySettings();
  }, []);

  const fetchColumnVisibilitySettings = async () => {
    try {
      const response = await api.get('/settings/staff-column-visibility');
      const settings = response.data;
      
      console.log('Raw settings from API:', settings);
      
      // Map backend settings to frontend column names
      const mappedSettings = {
        client: settings.client || true,
        source_site: settings.source || true, // Map 'source' to 'source_site'
        traffic: settings.traffic || true,
        quality: settings.quality || true,
        type: settings.type || true,
        status: settings.status || true,
        date: settings.date_added || true, // Map 'date_added' to 'date'
        cost: settings.cost || true,
        actions: true, // Actions column is always visible
      };
      
      console.log('Mapped settings for frontend:', mappedSettings);
      setColumnVisibility(mappedSettings);
    } catch (error) {
      console.error('Error fetching column visibility settings:', error);
      // Utiliser les valeurs par défaut si l'API échoue
    }
  };

  useEffect(() => {
    if (formData.source_site_id && sources.length > 0) {
      const selectedSource = sources.find(source => source.id === parseInt(formData.source_site_id));
      if (selectedSource) {
        console.log(" Auto-fetching source data:", selectedSource);
        setFormData(prev => ({
          ...prev,
          quality_score: selectedSource.quality_score || 3,
          traffic_estimated: parseInt(selectedSource.traffic_estimated || selectedSource.traffic || 0)
        }));
      }
    }
  }, [formData.source_site_id, sources]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [backlinksRes, clientsRes, sourcesRes] = await Promise.all([
        api.get("/backlinks"),
        api.get("/clients"),
        api.get("/sources")
      ]);
      setBacklinks(backlinksRes.data.data || []);
      setClients(clientsRes.data.data || []);
      setSources(sourcesRes.data.data || []);
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
        `A backlink already exists for this client on "${sourceSite?.domain || 'Unknown site'}". Continue?`
      );
      if (!confirmDuplicate) return;
    }

    try {
      let submitData;
      
      if (editingBacklink) {
        submitData = {
          ...formData,
          quality_score: formData.quality_score,
          traffic_estimated: parseInt(formData.traffic_estimated || 0)
        };
        console.log("📝 Editing backlink with data:", submitData);
      } else {
        const source = sources.find(s => s.id === formData.source_site_id);
        submitData = {
          ...formData,
          quality_score: source?.quality_score || 3,
          traffic_estimated: parseInt(source?.traffic_estimated || source?.traffic || 0)
        };
        console.log("➕ Adding new backlink with data:", submitData);
      }
      
      if (editingBacklink) {
        await api.put(`/backlinks/${editingBacklink.id}`, submitData);
        alert("Backlink updated successfully!");
      } else {
        await api.post("/backlinks", submitData);
        alert("Backlink added successfully!");
      }
      
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving backlink:", error);
      alert("Error saving backlink. Please check console for details.");
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
      cost: backlink.cost,
      quality_score: backlink.quality_score || 3,
      traffic_estimated: parseInt(backlink.traffic_estimated || 0)
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
      cost: "",
      quality_score: 3,
      traffic_estimated: 0
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
      <div className="page-header">
        <h1>Backlinks Management</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "Add Backlink"}
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => setColumnVisibility(prev => ({...prev, cost: !prev.cost}))}
            title="Toggle Cost Column"
          >
            {columnVisibility.cost ? 'Hide Cost' : 'Show Cost'}
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => setColumnVisibility(prev => ({...prev, quality: !prev.quality}))}
            title="Toggle Quality Column"
          >
            {columnVisibility.quality ? 'Hide Quality' : 'Show Quality'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="backlink-form">
          <h2>{editingBacklink ? "Edit Backlink" : "Add Backlink"}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Client *</label>
                <select value={formData.client_id} onChange={(e) => handleClientChange(e.target.value)} required>
                  <option value="">Select a client</option>
                  {clients.map(client => <option key={client.id} value={client.id}>{client.company_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Source Site *</label>
                <select value={formData.source_site_id} onChange={(e) => handleSourceChange(e.target.value)} required>
                  <option value="">Select a source site</option>
                  {sources.map(source => <option key={source.id} value={source.id}>{source.domain}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Type *</label>
                <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} required>
                  <option value="">Select Type</option>
                  {dynamicTypes.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Target URL *</label>
                <input type="url" value={formData.target_url} onChange={(e) => setFormData({...formData, target_url: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Anchor Text *</label>
                <input type="text" value={formData.anchor_text} onChange={(e) => setFormData({...formData, anchor_text: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Placement URL *</label>
                <input type="url" value={formData.placement_url} onChange={(e) => setFormData({...formData, placement_url: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Date *</label>
                <input type="date" value={formData.date_added} onChange={(e) => setFormData({...formData, date_added: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Status *</label>
                <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} required>
                  <option value="Pending">Pending</option>
                  <option value="Live">Live</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>
              <div className="form-group">
                <label>Cost ($) *</label>
                <input type="number" step="0.01" value={formData.cost} onChange={(e) => setFormData({...formData, cost: e.target.value})} required />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-success">{editingBacklink ? "Update" : "Add"}</button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="backlinks-table">
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                {columnVisibility.client && <th>Client</th>}
                {columnVisibility.source_site && <th>Source Site</th>}
                {columnVisibility.traffic && <th>Traffic</th>}
                {columnVisibility.quality && <th>Quality</th>}
                {columnVisibility.type && <th>Type</th>}
                {columnVisibility.status && <th>Status</th>}
                {columnVisibility.date && <th>Date</th>}
                {columnVisibility.cost && <th>Cost</th>}
                {columnVisibility.actions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {backlinks.map(backlink => (
                <tr key={backlink.id}>
                  {columnVisibility.client && <td>{getClientName(backlink.client_id)}</td>}
                  {columnVisibility.source_site && <td>{backlink.source_site?.domain || backlink.source_site}</td>}
                  {columnVisibility.traffic && <td>{(backlink.source_site?.traffic_estimated || backlink.traffic_estimated || 0).toLocaleString()}</td>}
                  {columnVisibility.quality && <td>{'⭐'.repeat(backlink.source_site?.quality_score || backlink.quality_score || 3)}</td>}
                  {columnVisibility.type && <td>{backlink.type}</td>}
                  {columnVisibility.status && <td>{backlink.status}</td>}
                  {columnVisibility.date && <td>{new Date(backlink.date_added || backlink.date).toLocaleDateString()}</td>}
                  {columnVisibility.cost && <td>{backlink.cost}€</td>}
                  {columnVisibility.actions && <td><button className="btn btn-sm btn-edit" onClick={() => handleEdit(backlink)}>Edit</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
