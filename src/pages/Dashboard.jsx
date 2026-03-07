import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import Navbar from '../components/Navbar';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalBacklinks: 0,
    liveBacklinks: 0,
    pendingBacklinks: 0,
    lostBacklinks: 0,
    monthlyBacklinks: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // 🛡️ تصحيح قراءة الـ User باش ما يبقاش يطلع Error "undefined"
  const userStr = localStorage.getItem('user');
  const user = (userStr && userStr !== "undefined") ? JSON.parse(userStr) : {};

  useEffect(() => {
    // ❌ حيدت ليك الـ Redirect اللي كان كيجري عليك من الـ Dashboard
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const backlinksRes = await api.get('/backlinks');
      const backlinks = backlinksRes.data;
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const monthlyBacklinks = backlinks.filter(backlink => {
        const backlinkDate = new Date(backlink.date_added);
        return backlinkDate.getMonth() === currentMonth && 
               backlinkDate.getFullYear() === currentYear;
      }).length;

      const liveBacklinks = backlinks.filter(b => b.status === 'Live').length;
      const pendingBacklinks = backlinks.filter(b => b.status === 'Pending').length;
      const lostBacklinks = backlinks.filter(b => b.status === 'Lost').length;

      const clientsRes = await api.get('/clients');
      const totalClients = clientsRes.data.length;
        
      setStats({
        totalClients,
        totalBacklinks: backlinks.length,
        liveBacklinks,
        pendingBacklinks,
        lostBacklinks,
        monthlyBacklinks
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    switch(action) {
      case 'add-client': navigate('/clients'); break;
      case 'add-backlink': navigate('/backlinks'); break;
      case 'export-report': navigate('/reports'); break;
      default: break;
    }
  };

  // ✅ حيدت ليك الـ if (!isAdmin) return null حيت هي اللي كانت كتمحي الـ Dashboard
  
  if (loading) {
    return (
      <div className="dashboard">
        <Navbar />
        <div className="dashboard-content">
          <div className="loading">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Navbar />
      
      <div className="dashboard-content">
        <h1 className="dashboard-title">Admin Dashboard</h1>
        
        <div className="stats-grid">
          <div className="stat-card total-clients">
            <div className="stat-icon"></div>
            <div className="stat-info">
              <h3>{stats.totalClients}</h3>
              <p>Total Clients</p>
            </div>
          </div>
          
          <div className="stat-card total-backlinks">
            <div className="stat-icon">🔗</div>
            <div className="stat-info">
              <h3>{stats.totalBacklinks}</h3>
              <p>Total Backlinks</p>
            </div>
          </div>
          
          <div className="stat-card live-backlinks">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <h3>{stats.liveBacklinks}</h3>
              <p>Live Backlinks</p>
            </div>
          </div>
          
          <div className="stat-card pending-backlinks">
            <div className="stat-icon">⏳</div>
            <div className="stat-info">
              <h3>{stats.pendingBacklinks}</h3>
              <p>Pending Backlinks</p>
            </div>
          </div>
          
          <div className="stat-card lost-backlinks">
            <div className="stat-icon">❌</div>
            <div className="stat-info">
              <h3>{stats.lostBacklinks}</h3>
              <p>Lost Backlinks</p>
            </div>
          </div>
          
          <div className="stat-card monthly-backlinks">
            <div className="stat-icon">📅</div>
            <div className="stat-info">
              <h3>{stats.monthlyBacklinks}</h3>
              <p>This Month</p>
            </div>
          </div>
        </div>

        <div className="chart-section">
          <h3>Status Distribution</h3>
          <div className="chart-container">
            <div className="chart-bar">
              <div className="bar-segment live" style={{width: `${stats.totalBacklinks > 0 ? (stats.liveBacklinks / stats.totalBacklinks) * 100 : 0}%`}}>
                Live
              </div>
              <div className="bar-segment pending" style={{width: `${stats.totalBacklinks > 0 ? (stats.pendingBacklinks / stats.totalBacklinks) * 100 : 0}%`}}>
                Pending
              </div>
              <div className="bar-segment lost" style={{width: `${stats.totalBacklinks > 0 ? (stats.lostBacklinks / stats.totalBacklinks) * 100 : 0}%`}}>
                Lost
              </div>
            </div>
          </div>
        </div>

        <div className="quick-actions">
          <h3>Admin Quick Actions</h3>
          <div className="action-buttons">
            <button className="action-btn primary" onClick={() => handleQuickAction('add-client')}>Add Client</button>
            <button className="action-btn secondary" onClick={() => handleQuickAction('add-backlink')}>Add Backlink</button>
            <button className="action-btn tertiary" onClick={() => handleQuickAction('export-report')}>Export Report</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;