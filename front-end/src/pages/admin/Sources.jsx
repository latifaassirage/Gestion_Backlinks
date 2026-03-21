import { useState, useEffect } from "react";
import api from "../../api/api";
import Navbar from "../../components/Navbar";
import "./Sources.css";


function AddSourceModal({ onClose, onSave, source }) {
  const [domain, setDomain] = useState(source?.domain || "");
  const [qualityScore, setQualityScore] = useState(source?.quality_score || 1);
  const [dr, setDr] = useState(source?.dr || "");
  const [traffic, setTraffic] = useState(source?.traffic_estimated || "");
  const [spamScore, setSpamScore] = useState(source?.spam_score || 0);
  const [notes, setNotes] = useState(source?.notes || "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newSource = {
      domain,
      quality_score: qualityScore,
      dr,
      traffic_estimated: traffic ? Number(traffic) : null,
      spam_score: Number(spamScore),
      notes
    };
    await onSave(newSource, source?.id);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ textAlign: 'right' }}>{source ? "Edit" : "Add"} Source Website</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Website URL</label>
              <input
                type="text"
                placeholder="Domain"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Quality Score</label>
              <select value={qualityScore} onChange={e => setQualityScore(Number(e.target.value))}>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">DR</label>
              <input
                type="text"
                placeholder="DR"
                value={dr}
                onChange={e => setDr(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Traffic</label>
              <input
                type="number"
                placeholder="Traffic"
                value={traffic}
                onChange={e => setTraffic(e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Spam Score (%)</label>
              <input
                type="number"
                placeholder="Spam Score (0-100)"
                value={spamScore}
                onChange={e => setSpamScore(e.target.value)}
                min="0"
                max="100"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                placeholder="Notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="form-actions" style={{ textAlign: 'right' }}>
            <button type="submit" className="submit-btn">Save</button>
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Sources() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSource, setEditingSource] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const fetchSources = async () => {
    try {
      const res = await api.get("/sources");
      setSources(res.data);
    } catch (error) {
      console.error("Error fetching sources:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSource = async (newSource, id) => {
    try {
      if (id) {
        // Edit
        const res = await api.put(`/sources/${id}`, newSource);
        setSources(prev => prev.map(s => s.id === id ? res.data : s));
      } else {
        // Add
        const res = await api.post("/sources", newSource);
        setSources(prev => [...prev, res.data]);
      }
    } catch (error) {
      console.error("Error saving source:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this source?")) return;
    try {
      await api.delete(`/sources/${id}`);
      setSources(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error("Error deleting source:", error);
    }
  };

  const renderQualityStars = (score) => "⭐".repeat(score) + "☆".repeat(5 - score);

  const getSpamScoreColor = (score) => {
    const numScore = parseInt(score) || 0;
    return numScore > 30 ? 'spam-danger' : 'spam-safe';
  };

  useEffect(() => { fetchSources(); }, []);

  if (loading) return <div className="loading">Loading sources...</div>;

  return (
    <div className="sources">
      <Navbar />
      <div className="sources-content">
        <div className="sources-header">
          <h2>Source Websites Management</h2>
          {isAdmin && (
            <button className="add-source-btn" onClick={() => { setEditingSource(null); setShowModal(true); }}>
              ➕ Add Source
            </button>
          )}
        </div>

        <div className="sources-table-container">
          {sources.length === 0 ? (
            <div className="no-sources">
              <p>No sources found</p>
              {isAdmin && <p>Click "Add Source" to create your first source website</p>}
            </div>
          ) : (
            <table className="sources-table">
              <thead>
                <tr>
                  <th>Domain</th>
                  <th>Quality Score</th>
                  <th>DR</th>
                  <th>Traffic</th>
                  <th>Spam Score</th>
                  <th>Notes</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {sources.map(source => (
                  <tr key={source.id}>
                    <td className="domain">
                      <a href={`https://${source.domain}`} target="_blank" rel="noopener noreferrer">
                        {source.domain}
                      </a>
                    </td>
                    <td className="quality-score">{renderQualityStars(source.quality_score)}</td>
                    <td className="dr">{source.dr || '-'}</td>
                    <td className="traffic">{source.traffic_estimated !== undefined && source.traffic_estimated !== null ? Number(source.traffic_estimated).toLocaleString() : '-'}</td>
                    <td className="spam-score">
                      <span className={`spam-score ${getSpamScoreColor(source.spam_score)}`}>
                        {source.spam_score || 0}%
                      </span>
                    </td>
                    <td className="notes">{source.notes || '-'}</td>
                    {isAdmin && (
                      <td className="actions">
                        <button className="edit-btn" onClick={() => { setEditingSource(source); setShowModal(true); }}>Edit</button>
                        <button className="delete-btn" onClick={() => handleDelete(source.id)}>Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {showModal && (
          <AddSourceModal
            onClose={() => setShowModal(false)}
            onSave={handleSaveSource}
            source={editingSource}
          />
        )}
      </div>
    </div>
  );
}