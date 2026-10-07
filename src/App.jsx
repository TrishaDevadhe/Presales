import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import RightPanel from './components/RightPanel';
import CreateProgramForm from './components/CreateProgramForm';
import LoginPage from './pages/LoginPage';
import DashboardSwitcher from './components/DashboardSwitcher';
import DDRDashboard from './components/DDRDashboard';
import EBOMDashboard from './components/EBOMDashboard';
import ValidationDashboard from './components/ValidationDashboard';
import ECODashboard from './components/ECODashboard';
import LeadDashboard from './components/LeadDashboard';
import ChiefDashboard from './components/ChiefDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

const AppContent = () => {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isRightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (loading) {
    return (
      <div className="system-loading flex-center">
        <div className="loader"></div>
        <p>Initializing Secure Automotive Environment...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${isRightPanelCollapsed ? 'right-panel-collapsed' : ''}`}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isCollapsed={isSidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />
      
      <main className="main-content">
        <Navbar setShowCreateModal={setShowCreateModal} />
        
        <div className="content-area">
          {/* Role-specific Dashboards (via DashboardSwitcher) */}
          {['Dashboard', 'Programs', 'APQP Gates', 'Timeline', 'Teams',
            'MBOM Review', 'Process Plans', 'Supplier Sourcing',
            'APQP Tracker', 'PPAP Queue', 'Audits',
            'PPAP', 'My PPAP', 'Specs',
            'Documents', 'Reports', 'Notifications',
            'Prototype Builds', 'Settings',
            'Users', 'System Logs', 'Workflow Config',
            'TRL Analysis', 'Risk Matrix'
          ].includes(activeTab) ? (
            /* TRL Analysis and Risk Matrix are Lead Eng sub-sections — show LeadDashboard */
            ['TRL Analysis', 'Risk Matrix'].includes(activeTab) ? (
              <LeadDashboard />
            ) : (
              <DashboardSwitcher />
            )
          ) : activeTab === 'Feasibility' ? (
            <LeadDashboard />
          ) : activeTab === 'Approvals' || activeTab === 'Portfolio' ? (
            <ChiefDashboard />
          ) : activeTab === 'DDR Reviews' ? (
            <DDRDashboard />
          ) : activeTab === 'eBOM' || activeTab === 'CAD Models' ? (
            <EBOMDashboard />
          ) : ['Test Schedule', 'DVP&R', 'Failures'].includes(activeTab) ? (
            <ValidationDashboard />
          ) : activeTab === 'ECOs' ? (
            <ECODashboard />
          ) : (
            <div className="placeholder-view flex-center glass" style={{ height: '100%', flexDirection: 'column', gap: '16px' }}>
              <h2>{activeTab} Module</h2>
              <p>This module is currently in development.</p>
              <button className="primary-btn" onClick={() => setActiveTab('Dashboard')}>Return to Dashboard</button>
            </div>
          )}
        </div>
      </main>

      <RightPanel 
        isCollapsed={isRightPanelCollapsed} 
        setCollapsed={setRightPanelCollapsed} 
      />

      {showCreateModal && (
        <CreateProgramForm onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("AutoDev Critical UI Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="system-loading flex-center">
          <h1 style={{ color: 'var(--error)' }}>Dashboard Offline</h1>
          <p>A critical UI component failed to load. Please refresh the portal.</p>
          <button onClick={() => window.location.reload()} className="create-program-btn" style={{marginTop: '20px'}}>
            Restart Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
