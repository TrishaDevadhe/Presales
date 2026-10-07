import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  Upload, 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  FileText, 
  AlertTriangle,
  Info,
  ChevronRight,
  ExternalLink,
  Plus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import './SupplierDashboard.css';

const SupplierDashboard = () => {
  const [submissions, setSubmissions] = useState([]);
  const [activePrograms, setActivePrograms] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [programId, setProgramId] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [submissionLevel, setSubmissionLevel] = useState('3');
  const [pswUrl, setPswUrl] = useState('');
  const [dfmeaUrl, setDfmeaUrl] = useState('');
  const [pfmeaUrl, setPfmeaUrl] = useState('');
  const [controlPlanUrl, setControlPlanUrl] = useState('');

  useEffect(() => {
    fetchSupplierData();
  }, []);

  const fetchSupplierData = async () => {
    try {
      const { data: subData } = await supabase
        .from('ppap_submissions')
        .select('*, programs(program_name, program_code)')
        .order('created_at', { ascending: false });
      setSubmissions(subData || []);

      const { data: progData } = await supabase.from('programs').select('*').in('status', ['PPAP', 'Production']);
      setActivePrograms(progData || []);
      if (progData && progData.length > 0) {
        setProgramId(progData[0].id);
      }
    } catch (error) {
      console.error("Error fetching supplier data:", error);
    }
  };

  const handleSubmitPpap = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('ppap_submissions').insert({
        program_id: programId,
        part_number: partNumber,
        submission_level: parseInt(submissionLevel),
        status: 'Pending',
        psw_url: pswUrl,
        dfmea_url: dfmeaUrl,
        pfmea_url: pfmeaUrl,
        control_plan_url: controlPlanUrl
      });

      if (error) throw error;

      alert('SUCCESS: PPAP Submission packages uploaded successfully and dispatched to Quality Assurance!');
      setIsModalOpen(false);
      // Reset form
      setPartNumber('');
      setPswUrl('');
      setDfmeaUrl('');
      setPfmeaUrl('');
      setControlPlanUrl('');
      
      fetchSupplierData();
    } catch (err) {
      console.error('Error submitting PPAP:', err);
      alert('Error submitting PPAP: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="supplier-portal-container">
      <header className="portal-header">
        <div className="header-info">
          <h1>Supplier Collaboration Portal</h1>
          <p>Continental Engineering Services (ID: CONT-8842)</p>
        </div>
        <div className="portal-actions">
          <button className="primary-btn" onClick={() => setIsModalOpen(true)}><Plus size={18} /> New PPAP Submission</button>
        </div>
      </header>

      <section className="portal-summary">
        <div className="summary-card glass">
          <div className="card-header">
            <Clock size={20} className="warning-text" />
            <h3>Action Required</h3>
          </div>
          <div className="action-item">
            <p>PPAP Package for <strong>CH-229-Front-Axle</strong> was rejected. Please review comments and resubmit.</p>
            <button className="text-btn">Review Comments <ChevronRight size={14} /></button>
          </div>
        </div>
        
        <div className="summary-card glass">
          <div className="card-header">
            <CheckCircle size={20} className="green-text" />
            <h3>Quality Rating</h3>
          </div>
          <div className="rating-display">
            <span className="rating-value">4.8</span>
            <span className="rating-label">Tier 1 Strategic Partner</span>
          </div>
        </div>
      </section>

      <div className="portal-main-grid">
        <section className="submissions-grid glass">
          <div className="section-header">
            <h3><Package size={20} /> My PPAP Submissions</h3>
          </div>
          <div className="submissions-table-wrapper">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Part / Program</th>
                  <th>Level</th>
                  <th>Status</th>
                  <th>Last Update</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => (
                  <tr key={sub.id}>
                    <td>
                      <div className="part-cell">
                        <strong>{sub.part_number || `Part #${sub.id.substring(0,8).toUpperCase()}`}</strong>
                        <span>{sub.programs?.program_name}</span>
                      </div>
                    </td>
                    <td>Level {sub.submission_level}</td>
                    <td>
                      <span className={`status-pill ${sub.status.toLowerCase().replace(' ', '-')}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td>{new Date(sub.created_at).toLocaleDateString()}</td>
                    <td>
                      <button className="icon-btn"><FileText size={16} /></button>
                      <button className="icon-btn"><MessageSquare size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="portal-sidebar">
          <div className="side-card glass">
            <h3><Info size={18} /> Technical Specifications</h3>
            <div className="spec-list">
              <div className="spec-item">
                <FileText size={14} />
                <span>GD&T Standards v2.4</span>
                <ExternalLink size={14} />
              </div>
              <div className="spec-item">
                <FileText size={14} />
                <span>Material Compliance - REACH</span>
                <ExternalLink size={14} />
              </div>
            </div>
          </div>

          <div className="side-card glass">
            <h3><AlertTriangle size={18} /> Notifications</h3>
            <div className="portal-notifications">
              <div className="notif">
                <p>New design freeze for EV-X Program. Check revised drawings.</p>
                <span>2 hours ago</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {isModalOpen && (
        <div className="modal-backdrop flex-center" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', zIndex: 1000, backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <motion.div className="modal-content glass p-xl" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', background: 'rgba(20, 20, 25, 0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}><Upload size={20}/> Stage 14: Submit PPAP Package</h3>
              <button className="text-btn" onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            
            <form onSubmit={handleSubmitPpap} className="flex-col gap-md" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group flex-col gap-xs" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#a0a0b0' }}>Vehicle Program</label>
                <select className="form-input" value={programId} onChange={(e) => setProgramId(e.target.value)} required style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text)' }}>
                  {activePrograms.map(p => (
                    <option key={p.id} value={p.id}>{p.program_name} ({p.program_code})</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group flex-col gap-xs" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#a0a0b0' }}>Part Number / Component Name</label>
                <input type="text" className="form-input" placeholder="e.g. Continental-Front-Axle-V3" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} required style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text)' }} />
              </div>
              
              <div className="form-group flex-col gap-xs" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#a0a0b0' }}>PPAP Submission Level</label>
                <select className="form-input" value={submissionLevel} onChange={(e) => setSubmissionLevel(e.target.value)} required style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text)' }}>
                  <option value="1">Level 1 - PSW Only</option>
                  <option value="2">Level 2 - PSW + Product Samples</option>
                  <option value="3">Level 3 - PSW + Full Supporting Data (Default)</option>
                  <option value="4">Level 4 - PSW + Customer Requirements</option>
                  <option value="5">Level 5 - PSW + Full Onsite Audit</option>
                </select>
              </div>
              
              <h4 style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', marginTop: '12px', color: 'var(--accent)' }}>Required Technical Documentation</h4>
              
              <div className="form-group flex-col gap-xs" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#a0a0b0' }}>Part Submission Warrant (PSW) Document URL / Description</label>
                <input type="text" className="form-input" placeholder="e.g. https://docs.continental.com/psw-front-axle-v3.pdf" value={pswUrl} onChange={(e) => setPswUrl(e.target.value)} required style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text)' }} />
              </div>
              
              <div className="form-group flex-col gap-xs" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#a0a0b0' }}>DFMEA URL (Design Failure Mode & Effects Analysis)</label>
                <input type="text" className="form-input" placeholder="e.g. https://docs.continental.com/dfmea-front-axle.pdf" value={dfmeaUrl} onChange={(e) => setDfmeaUrl(e.target.value)} style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text)' }} />
              </div>
              
              <div className="form-group flex-col gap-xs" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#a0a0b0' }}>PFMEA URL (Process Failure Mode & Effects Analysis)</label>
                <input type="text" className="form-input" placeholder="e.g. https://docs.continental.com/pfmea-front-axle.pdf" value={pfmeaUrl} onChange={(e) => setPfmeaUrl(e.target.value)} style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text)' }} />
              </div>
              
              <div className="form-group flex-col gap-xs" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#a0a0b0' }}>Control Plan URL / Description</label>
                <input type="text" className="form-input" placeholder="e.g. https://docs.continental.com/control-plan-axle.pdf" value={controlPlanUrl} onChange={(e) => setControlPlanUrl(e.target.value)} required style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'var(--text)' }} />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                <button type="button" className="secondary-btn" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', color: 'var(--text)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={loading} style={{ padding: '10px 18px', background: 'var(--accent)', border: 'none', borderRadius: '6px', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>
                  {loading ? 'Uploading Package...' : 'Submit PPAP Package'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SupplierDashboard;
