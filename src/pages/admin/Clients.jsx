import { useState, useEffect } from "react";
import { getAllClients, createClient, updateClient, deleteClient } from "../../api/clients"; 
import Navbar from "../../components/Navbar";
import "./Clients.css";

// مودال Add / Edit Client
function ClientModal({ onClose, onSave, initialData }) {
  const [companyName, setCompanyName] = useState(initialData?.company_name || "");
  const [website, setWebsite] = useState(initialData?.website || "");
  const [city, setCity] = useState(initialData?.city || "");
  const [state, setState] = useState(initialData?.state || "");
  const [notes, setNotes] = useState(initialData?.notes || "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clientData = { company_name: companyName, website, city, state, notes };
    await onSave(clientData);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{initialData ? "Edit Client" : "Add Client"}</h3>
        <form onSubmit={handleSubmit}>
          <input placeholder="Company Name" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
          <input placeholder="Website" value={website} onChange={e => setWebsite(e.target.value)} required />
          <input placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
          <input placeholder="State" value={state} onChange={e => setState(e.target.value)} />
          <textarea placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
          <div className="modal-buttons">
            <button type="submit">Save</button>
            <button type="button" onClick={onClose}>Cancel</button>
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
  const [editClient, setEditClient] = useState(null); // client اللي بغينا نعدل

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const fetchClients = async () => {
    try {
      const res = await getAllClients();
      setClients(res.data);
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
        const res = await updateClient(editClient.id, newClient);
        setClients(prev => prev.map(c => c.id === editClient.id ? res.data : c));
        setEditClient(null);
      } else {
        // Create
        const res = await createClient(newClient);
        setClients(prev => [...prev, res.data]);
      }
    } catch (error) {
      console.error("Error saving client:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;
    try {
      await deleteClient(id);
      setClients(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error("Error deleting client:", error);
    }
  };

  const handleEdit = (client) => {
    setEditClient(client);
    setShowModal(true);
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
                    <td><a href={`https://${client.website}`} target="_blank" rel="noopener noreferrer">{client.website}</a></td>
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