import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import Navbar from "../../components/Navbar";
import "./SourceSites.css";

export default function SourceSites() {
  const navigate = useNavigate();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [formData, setFormData] = useState({
    domain: '',
    quality_score: 5,
    dr: null,
    traffic_estimated: null,
    spam_score: 0,
    notes: ''
  });

  const fetchSources = async () => {
    try {
      const res = await api.get("/sources");
      setSources(res.data);
    } catch (error) {
      console.error("Error fetching sources:", error);
      setSources([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSource = async (e) => {
    e.preventDefault();
    console.log("=== SOUMISSION FORMULAIRE ===");
    console.log("FormData actuel:", formData);
    console.log("EditingSource:", editingSource);
    console.log("Mode:", editingSource ? "MISE À JOUR" : "CRÉATION");
    
    try {
      if (editingSource) {
        // Mode mise à jour - PUT request
        console.log("=== MODE MISE À JOUR ===");
        console.log("ID à mettre à jour:", editingSource.id);
        console.log("URL de la requête:", `/sources/${editingSource.id}`);
        console.log("Données envoyées:", formData);
        
        const res = await api.put(`/sources/${editingSource.id}`, formData);
        console.log("Réponse mise à jour:", res.data);
        
        // Mettre à jour la liste locale
        setSources(sources.map(s => s.id === editingSource.id ? res.data : s));
        alert('Site source mis à jour avec succès!');
        console.log("=== MISE À JOUR TERMINÉE ===");
        
      } else {
        // Mode création - POST request
        console.log("=== MODE CRÉATION ===");
        console.log("Données envoyées:", formData);
        
        const res = await api.post("/sources", formData);
        console.log("Réponse création:", res.data);
        
        // Ajouter à la liste locale
        setSources([...sources, res.data]);
        alert('Site source ajouté avec succès!');
        console.log("=== CRÉATION TERMINÉE ===");
      }
      
      // Réinitialiser le formulaire
      resetForm();
      
    } catch (error) {
      console.error("=== ERREUR SAUVEGARDE ===");
      console.error("Erreur complète:", error);
      if (error.response) {
        console.error("Erreur response:", error.response.data);
        console.error("Status:", error.response.status);
      }
      alert("Erreur lors de la sauvegarde du site source");
    }
  };

  const handleEdit = (source) => {
    console.log("=== DÉBUT ÉDITION SITE SOURCE ===");
    console.log("Source sélectionné:", source);
    console.log("ID du source:", source.id);
    
    // Pré-remplir avec les données existantes du backend
    const formDataToSet = {
      domain: source.domain || '',
      quality_score: source.quality_score || 5,
      dr: source.dr || null,
      traffic_estimated: source.traffic_estimated || null,
      spam_score: source.spam_score !== undefined ? source.spam_score : 0,
      notes: source.notes || ''
    };
    
    console.log("--- FORMULAIRE PRÉ-REMPLI ---");
    console.log("Domain:", formDataToSet.domain);
    console.log("Quality Score:", formDataToSet.quality_score);
    console.log("DR:", formDataToSet.dr);
    console.log("Traffic:", formDataToSet.traffic_estimated);
    console.log("Spam Score:", formDataToSet.spam_score);
    console.log("Notes:", formDataToSet.notes);
    
    setEditingSource(source);
    setFormData(formDataToSet);
    setShowAddForm(true);
    
    console.log("=== FIN ÉDITION - Formulaire prêt pour modification ===");
    console.log("Champs modifiables: Type, Spam Score");
    console.log("Champs non-modifiables: Website URL, Contact Email, Cost (récupérés automatiquement)");
  };

  const handleBackToBacklinks = () => {
    console.log("=== RETOUR VERS BACKLINKS ===");
    console.log("Navigation vers /admin/backlinks");
    navigate('/admin/backlinks');
  };

  const resetForm = () => {
    console.log("=== RESET FORMULAIRE ===");
    setFormData({
      domain: '',
      quality_score: 5,
      dr: null,
      traffic_estimated: null,
      spam_score: 0,
      notes: ''
    });
    setEditingSource(null);
    setShowAddForm(false);
    console.log("=== FORMULAIRE RÉINITIALISÉ ===");
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const formatCost = (cost) => {
    if (cost === 0 || cost === "0" || cost === null || cost === undefined) {
      return <span className="cost-free">FREE</span>;
    }
    return <span className="cost-paid">${cost}</span>;
  };

  const getTypeBadge = (type) => {
    const isDoFollow = type && type.toLowerCase() === 'dofollow';
    return (
      <span className={`type-badge ${isDoFollow ? 'dofollow' : 'nofollow'}`}>
        {isDoFollow ? 'DoFollow' : 'NoFollow'}
      </span>
    );
  };

  const getSpamScoreColor = (score) => {
    const numScore = parseInt(score) || 0;
    return numScore > 30 ? 'spam-danger' : 'spam-safe';
  };

  if (loading) {
    return (
      <div className="source-sites">
        <Navbar />
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="source-sites">
      <Navbar />
      <div className="source-sites-content">
        <div className="source-sites-header">
          <h2>Source Sites Management</h2>
          <div className="header-buttons">
            <button className="add-source-btn" onClick={() => {
              if (showAddForm && editingSource) {
                resetForm(); // Reset completely if switching from edit to add
              } else {
                setShowAddForm(!showAddForm);
              }
            }}>
              {showAddForm ? 'Cancel' : 'Add Source'}
            </button>
            <button className="back-btn" onClick={handleBackToBacklinks}>
              ← Back to Backlinks
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="add-source-form">
            <h3>{editingSource ? 'Edit Source Site' : 'Add New Source Site'}</h3>
            <form onSubmit={handleAddSource}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Domain *</label>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => setFormData({...formData, domain: e.target.value})}
                    placeholder="example.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Quality Score *</label>
                  <select
                    value={formData.quality_score}
                    onChange={(e) => setFormData({...formData, quality_score: parseInt(e.target.value)})}
                    required
                  >
                    <option value="1">1 - Very Low</option>
                    <option value="2">2 - Low</option>
                    <option value="3">3 - Medium</option>
                    <option value="4">4 - High</option>
                    <option value="5">5 - Very High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>DR (Domain Rating)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.dr || ''}
                    onChange={(e) => setFormData({...formData, dr: e.target.value ? parseInt(e.target.value) : null})}
                    placeholder="0-100"
                  />
                </div>
                <div className="form-group">
                  <label>Traffic Estimated</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.traffic_estimated || ''}
                    onChange={(e) => setFormData({...formData, traffic_estimated: e.target.value ? parseInt(e.target.value) : null})}
                    placeholder="Monthly visitors"
                  />
                </div>
                <div className="form-group">
                  <label>Spam Score *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.spam_score}
                    onChange={(e) => setFormData({...formData, spam_score: parseInt(e.target.value) || 0})}
                    placeholder="0-100"
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="submit-btn">
                  {editingSource ? 'Update Source' : 'Add Source'}
                </button>
                <button type="button" className="cancel-btn" onClick={resetForm}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="source-sites-table-container">
          {sources.length === 0 ? (
            <div className="no-sources">
              <p>No source sites found.</p>
            </div>
          ) : (
            <table className="source-sites-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Quality Score</th>
                  <th>DR</th>
                  <th>Traffic</th>
                  <th>Spam %</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.id}>
                    <td className="domain-cell">
                      <a 
                        href={`https://${source.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="domain-link"
                      >
                        {source.domain}
                      </a>
                    </td>
                    <td>
                      <span className={`quality-score score-${source.quality_score}`}>
                        {source.quality_score}/5
                      </span>
                    </td>
                    <td>{source.dr || '-'}</td>
                    <td>{source.traffic_estimated ? source.traffic_estimated.toLocaleString() : '-'}</td>
                    <td className="spam-score-cell">
                      <span className={`spam-score ${getSpamScoreColor(source.spam_score)}`}>
                        {source.spam_score || 0}%
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button 
                        className="edit-btn" 
                        onClick={() => handleEdit(source)}
                        title="Modifier ce site source"
                      >
                        Modifier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
