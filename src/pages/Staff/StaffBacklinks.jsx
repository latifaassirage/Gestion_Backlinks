import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
    date_added: new Date().toISOString().split('T')[0], // Fixed: Use date_added instead of date
    status: "Pending",
    cost: "",
    quality_score: 3,
    traffic: 0 // Added traffic field
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-fill quality_score when source site is selected
  useEffect(() => {
    if (formData.source_site_id && sources.length > 0) {
      const selectedSource = sources.find(source => source.id === parseInt(formData.source_site_id));
      if (selectedSource && selectedSource.quality_score) {
        setFormData(prev => ({
          ...prev,
          quality_score: selectedSource.quality_score
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

  // Auto-fill traffic when source site is selected
  useEffect(() => {
    if (formData.source_site_id && sources.length > 0) {
      const selectedSource = sources.find(source => source.id === parseInt(formData.source_site_id));
      if (selectedSource) {
        setFormData(prev => ({
          ...prev,
          traffic: parseInt(selectedSource.traffic || selectedSource.traffic_estimated || 0) // Auto-fill traffic from source
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
      // Données fictives pour le développement
      setBacklinks([
        {
          id: 1,
          client_id: 1,
          source_site_id: 1,
          source_site: { id: 1, domain: "Digitalmarketing.com", quality_score: 4, traffic: 50000 },
          client: { id: 1, company_name: "Digital Agency" },
          quality_score: 4,
          traffic: 50000,
          type: "Guest Post",
          target_url: "https://clienta.com",
          anchor_text: "best service",
          placement_url: "https://example.com/blog/post",
          date: "2024-01-15",
          status: "Live",
          cost: 150
        }
      ]);
      setClients([
        { id: 1, company_name: "Client A", website: "https://clienta.com" },
        { id: 2, company_name: "Client B", website: "https://clientb.com" }
      ]);
      setSources([
        { id: 1, domain: "Digitalmarketing.com", quality_score: 4, traffic: 50000 },
        { id: 2, domain: "SEOExperts.com", quality_score: 5, traffic: 75000 },
        { id: 3, domain: "BacklinkPro.com", quality_score: 3, traffic: 25000 }
      ]);
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
    
    // Vérification des doublons
    if (!editingBacklink && checkDuplicate(formData.client_id, formData.source_site_id)) {
      const sourceSite = sources.find(s => s.id === formData.source_site_id);
      const confirmDuplicate = window.confirm(
        `Un backlink existe déjà pour ce client sur le site "${sourceSite?.domain || 'Site inconnu'}". Voulez-vous continuer ?`
      );
      if (!confirmDuplicate) {
        return;
      }
    }

    try {
      // Get quality score and traffic from selected source
      const source = sources.find(s => s.id === formData.source_site_id);
      const submitData = {
        ...formData,
        quality_score: source?.quality_score || 3,
        traffic: parseInt(source?.traffic || source?.traffic_estimated || 0) // Fixed: Ensure integer and not null
      };
      
      if (editingBacklink) {
        await api.put(`/backlinks/${editingBacklink.id}`, submitData);
        alert("Backlink modifié avec succès !");
      } else {
        await api.post("/backlinks", submitData);
        alert("Backlink ajouté avec succès !");
      }
      
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving backlink:", error);
      
      // Handle specific error cases - Keep error alerts
      if (error.response) {
        if (error.response.status === 409) {
          alert("Erreur: Ce backlink existe déjà pour ce client sur ce site source.");
        } else if (error.response.status === 422) {
          const errors = error.response.data.errors;
          const errorMessages = Object.values(errors).flat().join('\n');
          alert("Erreur de validation:\n" + errorMessages);
        } else if (error.response.status === 500) {
          alert("Erreur serveur: Veuillez réessayer plus tard.");
        } else {
          alert(`Erreur: ${error.response.data.message || 'Erreur lors de l\'enregistrement du backlink'}`);
        }
      } else if (error.request) {
        alert("Erreur réseau: Vérifiez votre connexion internet.");
      } else {
        alert("Erreur lors de l'enregistrement du backlink: " + error.message);
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
      date_added: backlink.date_added || backlink.date, // Fixed: Use date_added
      status: backlink.status,
      cost: backlink.cost,
      quality_score: backlink.quality_score || 3,
      traffic: parseInt(backlink.traffic || 0) // Added traffic field
    });
    setShowForm(true);
  };

  // Le staff ne peut pas supprimer de backlinks

  const resetForm = () => {
    setFormData({
      client_id: "",
      source_site_id: "",
      type: "Guest Post",
      target_url: "",
      anchor_text: "",
      placement_url: "",
      date_added: new Date().toISOString().split('T')[0], // Fixed: Use date_added
      status: "Pending",
      cost: "",
      quality_score: 3,
      traffic: 0 // Added traffic field
    });
    setEditingBacklink(null);
    setShowForm(false);
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.company_name : "Client inconnu";
  };

  if (loading) {
    return (
      <div className="staff-backlinks">
        <StaffNavbar />
        <div className="loading">Loading backlinks...</div>
      </div>
    );
  }

  return (
    <div className="staff-backlinks">
      <StaffNavbar />
      <div className="page-header">
        <div className="header-content">
          <h1>Backlinks Management</h1>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowForm(!showForm)}
        >
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
                <select 
                  value={formData.client_id} 
                  onChange={(e) => handleClientChange(e.target.value)}
                  required
                >
                  <option value="">Select a client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Source Site *</label>
                <select 
                  value={formData.source_site_id} 
                  onChange={(e) => handleSourceChange(e.target.value)}
                  required
                >
                  <option value="">Select a source site</option>
                  {sources.map(source => (
                    <option key={source.id} value={source.id}>
                      {source.domain} (Quality: {source.quality_score || 3}/5, Traffic: {source.traffic_estimated || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Quality Score (Auto-filled from Source)</label>
                <div className="quality-score-container">
                  <div className="quality-label">Quality Score: {formData.quality_score} ⭐</div>
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
                  <div className="quality-stars">
                    <span className={`quality-score score-${formData.quality_score}`}>
                      {'★'.repeat(formData.quality_score)}{'☆'.repeat(5 - formData.quality_score)}
                    </span>
                    <span className="score-text"> ({formData.quality_score}/5)</span>
                  </div>
                  <select 
                    value={formData.quality_score} 
                    onChange={(e) => setFormData({...formData, quality_score: parseInt(e.target.value)})}
                    className="quality-select"
                  >
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} ⭐</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Type *</label>
                <select 
                  value={formData.type} 
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  required
                >
                  <option value="Guest Post">Guest Post</option>
                  <option value="Directory">Directory</option>
                  <option value="Comment">Comment</option>
                  <option value="Forum">Forum</option>
                  <option value="Social">Social Media</option>
                  <option value="Other">Autre</option>
                </select>
              </div>

              <div className="form-group">
                <label>Target URL *</label>
                <input 
                  type="url" 
                  placeholder="https://client-website.com/page"
                  value={formData.target_url} 
                  onChange={(e) => setFormData({...formData, target_url: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Anchor Text *</label>
                <input 
                  type="text" 
                  placeholder="Anchor text"
                  value={formData.anchor_text} 
                  onChange={(e) => setFormData({...formData, anchor_text: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Placement URL *</label>
                <input 
                  type="url" 
                  placeholder="https://example.com/where-link-placed"
                  value={formData.placement_url} 
                  onChange={(e) => setFormData({...formData, placement_url: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Date *</label>
                <input 
                  type="date" 
                  value={formData.date_added} 
                  onChange={(e) => setFormData({...formData, date_added: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Statut *</label>
                <select 
                  value={formData.status} 
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  required
                >
                  <option value="Pending">En attente</option>
                  <option value="Live">Actif</option>
                  <option value="Lost">Perdu</option>
                  <option value="Live">Live</option>
                  <option value="Lost">Lost</option>
                  <option value="Live">Live</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>

              <div className="form-group">
                <label>Cost ($) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="150.00"
                  value={formData.cost} 
                  onChange={(e) => setFormData({...formData, cost: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-success">
                {editingBacklink ? "Edit" : "Add"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="backlinks-table">
        <h2>Backlinks List ({backlinks.length})</h2>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Site Source</th>
                <th>Traffic</th>
                <th>Quality</th>
                <th>Type</th>
                <th>Anchor Text</th>
                <th>Status</th>
                <th>Date</th>
                <th>Coût</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {backlinks.map(backlink => (
                <tr key={backlink.id}>
                  <td>{getClientName(backlink.client_id)}</td>
                  <td>
                    <a href={backlink.source_site?.domain || backlink.source_site} target="_blank" rel="noopener noreferrer">
                      {backlink.source_site?.domain || backlink.source_site}
                    </a>
                  </td>
                  <td>
                    {(() => {
                      const source = sources.find(s => s.id === backlink.source_site_id);
                      return source?.traffic_estimated || backlink.source_site?.traffic_estimated || backlink.traffic || 'N/A';
                    })()}
                  </td>
                  <td>
                    <span className={`quality-score score-${(() => {
                      const source = sources.find(s => s.id === backlink.source_site_id);
                      return source?.quality_score || 1;
                    })()}`}>
                      {(() => {
                        const source = sources.find(s => s.id === backlink.source_site_id);
                        const score = source?.quality_score || 1;
                        return '⭐'.repeat(score) + '☆'.repeat(5 - score);
                      })()}
                    </span>
                  </td>
                  <td>{backlink.type}</td>
                  <td>{backlink.anchor_text}</td>
                  <td>
                    <span className={`status status-${backlink.status.toLowerCase()}`}>
                      {backlink.status}
                    </span>
                  </td>
                  <td>{new Date(backlink.date_added || backlink.created_at || backlink.date).toLocaleDateString('fr-FR')}</td>
                  <td>{backlink.cost}€</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn btn-sm btn-edit" 
                        onClick={() => handleEdit(backlink)}
                      >
                        Edit
                      </button>
                      {/* Le staff ne peut pas supprimer selon le cahier des charges */}
                    </div>
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
