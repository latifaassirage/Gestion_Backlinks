import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const StaffNavbar = () => {
  const { logout } = useAuth();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="logo">B</span>
        <span className="brand-name">Agency SEO - Staff</span>
      </div>
      
      <div className="navbar-links">
        <Link to="/staff/dashboard">Dashboard</Link>
        <Link to="/staff/backlinks">Backlinks</Link>
      </div>
      
      <div className="navbar-user">
        <div className="user-dropdown">
          <button 
            className="user-info-btn" 
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <span className="user-info">
              {user.name} ({user.role})
            </span>
            <span className="dropdown-arrow">▼</span>
          </button>
          
          {showDropdown && (
            <div className="dropdown-menu">
              <Link to="/staff/profile" className="dropdown-item">
                👤 My Profile
              </Link>
              <button className="dropdown-item logout" onClick={handleLogout}>
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default StaffNavbar;
