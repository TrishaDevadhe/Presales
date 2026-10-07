import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Car, AlertTriangle, CheckCircle2, ShieldAlert, 
  TrendingUp, HardDrive, ArrowUpRight, Filter
} from 'lucide-react';
import './ProgramManagerDashboard.css';
import { useDashboardData } from '../hooks/useDashboardData';
import { supabase } from '../lib/supabase';
import CreateProgramForm from './CreateProgramForm';

const ProgramManagerDashboard = () => {
  const { programs, activityLogs, workflowInstances, loading } = useDashboardData();
  const [editingProgram, setEditingProgram] = useState(null);

  // Derive KPIs from dynamic data
  const kpis = [
    { label: 'Active Programs', value: programs.length.toString(), change: '+2', icon: Car, color: 'var(--accent)' },
    { label: 'Programs Delayed', value: programs.filter(p => p.status === 'Delayed').length.toString(), change: '+1', icon: AlertTriangle, color: 'var(--warning)' },
    { label: 'Pending Approvals', value: '28', change: '-4', icon: CheckCircle2, color: 'var(--success)' },
    { label: 'Open Risks', value: '42', change: '+12', icon: ShieldAlert, color: 'var(--error)' },
    { label: 'Budget Usage', value: programs.length > 0 ? `${Math.round(programs.reduce((acc, p) => acc + (p.estimated_budget || 0), 0) / 1000000)}M` : '0', change: '+5%', icon: TrendingUp, color: 'var(--accent-secondary)' },
    { label: 'Prototype Status', value: '92%', change: '+2%', icon: HardDrive, color: 'var(--accent)' },
  ];

  // Get gates for the most recent program for the tracker
  const latestProgram = programs[0] || null;
  const gates = latestProgram?.apqp_gates?.sort((a, b) => a.gate_number - b.gate_number) || [];

  if (loading && programs.length === 0) {
    return <div className="loading-state flex-center">Initializing Automotive Workflow...</div>;
  }
  return (
    <motion.div 
      className="dashboard-wrapper"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <header className="dashboard-header">
        <div>
          <h1 className="text-gradient">Program Management Overview</h1>
          <p className="subtitle">Real-time status of vehicle development lifecycles across all plants.</p>
        </div>
        <div className="header-actions">
          <button className="filter-btn glass flex-center">
            <Filter size={16} />
            <span>Filters</span>
          </button>
        </div>
      </header>

      {/* KPI Section */}
      <section className="kpi-grid">
        {kpis.map((kpi, index) => (
          <motion.div 
            key={kpi.label}
            className="kpi-card glass glow-border"
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="kpi-header">
              <div className="kpi-icon-wrapper" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>
                <kpi.icon size={20} />
              </div>
              <span className={`kpi-change ${kpi.change.startsWith('+') ? 'up' : 'down'}`}>
                {kpi.change} <ArrowUpRight size={12} />
              </span>
            </div>
            <div className="kpi-content">
              <span className="kpi-label">{kpi.label}</span>
              <span className="kpi-value">{kpi.value}</span>
            </div>
          </motion.div>
        ))}
      </section>

      <div className="dashboard-grid">
        {/* APQP Tracker */}
        <section className="dashboard-card apqp-tracker glass">
          <div className="card-header">
            <h3>APQP Gate Progress Tracker</h3>
            <span className="card-tag">{latestProgram ? `${latestProgram.program_name} (${latestProgram.program_code})` : 'Select Program'}</span>
          </div>
          <div className="gates-container">
            {gates.length > 0 ? gates.map((gate, index) => (
              <div key={gate.id} className="gate-row">
                <div className="gate-info">
                  <div className={`gate-status-dot ${gate.gate_status?.toLowerCase().replace(' ', '-')}`}></div>
                  <div className="gate-text">
                    <span className="gate-name">Gate {gate.gate_number}: {gate.gate_name}</span>
                    <span className="gate-deadline">Deadline: {gate.due_date || 'TBD'}</span>
                  </div>
                </div>
                <div className="gate-progress-wrapper">
                  <div className="progress-bar-bg">
                    <motion.div 
                      className="progress-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${gate.completion_percentage}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                      style={{ background: gate.gate_status === 'Completed' ? 'var(--success)' : 'var(--accent)' }}
                    />
                  </div>
                  <span className="progress-text">{gate.completion_percentage}%</span>
                </div>
              </div>
            )) : (
              <div className="empty-state">No APQP gates defined for this program.</div>
            )}
          </div>
        </section>

        {/* Delayed Milestones */}
        <section className="dashboard-card delayed-milestones glass">
          <div className="card-header">
            <h3>Critical Path & Delays</h3>
          </div>
          <div className="milestone-list">
            {[
              { title: 'Chassis Rigidity Test', delay: '12 days', program: 'EV Sedan G3', owner: 'Body Engineering' },
              { title: 'BMS Firmware Validation', delay: '8 days', program: 'CyberTruck V2', owner: 'Software QA' },
              { title: 'Interior Trim Mold Approval', delay: '5 days', program: 'SUV Elite', owner: 'Manufacturing' },
            ].map((m, i) => (
              <div key={i} className="milestone-item">
                <div className="m-icon flex-center"><AlertTriangle size={16} /></div>
                <div className="m-details">
                  <span className="m-title">{m.title}</span>
                  <span className="m-meta">{m.program} • {m.owner}</span>
                </div>
                <div className="m-delay">{m.delay}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Prototype Authorization Matrix */}
      <section className="dashboard-card glass" style={{ marginTop: '24px' }}>
        <div className="card-header">
          <h3>Prototype Build Authorization</h3>
        </div>
        <p className="text-muted" style={{ padding: '0 24px 16px', margin: 0 }}>
          Programs with frozen designs (Gate 1 completed) are queued here for physical prototype authorization.
        </p>
        <div className="gates-container">
          {programs.filter(p => p.status === 'Design' || p.status === 'Prototype').length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Program</th>
                  <th>Current Phase</th>
                  <th>Target Market</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {programs.filter(p => p.status === 'Design' || p.status === 'Prototype').map(p => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--accent)' }}><strong>{p.program_name}</strong> ({p.program_code})</td>
                    <td>{p.status}</td>
                    <td>{p.target_market}</td>
                    <td>
                      <button className="primary-btn small" onClick={() => {
                        supabase.from('prototype_builds').insert({
                          program_id: p.id,
                          build_type: 'Alpha',
                          quantity: 5,
                          status: 'Planning',
                          plant_location: p.plant_location || 'Detroit Assembly'
                        }).then(({ error }) => {
                          if (error) alert(error.message);
                          else alert(`Alpha Prototype Build Authorized for ${p.program_name}! Factory notified.`);
                        });
                      }}>
                        <HardDrive size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                        Authorize Alpha Build
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">No programs are currently ready for prototype builds.</div>
          )}
        </div>
      </section>
      {/* Rework Required / Rejected Programs */}
      <section className="dashboard-card glass" style={{ marginTop: '24px', borderColor: 'var(--error)' }}>
        <div className="card-header">
          <h3><AlertTriangle size={18} style={{ color: 'var(--error)', marginRight: '8px', verticalAlign: 'middle' }} /> Programs Requiring Rework (Rejected)</h3>
        </div>
        <div className="gates-container">
          {programs.filter(p => {
            const wf = workflowInstances?.find(w => w.program_id === p.id);
            return wf?.current_stage === 'FEASIBILITY_REJECTED' || p.status === 'Rejected';
          }).length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Program</th>
                  <th>Status</th>
                  <th>Current Stage</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {programs.filter(p => {
                  const wf = workflowInstances?.find(w => w.program_id === p.id);
                  return wf?.current_stage === 'FEASIBILITY_REJECTED' || p.status === 'Rejected';
                }).map(p => {
                  const wf = workflowInstances?.find(w => w.program_id === p.id);
                  return (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--accent)' }}><strong>{p.program_name}</strong> ({p.program_code})</td>
                      <td><span className="status-pill rejected">Rework Needed</span></td>
                      <td>{wf?.current_stage}</td>
                      <td>
                        <button className="secondary-btn small" onClick={() => setEditingProgram(p)}>
                          Edit & Resubmit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">No programs currently require rework.</div>
          )}
        </div>
      </section>

      {editingProgram && (
        <CreateProgramForm 
          programToEdit={editingProgram} 
          onClose={() => setEditingProgram(null)} 
        />
      )}
    </motion.div>
  );
};

export default ProgramManagerDashboard;
