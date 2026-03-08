import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import StaffNavbar from '../../components/StaffNavbar';
import './StaffDashboard.css';

// Simple Pie Chart Component
const PieChart = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return null;

  let currentAngle = -90; // Start from top
  
  return (
    <div className="pie-chart-container">
      <svg width="300" height="300" viewBox="0 0 300 300">
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          const angle = (percentage / 100) * 360;
          const endAngle = currentAngle + angle;
          
          const x1 = 150 + 120 * Math.cos((currentAngle * Math.PI) / 180);
          const y1 = 150 + 120 * Math.sin((currentAngle * Math.PI) / 180);
          const x2 = 150 + 120 * Math.cos((endAngle * Math.PI) / 180);
          const y2 = 150 + 120 * Math.sin((endAngle * Math.PI) / 180);
          
          const largeArcFlag = angle > 180 ? 1 : 0;
          
          const path = [
            `M 150 150`,
            `L ${x1} ${y1}`,
            `A 120 120 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
          ].join(' ');
          
          const labelAngle = currentAngle + angle / 2;
          const labelX = 150 + 80 * Math.cos((labelAngle * Math.PI) / 180);
          const labelY = 150 + 80 * Math.sin((labelAngle * Math.PI) / 180);
          
          currentAngle = endAngle;
          
          return (
            <g key={index}>
              <path
                d={path}
                fill={item.color}
                stroke="white"
                strokeWidth="2"
              />
              {percentage > 5 && (
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="14"
                  fontWeight="bold"
                >
                  {`${Math.round(percentage)}%`}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="pie-legend">
        {data.map((item, index) => (
          <div key={index} className="legend-item">
            <div className="legend-color" style={{ backgroundColor: item.color }}></div>
            <span className="legend-label">{item.label}: {item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StaffDashboard = () => {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalBacklinks: 0,
    liveBacklinks: 0,
    pendingBacklinks: 0,
    lostBacklinks: 0,
    monthlyBacklinks: 0
  });
  const [monthlyBacklinksData, setMonthlyBacklinksData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDashboardStats = useCallback(async () => {
    try {
      const [clientsRes, backlinksRes] = await Promise.all([
        api.get('/clients'),
        api.get('/backlinks')
      ]);
      
      const clients = clientsRes.data || [];
      const backlinks = backlinksRes.data || [];
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const monthlyBacklinksList = backlinks.filter(backlink => {
        // Prioritize Date column we added to table, then fallback to other fields
        const dateFields = [
          backlink.date_added,  // Primary field from form
          backlink.date,        // Date column we added to table
          backlink.created_at,   // Fallback fields
          backlink.updated_at
        ].filter(Boolean);
        
        if (dateFields.length === 0) {
          console.log('No date fields found for backlink:', backlink.id);
          return false;
        }
        
        // Use the most recent date for accuracy
        const backlinkDate = new Date(dateFields[0]);
        const isValidDate = !isNaN(backlinkDate.getTime());
        
        if (!isValidDate) {
          console.log('Invalid date for backlink:', backlink.id, dateFields[0]);
          return false;
        }
        
        const isCurrentMonth = backlinkDate.getMonth() === currentMonth && 
                           backlinkDate.getFullYear() === currentYear;
        
        console.log(`Staff Backlink ${backlink.id}: Date=${backlinkDate.toISOString().split('T')[0]}, CurrentMonth=${isCurrentMonth}`);
        
        return isCurrentMonth;
      });
      
      const monthlyBacklinks = monthlyBacklinksList.length;

      const liveBacklinks = backlinks.filter(b => b.status === 'Live').length;
      const pendingBacklinks = backlinks.filter(b => b.status === 'Pending').length;
      const lostBacklinks = backlinks.filter(b => b.status === 'Lost').length;

      setStats({
        totalClients: clients.length,
        totalBacklinks: backlinks.length,
        liveBacklinks,
        pendingBacklinks,
        lostBacklinks,
        monthlyBacklinks
      });
      
      // Set monthly backlinks data for table - show ALL backlinks for current month
      setMonthlyBacklinksData(monthlyBacklinksList); // Show all backlinks, no limit
    } catch (error) {
      console.error('Error fetching stats:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // Real-time refresh: Update dashboard data every 30 seconds
  useEffect(() => {
    fetchDashboardStats();
    
    // Set up periodic refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      fetchDashboardStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchDashboardStats]);

  if (loading) {
    return (
      <div className="dashboard">
        <StaffNavbar />
        <div className="dashboard-content">
          <div className="loading">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <StaffNavbar />
      
      <div className="dashboard-content">
        <h1 className="dashboard-title">Staff Dashboard</h1>
        
        {/* Professional Cards Section */}
        <div className="stats-grid-enhanced">
          <div className="stat-card-enhanced clients-card">
            <div className="stat-icon-enhanced clients-icon">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9" cy="7" r="4" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 3.13a4 4 0 1 0 7.75" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="stat-info-enhanced">
              <h3 className="stat-number">{stats.totalClients}</h3>
              <p className="stat-label">Nombre total de clients</p>
            </div>
          </div>
          
          <div className="stat-card-enhanced backlinks-card">
            <div className="stat-icon-enhanced backlinks-icon">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="stat-info-enhanced">
              <h3 className="stat-number">{stats.totalBacklinks}</h3>
              <p className="stat-label">Nombre total de backlinks</p>
            </div>
          </div>
          
          <div className="stat-card-enhanced monthly-card">
            <div className="stat-icon-enhanced monthly-icon">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="2" x2="16" y2="6" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="8" y1="2" x2="8" y2="6" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="3" y1="10" x2="21" y2="10" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="stat-info-enhanced">
              <h3 className="stat-number">{stats.monthlyBacklinks}</h3>
              <p className="stat-label">Backlinks ajoutés ce mois</p>
            </div>
          </div>
        </div>

        {/* Pie Chart Section */}
        <div className="chart-section-enhanced">
          <h2 className="chart-title">Répartition Status</h2>
          <div className="chart-container-enhanced">
            <PieChart 
              data={[
                { label: 'Live', value: stats.liveBacklinks, color: '#10B981' },
                { label: 'Pending', value: stats.pendingBacklinks, color: '#F59E0B' },
                { label: 'Lost', value: stats.lostBacklinks, color: '#EF4444' }
              ]}
            />
          </div>
        </div>

        {/* Monthly Backlinks Table */}
        <div className="monthly-backlinks-table">
          <h2 className="table-title">Liste des Backlinks Ajoutés ce Mois</h2>
          <div className="table-container">
            <table className="monthly-table">
              <thead>
                <tr>
                  <th>Domain/URL</th>
                  <th>Status</th>
                  <th>Date Added</th>
                </tr>
              </thead>
              <tbody>
                {monthlyBacklinksData.length > 0 ? (
                  monthlyBacklinksData.map((backlink, index) => (
                    <tr key={index}>
                      <td className="domain-cell">
                        <a 
                          href={backlink.target_url || 'N/A'} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="domain-link"
                        >
                          {backlink.target_url || 'N/A'}
                        </a>
                      </td>
                      <td>
                        <span className={`status-badge status-${backlink.status?.toLowerCase()}`}>
                          {backlink.status}
                        </span>
                      </td>
                      <td className="date-cell">
                        {new Date(backlink.date_added || backlink.created_at || backlink.date).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="no-data">
                      Aucun backlink ajouté ce mois
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;