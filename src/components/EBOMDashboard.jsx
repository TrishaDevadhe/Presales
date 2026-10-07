import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Send, Activity, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import './EBOMDashboard.css';

// Sequential approval stages in order
const APPROVAL_STAGES = [
  { role: 'Manufacturing Engineer', label: 'Manufacturing', icon: '🏭' },
  { role: 'Procurement Engineer',   label: 'Procurement',  icon: '🚚' },
  { role: 'Design Engineer',        label: 'Design',       icon: '✏️' },
];

const EBOMDashboard = () => {
  const { profile } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [bomItems, setBomItems] = useState([]);
  const [bomReviews, setBomReviews] = useState([]); // all mbom_review rows for selected program
  const [loading, setLoading] = useState(true);

  // Form State
  const [partNumber, setPartNumber] = useState('');
  const [partName, setPartName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [material, setMaterial] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchPrograms(); }, []);
  useEffect(() => { if (selectedProgram) { fetchBOM(); fetchReviews(); } }, [selectedProgram]);

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .in('status', ['Design', 'Prototype', 'Validation', 'PPAP', 'Production'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPrograms(data || []);
      if (data && data.length > 0) setSelectedProgram(data[0]);
    } catch (err) {
      console.error('Error fetching programs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBOM = async () => {
    const { data, error } = await supabase
      .from('ebom')
      .select('*')
      .eq('program_id', selectedProgram.id)
      .order('created_at', { ascending: true });
    if (!error) setBomItems(data || []);
  };

  const fetchReviews = async () => {
    const { data } = await supabase
      .from('mbom_reviews')
      .select('*')
      .eq('program_id', selectedProgram.id)
      .order('created_at', { ascending: true });
    setBomReviews(data || []);
  };

  // Derive current pipeline stage from reviews
  const getPipelineStatus = () => {
    if (bomReviews.length === 0) return { submitted: false };
    const byRole = {};
    bomReviews.forEach(r => { byRole[r.role] = r; });
    return { submitted: true, byRole };
  };

  const handleAddPart = async () => {
    if (!partNumber || !partName) return alert('Part Number and Name are required.');
    try {
      const { error } = await supabase.from('ebom').insert({
        program_id: selectedProgram.id,
        part_number: partNumber,
        part_name: partName,
        quantity: parseInt(quantity),
        material: material,
        revision: 'A'
      });
      if (error) throw error;
      setPartNumber(''); setPartName(''); setQuantity(1); setMaterial('');
      fetchBOM();
    } catch (err) {
      alert(`Failed to add part: ${err.message}`);
    }
  };

  // Submit creates ONE mbom_review per stage, all starting as Pending
  // Procurement and Design rows are created with a 'Blocked' status initially —
  // each dashboard unlocks its row only after the previous stage is 'Approved'.
  const handleSubmitReview = async () => {
    if (bomItems.length === 0) return alert('BOM is empty. Add parts first.');
    const pipeline = getPipelineStatus();
    if (pipeline.submitted) return alert('BOM has already been submitted for review.');
    setIsSubmitting(true);
    try {
      // Create all three stage rows — Mfg starts Pending, others start Blocked
      const rows = APPROVAL_STAGES.map((stage, idx) => ({
        program_id: selectedProgram.id,
        ebom_id: bomItems[0].id,
        reviewer_id: null,
        role: stage.role,
        status: idx === 0 ? 'Pending' : 'Blocked',
        comments: idx === 0
          ? 'Awaiting Manufacturing Engineer DFM review.'
          : idx === 1
          ? 'Blocked: awaiting Manufacturing Engineer approval first.'
          : 'Blocked: awaiting Procurement Engineer approval first.'
      }));
      const { error } = await supabase.from('mbom_reviews').insert(rows);
      if (error) throw error;
      await supabase.from('activity_logs').insert({
        program_id: selectedProgram.id,
        action_type: 'eBOM Submitted',
        action_description: `Design Engineer submitted eBOM for ${selectedProgram.program_name} for sequential cross-functional review.`
      });
      alert('✅ eBOM submitted! Sequential review started:\n1. Manufacturing Engineer (active now)\n2. Procurement Engineer (unlocks after Mfg approval)\n3. Design Engineer (unlocks after Procurement approval)');
      fetchReviews();
    } catch (err) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex-center h-100"><Activity className="animate-spin text-accent" /></div>;

  const pipeline = getPipelineStatus();

  return (
    <div className="ebom-dashboard">
      <header className="ebom-header">
        <div className="header-left">
          <div className="status-badge-ebom">BOM CREATION PHASE</div>
          <h1>Engineering BOM (eBOM)</h1>
          <p className="technical-meta">PARTS DEFINITION // MATERIAL SOURCING // SEQUENTIAL REVIEW</p>
        </div>
      </header>

      <div className="ebom-content">
        <aside className="ebom-sidebar">
          <div className="sidebar-header"><h3>Active Programs</h3></div>
          <div className="program-list">
            {programs.map(prog => (
              <div
                key={prog.id}
                className={`program-card ${selectedProgram?.id === prog.id ? 'active' : ''}`}
                onClick={() => setSelectedProgram(prog)}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{prog.program_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{prog.id.substring(0, 8).toUpperCase()}</div>
              </div>
            ))}
          </div>
        </aside>

        <div className="ebom-workspace">
          <div className="workspace-header">
            <h3>{selectedProgram?.program_name} — Master Parts List</h3>
            {!pipeline.submitted ? (
              <button className="primary-btn" onClick={handleSubmitReview} disabled={isSubmitting}>
                <Send size={16} /> {isSubmitting ? 'Submitting...' : 'Submit for Review'}
              </button>
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 'bold' }}>✓ BOM Submitted</span>
            )}
          </div>

          {/* Sequential Approval Pipeline Status */}
          {pipeline.submitted && (
            <div style={{ display: 'flex', gap: '0', marginBottom: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
              {APPROVAL_STAGES.map((stage, idx) => {
                const review = pipeline.byRole?.[stage.role];
                const status = review?.status || 'Blocked';
                const isActive = status === 'Pending';
                const isDone = status === 'Approved';
                const isRejected = status === 'Rejected';
                const color = isDone ? 'var(--success)' : isRejected ? 'var(--error)' : isActive ? 'var(--accent)' : '#404050';
                return (
                  <div key={stage.role} style={{ flex: 1, padding: '14px 16px', borderRight: idx < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none', background: isActive ? 'rgba(0,210,157,0.04)' : 'transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '1.1rem' }}>{stage.icon}</span>
                      {isDone ? <CheckCircle2 size={14} style={{ color: 'var(--success)' }} /> : isActive ? <Clock size={14} style={{ color: 'var(--accent)' }} /> : isRejected ? <AlertTriangle size={14} style={{ color: 'var(--error)' }} /> : null}
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color }}>{stage.label}</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: `${color}18`, color, fontWeight: 'bold' }}>
                      {isDone ? 'Approved' : isActive ? 'In Review' : isRejected ? 'Rejected' : 'Waiting'}
                    </span>
                    {review?.comments && !isDone && !isActive && (
                      <p style={{ fontSize: '0.68rem', color: '#505060', margin: '4px 0 0 0' }}>{review.comments.split(':')[0]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="bom-table-container">
            <table className="bom-table">
              <thead>
                <tr>
                  <th>Part No.</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Material</th>
                  <th>Rev</th>
                </tr>
              </thead>
              <tbody>
                {bomItems.length === 0 ? (
                  <tr><td colSpan="5" className="text-center text-muted">No parts added to the EBOM yet.</td></tr>
                ) : bomItems.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{item.part_number}</td>
                    <td>{item.part_name}</td>
                    <td>{item.quantity}</td>
                    <td>{item.material || 'N/A'}</td>
                    <td>{item.revision}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="add-part-form">
            <div className="form-group">
              <label>Part Number</label>
              <input type="text" placeholder="e.g. ASM-9901" value={partNumber} onChange={e => setPartNumber(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input type="text" placeholder="e.g. Battery Tray" value={partName} onChange={e => setPartName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Quantity</label>
              <input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Material (Optional)</label>
              <input type="text" placeholder="e.g. AL-6061" value={material} onChange={e => setMaterial(e.target.value)} />
            </div>
            <button className="primary-btn" style={{ height: '38px' }} onClick={handleAddPart}>
              <Plus size={16} /> Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EBOMDashboard;
