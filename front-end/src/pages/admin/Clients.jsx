import { useState, useEffect } from "react";
import api from "../../api/api"; 
import Navbar from "../../components/Navbar";
import "./Clients.css";
import "./Clients-responsive.css";

function ClientModal({ onClose, onSave, initialData }) {
  const [companyName, setCompanyName] = useState(initialData?.company_name || "");
  const [contactEmail, setContactEmail] = useState(initialData?.contact_email || "");
  const [website, setWebsite] = useState(initialData?.website || "");
  const [city, setCity] = useState(initialData?.city || "");
  const [state, setState] = useState(initialData?.state || "");
  const [notes, setNotes] = useState(initialData?.notes || "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clientData = { 
      company_name: companyName, 
      contact_email: contactEmail,
      website, 
      city, 
      state, 
      notes 
    };
    await onSave(clientData);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ textAlign: 'right' }}>{initialData ? "Edit Client" : "Add Client"}</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input 
                placeholder="Company Name" 
                value={companyName} 
                onChange={e => setCompanyName(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Email</label>
              <input 
                type="email" 
                placeholder="Contact Email" 
                value={contactEmail} 
                onChange={e => setContactEmail(e.target.value)} 
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Website</label>
              <input 
                placeholder="Website" 
                value={website} 
                onChange={e => setWebsite(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input 
                placeholder="City" 
                value={city} 
                onChange={e => setCity(e.target.value)} 
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: '1' }}>
              <label className="form-label">State</label>
              <input 
                placeholder="State" 
                value={state} 
                onChange={e => setState(e.target.value)} 
              />
            </div>
            <div className="form-group" style={{ flex: '0.8' }}>
              <label className="form-label">Notes</label>
              <textarea 
                placeholder="Notes" 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                style={{ minHeight: '60px', padding: '0.5rem 0.75rem' }}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="submit-btn">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState(null);

  // États pour la pagination
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0
  }); 

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const fetchClients = async (page = 1) => {
    try {
      const res = await api.get(`/clients?page=${page}&per_page=10`);
      setClients(res.data.data || []);
      setPagination({
        current_page: res.data.current_page || 1,
        last_page: res.data.last_page || 1,
        per_page: res.data.per_page || 10,
        total: res.data.total || 0
      });
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleAddClient = async (newClient) => {
    try {
      if (editClient) {
        // Update
        await api.put(`/clients/${editClient.id}`, newClient);
        setEditClient(null);
      } else {
        // Create
        await api.post("/clients", newClient);
      }
      // Rafraîchir la liste avec pagination
      fetchClients(1);
    } catch (error) {
      console.error("Error saving client:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;
    try {
      await api.delete(`/clients/${id}`);
      // Rafraîchir la liste avec pagination
      fetchClients(1);
    } catch (error) {
      console.error("Error deleting client:", error);
    }
  };

  const handleEdit = (client) => {
    setEditClient(client);
    setShowModal(true);
  };

  // Fonctions de navigation pour la pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.last_page) {
      fetchClients(newPage);
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

  if (loading) return <div className="loading">Loading clients...</div>;

  return (
    <div className="clients">
      <Navbar />
      <div className="clients-content">
        <div className="clients-header">
          <h2>Clients Management</h2>
          {isAdmin && (
            <button className="add-client-btn" onClick={() => setShowModal(true)}>
              Add Client
            </button>
          )}
        </div>

        <div className="clients-table-container">
          {clients.length === 0 ? (
            <div className="no-clients">
              <p>No clients found</p>
              {isAdmin && <p>Click "Add Client" to create your first client</p>}
            </div>
          ) : (
            <table className="clients-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>Contact Email</th>
                  <th>Website</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Notes</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {clients.map(client => (
                  <tr key={client.id}>
                    <td>{client.company_name}</td>
                    <td>{client.contact_email}</td>
                    <td>
                    {client.website ? (
                      <a 
                        href={client.website.startsWith('http') ? client.website : `https://${client.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#3498db', textDecoration: 'underline' }}
                      >
                        {client.website}
                      </a>
                    ) : (
                      <span style={{ color: '#999' }}>No website</span>
                    )}
                  </td>
                    <td>{client.city || '-'}</td>
                    <td>{client.state || '-'}</td>
                    <td>{client.notes || '-'}</td>
                    {isAdmin && (
                      <td className="actions">
                        <button className="edit-btn" onClick={() => handleEdit(client)}>Edit</button>
                        <button className="delete-btn" onClick={() => handleDelete(client.id)}>Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Contrôles de pagination */}
        {pagination.total > 10 && (
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

        {showModal && (
          <ClientModal
            initialData={editClient}
            onClose={() => { setShowModal(false); setEditClient(null); }}
            onSave={handleAddClient}
          />
        )}
      </div>
    </div>
  );
}