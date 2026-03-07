import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import StaffNavbar from "../../components/StaffNavbar";
import api from "../../api/api";
import "./StaffProfile.css";

export default function StaffProfile() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    position: "",
    department: ""
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
        position: userData.position || "Staff",
        department: userData.department || "SEO"
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Fallback to localStorage if API fails
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(userData);
      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        position: userData.position || "Staff",
        department: userData.department || "SEO"
      });
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
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
      
      // Only include position if it's not empty
      if (formData.position.trim()) {
        updateData.position = formData.position;
      }
      
      // Only include department if it's not empty
      if (formData.department.trim()) {
        updateData.department = formData.department;
      }
      
      const response = await api.put('/profile', updateData);
      const updatedUser = response.data;
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setEditing(false);
      setMessage("Profile updated successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage(error.response?.data?.message || "Error updating profile");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        position: user.position || "Staff",
        department: user.department || "SEO"
      });
    }
    setEditing(false);
    setMessage("");
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="staff-profile">
        <StaffNavbar />
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="staff-profile">
      <StaffNavbar />
      
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <h2>My Staff Profile</h2>
          </div>

          {message && (
            <div className={`message ${message.includes('succès') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          <div className="profile-content">
            {!editing ? (
              <div className="profile-info">
                <div className="info-item">
                  <label>Full Name</label>
                  <p>{user.name}</p>
                </div>
                <div className="info-item">
                  <label>Email</label>
                  <p>{user.email}</p>
                </div>
                <div className="info-item">
                  <label>Position</label>
                  <p>{user.position || 'Staff'}</p>
                </div>
                <div className="info-item">
                  <label>Department</label>
                  <p>{user.department || 'SEO'}</p>
                </div>

                <div className="info-actions">
                  <button className="edit-btn" onClick={() => setEditing(true)}>
                    Edit Profile
                  </button>
                  <button className="logout-btn" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="profile-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label>Position</label>
                  <input type="text" name="position" value={formData.position} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input type="text" name="department" value={formData.department} onChange={handleInputChange} />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-save" disabled={loading}>
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" className="btn-cancel" onClick={handleCancel}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}