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
  const [formData, setFormData] = useState({
    client_id: "",
    source_site_id: "",
    type: "Guest Post",
    target_url: "",
    anchor_text: "",
    placement_url: "",
    date_added: new Date().toISOString().split('T')[0],
    status: "Pending",
    cost: "",
    quality_score: 3,
    traffic_estimated: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-fill quality_score and traffic_estimated when source site is selected
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
      setBacklinks(backlinksRes.data);
      setClients(clientsRes.data);
      setSources(sourcesRes.data);
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
        // When editing, preserve the current quality_score and traffic_estimated from formData
        submitData = {
          ...formData,
          quality_score: formData.quality_score,
          traffic_estimated: parseInt(formData.traffic_estimated || 0)
        };
        console.log("📝 Editing backlink with data:", submitData);
      } else {
        // When adding new backlink, fetch from source
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
      type: "Guest Post",
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
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Backlink"}
        </button>
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
                  <option value="Guest Post">Guest Post</option>
                  <option value="Directory">Directory</option>
                  <option value="Comment">Comment</option>
                  <option value="Forum">Forum</option>
                  <option value="Social">Social Media</option>
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
              <div className="form-group">
                <label>Quality Score</label>
                <input 
                  type="text" 
                  value={formData.quality_score ? '⭐'.repeat(formData.quality_score) : ''} 
                  readOnly 
                  style={{ 
                    backgroundColor: '#f5f5f5', 
                    cursor: 'not-allowed',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }} 
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  Auto-populated from source database (Read-only)
                </small>
              </div>
              <div className="form-group">
                <label>Traffic Est.</label>
                <input 
                  type="text" 
                  value={formData.traffic_estimated ? formData.traffic_estimated.toLocaleString() : ''} 
                  readOnly 
                  style={{ 
                    backgroundColor: '#f5f5f5', 
                    cursor: 'not-allowed'
                  }} 
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                  Auto-populated from source database (Read-only)
                </small>
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
                <th>Client</th>
                <th>Source Site</th>
                <th>Traffic</th>
                <th>Quality</th>
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
                  <td>{getClientName(backlink.client_id)}</td>
                  <td>{backlink.source_site?.domain || backlink.source_site}</td>
                  <td>{(backlink.source_site?.traffic_estimated || backlink.traffic_estimated || 0).toLocaleString()}</td>
                  <td>{'⭐'.repeat(backlink.source_site?.quality_score || backlink.quality_score || 3)}</td>
                  <td>{backlink.type}</td>
                  <td>{backlink.status}</td>
                  <td>{new Date(backlink.date_added || backlink.date).toLocaleDateString()}</td>
                  <td>{backlink.cost}€</td>
                  <td><button className="btn btn-sm btn-edit" onClick={() => handleEdit(backlink)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}