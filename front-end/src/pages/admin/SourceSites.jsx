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

  // S'assurer que sources est toujours un tableau
  const safeSources = Array.isArray(sources) ? sources : [];

  // États pour la pagination
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0
  });

  const [formData, setFormData] = useState({
    domain: '',
    quality_score: 5,
    dr: null,
    traffic_estimated: null,
    spam_score: 0,
    notes: ''
  });

  const fetchSources = async (page = 1) => {
    try {
      console.log("Fetching sources page:", page);
      const res = await api.get(`/sources?page=${page}&per_page=10`);
      console.log("API response:", res.data);
      console.log("Sources data type:", typeof res.data.data);
      console.log("Sources data:", res.data.data);
      setSources(res.data.data || []);
      setPagination({
        current_page: res.data.current_page || 1,
        last_page: res.data.last_page || 1,
        per_page: res.data.per_page || 10,
        total: res.data.total || 0
      });
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
        
        await api.put(`/sources/${editingSource.id}`, formData);
        alert('Site source mis à jour avec succès!');
        console.log("=== MISE À JOUR TERMINÉE ===");
        
      } else {
        // Mode création - POST request
        console.log("=== MODE CRÉATION ===");
        console.log("Données envoyées:", formData);
        
        await api.post("/sources", formData);
        alert('Site source ajouté avec succès!');
        console.log("=== CRÉATION TERMINÉE ===");
      }
      
      // Rafraîchir la liste avec pagination
      fetchSources(1);
      
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

  // Fonctions de navigation pour la pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.last_page) {
      fetchSources(newPage);
    }
  };

  const renderPaginationNumbers = () => {
    const { current_page, last_page } = pagination;
    const pages = [];
    
    // Afficher toujours la première page
    if (current_page > 3) {
      pages.push(1);
      if (current_page > 4) {
        pages.push('...');
      }
    }
    
    // Afficher les pages autour de la page actuelle
    for (let i = Math.max(1, current_page - 2); i <= Math.min(last_page, current_page + 2); i++) {
      pages.push(i);
    }
    
    // Afficher la dernière page
    if (current_page < last_page - 2) {
      if (current_page < last_page - 3) {
        pages.push('...');
      }
      pages.push(last_page);
    }
    
    return pages;
  };

  if (loading) {
    console.log("Loading state, sources type:", typeof sources);
    console.log("Loading state, sources:", sources);
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
                {(() => {
                  console.log("Rendering sources, type:", typeof safeSources);
                  console.log("Rendering sources:", safeSources);
                  return safeSources.map((source) => (
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
                  ));
                })()}
              </tbody>
            </table>
          )}
        </div>

        {/* Contrôles de pagination */}
        {sources.length > 0 && (
          <div className="pagination-controls">
            <div className="pagination-info">
              <span>
                Affichage de {((pagination.current_page - 1) * pagination.per_page) + 1} à{' '}
                {Math.min(pagination.current_page * pagination.per_page, pagination.total)} sur{' '}
                {pagination.total} résultats
              </span>
            </div>
            
            <div className="pagination-buttons">
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.current_page - 1)}
                disabled={pagination.current_page === 1}
              >
                Précédent
              </button>
              
              {renderPaginationNumbers().map((page, index) => (
                <button
                  key={index}
                  className={`pagination-btn ${page === pagination.current_page ? 'active' : ''} ${page === '...' ? 'disabled' : ''}`}
                  onClick={() => page !== '...' && handlePageChange(page)}
                  disabled={page === '...'}
                >
                  {page}
                </button>
              ))}
              
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(pagination.current_page + 1)}
                disabled={pagination.current_page === pagination.last_page}
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
