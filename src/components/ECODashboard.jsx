import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileWarning, Settings, PenTool, RotateCcw, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import './ECODashboard.css';

const ECODashboard = () => {
  const { profile } = useAuth();
  const [ecos, setEcos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchECOs();
  }, []);

  const fetchECOs = async () => {
    try {
      const { data, error } = await supabase
        .from('eco_requests')
        .select('*, programs(program_name)')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setEcos(data || []);
    } catch (err) {
      console.error('Error fetching ECOs:', err);
    } finally {
      setLoading(false);
    }
  };

  const advanceECOPhase = async (ecoId, currentStatus) => {
    const workflow = ['Pending', 'Design Updated', 'BOM Updated', 'Rebuilt & Retesting', 'Implemented'];
    const nextIdx = workflow.indexOf(currentStatus) + 1;
    if (nextIdx >= workflow.length) return;

    try {
      await supabase.from('eco_requests').update({ status: workflow[nextIdx] }).eq('id', ecoId);
      fetchECOs();
    } catch (err) {
      console.error('Error updating ECO:', err);
    }
  };

  const getActionForRole = (eco) => {
    const role = profile?.role;
    const status = eco.status;

    if (role === 'Design Engineer' && status === 'Pending') {
      return <button className="primary-btn small" onClick={() => advanceECOPhase(eco.id, status)}><PenTool size={14}/> Update Design CAD</button>;
    }
    if ((role === 'Design Engineer' || role === 'Manufacturing Engineer') && status === 'Design Updated') {
      return <button className="primary-btn small" onClick={() => advanceECOPhase(eco.id, status)}><Settings size={14}/> Publish New eBOM/MBOM</button>;
    }
    if (role === 'Manufacturing Engineer' && status === 'BOM Updated') {
      return <button className="primary-btn small" onClick={() => advanceECOPhase(eco.id, status)}><RotateCcw size={14}/> Rebuild Prototype</button>;
    }
    if ((role === 'Quality Engineer' || role === 'Lead Engineer') && status === 'Rebuilt & Retesting') {
      return <button className="success-btn small" onClick={() => advanceECOPhase(eco.id, status)}><CheckCircle2 size={14}/> Verify & Close ECO</button>;
    }
    
    return <span className="text-muted text-sm">Awaiting other department</span>;
  };

  if (loading) return <div className="flex-center h-100">Loading ECO Management System...</div>;

  return (
    <motion.div className="dashboard-wrapper eco-dashboard" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}}>
      <header className="val-header" style={{marginBottom: '24px'}}>
        <div className="header-left">
          <div className="status-badge-val" style={{background: 'rgba(255, 59, 48, 0.1)', color: 'var(--error)'}}>
            CRITICAL WORKFLOW
          </div>
          <h1>ECO Management Dashboard</h1>
          <p className="technical-meta">ENGINEERING CHANGE ORDERS // REDESIGN // REBUILD</p>
        </div>
      </header>

      <section className="glass p-xl">
        <div className="section-header" style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px'}}>
          <FileWarning size={20} color="var(--error)" />
          <h3 style={{margin: 0}}>Active Change Orders</h3>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>ECO Ref</th>
              <th>Program</th>
              <th>Issue Description</th>
              <th>Phase</th>
              <th>Required Action ({profile?.role})</th>
            </tr>
          </thead>
          <tbody>
            {ecos.length === 0 ? (
              <tr><td colSpan="5" className="text-center text-muted">No active Engineering Change Orders.</td></tr>
            ) : ecos.map(eco => (
              <tr key={eco.id}>
                <td><strong>ECO-{eco.id.substring(0, 6).toUpperCase()}</strong></td>
                <td>{eco.programs?.program_name || 'Global'}</td>
                <td style={{maxWidth: '250px'}}>{eco.title}</td>
                <td>
                  <span className={`status-pill ${eco.status === 'Implemented' ? 'passed' : 'scheduled'}`}>
                    {eco.status}
                  </span>
                </td>
                <td>
                  {eco.status === 'Implemented' ? (
                    <span className="text-success"><CheckCircle2 size={14} style={{display: 'inline', verticalAlign: 'middle', marginRight: '4px'}}/> Closed</span>
                  ) : (
                    getActionForRole(eco)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="glass p-xl mt-4">
        <h3>ECO APQP Workflow Guide</h3>
        <div className="eco-flow-guide">
          <div className="flow-step">
            <div className="step-num">1</div>
            <div><strong>Validation Failure</strong><br/>Generates Pending ECO</div>
          </div>
          <div className="flow-step">
            <div className="step-num">2</div>
            <div><strong>Design Engineer</strong><br/>Updates CAD & Releases</div>
          </div>
          <div className="flow-step">
            <div className="step-num">3</div>
            <div><strong>Mfg Engineer</strong><br/>Updates BOM & Routing</div>
          </div>
          <div className="flow-step">
            <div className="step-num">4</div>
            <div><strong>Plant Operations</strong><br/>Rebuilds Prototype</div>
          </div>
          <div className="flow-step">
            <div className="step-num">5</div>
            <div><strong>Quality/Lead</strong><br/>Retests & Closes ECO</div>
          </div>
        </div>
      </section>
    </motion.div>
  );
};

export default ECODashboard;
