import { useState, useEffect } from "react";
import api from "../../api/api";
import Navbar from "../../components/Navbar";
import "./Backlinks.css";

export default function Backlinks() {
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

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

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
      // Get quality score and traffic from selected source
      const source = sources.find(s => s.id === formData.source_site_id);
      const submitData = {
        ...formData,
        quality_score: source?.quality_score || 3,
        traffic_estimated: parseInt(source?.traffic_estimated || source?.traffic || 0) // Fixed: Ensure integer and not null
      };
      
      const res = await api.post("/backlinks", submitData);
      setBacklinks([...backlinks, res.data]);
      resetForm();
      setShowForm(false);
      alert("Backlink added successfully!");
      
      // Real-time sync: Refresh data to ensure consistency
      fetchBacklinks();
    } catch (error) {
      alert("Error adding backlink");
    }
  };

  const updateBacklink = async (e) => {
    e.preventDefault();
    try {
      // Get quality score and traffic from selected source
      const source = sources.find(s => s.id === formData.source_site_id);
      const submitData = {
        ...formData,
        quality_score: source?.quality_score || 3,
        traffic_estimated: parseInt(source?.traffic_estimated || source?.traffic || 0) // Fixed: Ensure integer and not null
      };
      
      const res = await api.put(`/backlinks/${editingBacklink.id}`, submitData);
      setBacklinks(backlinks.map(b => b.id === editingBacklink.id ? res.data : b));
      resetForm();
      setEditingBacklink(null);
      setShowForm(false);
      alert("Backlink updated successfully!");
      
      // Real-time sync: Refresh data to ensure consistency
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

  const getStatusColor = (status) => {
    switch(status) {
      case 'Live': return 'status-live';
      case 'Pending': return 'status-pending';
      case 'Lost': return 'status-lost';
      default: return 'status-pending';
    }
  };

  useEffect(() => { 
    fetchBacklinks(); fetchClients(); fetchSources(); 
  }, []);

  // Auto-fill quality_score and traffic_estimated when source site is selected
  useEffect(() => {
    if (formData.source_site_id && sources.length > 0) {
      const selectedSource = sources.find(source => source.id === parseInt(formData.source_site_id));
      if (selectedSource) {
        console.log("🔄 Auto-fetching source data:", selectedSource);
        setFormData(prev => ({
          ...prev,
          quality_score: selectedSource.quality_score || 3,
          traffic_estimated: selectedSource.traffic_estimated || 0
        }));
      }
    }
  }, [formData.source_site_id, sources]);

  // Real-time sync: Update sources when quality is manually changed
  useEffect(() => {
    if (formData.source_site_id && formData.quality_score) {
      const sourceIndex = sources.findIndex(s => s.id === parseInt(formData.source_site_id));
      if (sourceIndex !== -1) {
        // Update the source quality in real-time
        const updatedSources = [...sources];
        updatedSources[sourceIndex] = {
          ...updatedSources[sourceIndex],
          quality_score: formData.quality_score
        };
        setSources(updatedSources);
      }
    }
  }, [formData.quality_score]);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="backlinks">
      <Navbar />
      <div className="backlinks-content">
        <div className="backlinks-header">
          <h2>Backlinks Management</h2>
          <button className="add-backlink-btn" onClick={() => { resetForm(); setEditingBacklink(null); setShowForm(!showForm); }}>
            {editingBacklink ? 'Edit Backlink' : 'Add Backlink'}
          </button>
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
                <input value={formData.target_url} onChange={e=>setFormData({...formData, target_url: e.target.value})} placeholder="Target URL" required />
                <input value={formData.anchor_text} onChange={e=>setFormData({...formData, anchor_text: e.target.value})} placeholder="Anchor Text" />
              </div>
              <div className="form-row">
                <select value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value})}>
                  <option value="Guest Post">Guest Post</option>
                  <option value="Directory">Directory</option>
                  <option value="Profile">Profile</option>
                  <option value="Comment">Comment</option>
                  <option value="Other">Other</option>
                </select>
                <input value={formData.placement_url} onChange={e=>setFormData({...formData, placement_url: e.target.value})} placeholder="Placement URL (exact URL where backlink is located)" />
              </div>
              <div className="form-row">
                <input type="date" value={formData.date_added} onChange={e=>setFormData({...formData, date_added: e.target.value})} />
                <select value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value})}>
                  <option value="Live">Live</option>
                  <option value="Pending">Pending</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>
              <div className="form-row">
                <input type="number" value={formData.cost} onChange={e=>setFormData({...formData, cost: e.target.value})} placeholder="Cost (0 = Free)" />
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
              </div>
              
              <div className="form-row">
                <div className="traffic-container">
                  <label className="traffic-label">Traffic: {(formData.traffic_estimated || 0).toLocaleString()} visitors/month 📊</label>
                  <div className="traffic-display">
                    <span className="traffic-value">{(formData.traffic_estimated || 0).toLocaleString()}</span>
                    <span className="traffic-unit">visitors/month</span>
                  </div>
                  <small className="traffic-note">Auto-fetched from source website data</small>
                </div>
              </div>
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
    </div>
  );
}