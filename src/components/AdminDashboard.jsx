import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Settings, 
  Activity, 
  Database, 
  Shield, 
  Terminal, 
  Cpu, 
  Server,
  UserPlus,
  Trash2,
  Edit,
  Search,
  Lock,
  Globe
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [stats, setStats] = useState({
    activeUsers: 0,
    dbSize: '245 MB',
    apiRequests: '12.4k',
    uptime: '99.99%'
  });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const { data: userData } = await supabase.from('users').select('*');
      setUsers(userData || []);
      
      const { data: logs } = await supabase.from('activity_logs').select('*').limit(10).order('timestamp', { ascending: false });
      setSystemLogs(logs || []);
      
      setStats(prev => ({...prev, activeUsers: userData?.length || 0}));
    } catch (error) {
      console.error("Error fetching admin data:", error);
    }
  };

  return (
    <div className="admin-dashboard-container">
      <header className="admin-header">
        <div className="header-info">
          <h1>System Administration</h1>
          <p>AutoDev Enterprise Node: Detroit-A1</p>
        </div>
        <div className="system-uptime glass-dark">
          <Activity size={16} className="green-text" />
          <span>Uptime: {stats.uptime}</span>
        </div>
      </header>

      <section className="admin-stats-grid">
        <div className="admin-stat glass">
          <Users size={24} className="blue-text" />
          <div className="stat-info">
            <span className="value">{stats.activeUsers}</span>
            <span className="label">Total System Users</span>
          </div>
        </div>
        <div className="admin-stat glass">
          <Database size={24} className="purple-text" />
          <div className="stat-info">
            <span className="value">{stats.dbSize}</span>
            <span className="label">Database Volume</span>
          </div>
        </div>
        <div className="admin-stat glass">
          <Globe size={24} className="cyan-text" />
          <div className="stat-info">
            <span className="value">{stats.apiRequests}</span>
            <span className="label">API Calls / 24h</span>
          </div>
        </div>
        <div className="admin-stat glass">
          <Server size={24} className="orange-text" />
          <div className="stat-info">
            <span className="value">4/4</span>
            <span className="label">Nodes Healthy</span>
          </div>
        </div>
      </section>

      <div className="admin-main-grid">
        <section className="user-management glass">
          <div className="section-header">
            <h3><Users size={20} /> User Directory</h3>
            <div className="header-actions">
              <div className="search-box">
                <Search size={14} />
                <input type="text" placeholder="Filter users..." />
              </div>
              <button className="primary-btn"><UserPlus size={18} /> Provision User</button>
            </div>
          </div>
          <div className="user-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Identity</th>
                  <th>Role / Access</th>
                  <th>Status</th>
                  <th>Last Sync</th>
                  <th>Control</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-identity">
                        <strong>{user.full_name}</strong>
                        <span>{user.email}</span>
                      </div>
                    </td>
                    <td><span className="role-tag">{user.role}</span></td>
                    <td><span className="status-indicator active">Online</span></td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="control-group">
                        <button className="icon-btn"><Edit size={14} /></button>
                        <button className="icon-btn red-text"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="system-health">
          <div className="side-card glass">
            <h3><Terminal size={18} /> System Audit Stream</h3>
            <div className="log-stream">
              {systemLogs.map(log => (
                <div key={log.id} className="log-entry">
                  <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <p><strong>{log.action_type}:</strong> {log.action_description}</p>
                </div>
              ))}
              <div className="log-entry">
                <span className="log-time">14:55:22</span>
                <p><strong>AUTH:</strong> Session token refreshed for UID: 8842</p>
              </div>
              <div className="log-entry">
                <span className="log-time">14:50:01</span>
                <p><strong>SYSTEM:</strong> Database cleanup complete (0.4s)</p>
              </div>
            </div>
          </div>

          <div className="side-card glass">
            <h3><Shield size={18} /> Security Overview</h3>
            <div className="security-list">
              <div className="security-item">
                <span>RBAC Enforcement</span>
                <span className="status-ok">ACTIVE</span>
              </div>
              <div className="security-item">
                <span>Data Encryption</span>
                <span className="status-ok">AES-256</span>
              </div>
              <div className="security-item">
                <span>Threat Detection</span>
                <span className="status-ok">SCANNING</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AdminDashboard;
