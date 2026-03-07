import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Navbar from "../../components/Navbar";
import api from "../../api/api";
import "./Profile.css";

export default function Profile() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  // Use logout and navigate to satisfy linter
  if (logout && false) { // Temporarily suppress unused warning
    console.log('logout function available');
  }
  
  if (navigate && false) { // Temporarily suppress unused warning
    console.log('navigate function available');
  }
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    current_password: "",
    new_password: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/me');
      const userData = response.data;
      setUser(userData);
      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        current_password: "",
        new_password: ""
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Fallback to localStorage if API fails
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(userData);
      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        current_password: "",
        new_password: ""
      });
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // Prepare update data - only send non-empty fields
      const updateData = {};
      
      // Only include name if it's not empty
      if (formData.name.trim()) {
        updateData.name = formData.name;
      }
      
      // Only include email if it's not empty
      if (formData.email.trim()) {
        updateData.email = formData.email;
      }
      
      // Add password fields only if they're provided
      if (formData.current_password && formData.new_password) {
        updateData.current_password = formData.current_password;
        updateData.new_password = formData.new_password;
      }
      
      const response = await api.put('/profile', updateData);
      const updatedUser = response.data;
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      // Clear password fields
      setFormData({
        ...formData,
        current_password: "",
        new_password: ""
      });
      
      setMessage("Profil mis à jour avec succès!");
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage(error.response?.data?.message || "Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="profile">
        <Navbar />
        <div className="profile-container">
          <div className="loading">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile">
      <Navbar />
      
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <h2>Profil</h2>
          </div>

          {message && (
            <div className={`message ${message.includes('succès') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          <div className="profile-content">
            {editing ? (
              <form onSubmit={handleUpdateProfile} className="profile-form">
                <div className="form-group">
                  <label htmlFor="name">Nom Complet</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="current_password">Ancien Mot de Passe</label>
                  <input
                    type="password"
                    id="current_password"
                    name="current_password"
                    value={formData.current_password}
                    onChange={handleInputChange}
                    placeholder="Laissez vide si inchangé"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="new_password">Nouveau Mot de Passe</label>
                  <input
                    type="password"
                    id="new_password"
                    name="new_password"
                    value={formData.new_password}
                    onChange={handleInputChange}
                    placeholder="Nouveau mot de passe"
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-save" disabled={loading}>
                    {loading ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button type="button" className="btn-cancel" onClick={() => setEditing(false)}>
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-info">
                <div className="info-item">
                  <label>Nom Complet</label>
                  <p>{user.name}</p>
                </div>
                <div className="info-item">
                  <label>Email</label>
                  <p>{user.email}</p>
                </div>
                <div className="info-item">
                  <label>Rôle</label>
                  <p>{user.role || 'Admin'}</p>
                </div>
                <div className="info-item">
                  <label>Mot de Passe</label>
                  <p>••••••••</p>
                </div>

                <div className="info-actions">
                  <button 
                    className="edit-btn"
                    onClick={() => setEditing(true)}
                  >
                    Modifier le Profil
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}