import React, { useState, useEffect } from 'react';
import { Truck, ShoppingCart, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './ProcurementDashboard.css';

const ProcurementDashboard = () => {
  const [mbomReviews, setMbomReviews] = useState([]);
  const [prototypeBuilds, setPrototypeBuilds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchProcurementData(); }, []);

  const fetchProcurementData = async () => {
    try {
      // Only fetch THIS role's review rows (Procurement Engineer)
      const { data: mbom } = await supabase
        .from('mbom_reviews')
        .select('*, programs(program_name)')
        .eq('role', 'Procurement Engineer')
        .order('created_at', { ascending: false });

      const { data: protos } = await supabase
        .from('prototype_builds')
        .select('*, programs(program_name)')
        .order('created_at', { ascending: false });

      setMbomReviews(mbom || []);
      setPrototypeBuilds(protos || []);
    } catch (error) {
      console.error('Error fetching procurement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMbomDecision = async (review, decision) => {
    try {
      // 1. Update Procurement row
      await supabase
        .from('mbom_reviews')
        .update({ status: decision, comments: `Procurement Engineer: ${decision === 'Approved' ? 'All parts sourceable. Approved for Design Engineer final sign-off.' : 'Supplier lead-time risk. BOM rejected.'}` })
        .eq('id', review.id);

      if (decision === 'Approved') {
        // 2. Unlock Design Engineer row
        await supabase
          .from('mbom_reviews')
          .update({ status: 'Pending', comments: 'Procurement approved. Awaiting Design Engineer final sign-off.' })
          .eq('program_id', review.program_id)
          .eq('role', 'Design Engineer')
          .eq('status', 'Blocked');

        await supabase.from('activity_logs').insert({
          program_id: review.program_id,
          action_type: 'eBOM Approved (Procurement)',
          action_description: `Procurement Engineer approved eBOM for ${review.programs?.program_name}. Design Engineer final review unlocked.`
        });
        alert('✅ Sourcing Approved. Design Engineer can now perform the final eBOM sign-off.');
      } else {
        alert('❌ Supplier delay risk flagged. BOM returned to Design Engineer for revision.');
      }

      fetchProcurementData();
    } catch (err) {
      console.error('Error updating review:', err);
      alert('Error: ' + err.message);
    }
  };

  const handlePartSourcing = async (id, currentStatus) => {
    if (currentStatus !== 'Planning') return;
    try {
      await supabase.from('prototype_builds').update({ status: 'Parts Sourcing' }).eq('id', id);
      fetchProcurementData();
    } catch (err) {
      console.error('Error updating build:', err);
    }
  };

  if (loading) return <div className="flex-center h-100">Loading Procurement Data...</div>;

  return (
    <div className="procurement-dashboard">
      <header className="proc-header">
        <div className="header-info">
          <div className="status-badge" style={{ background: 'rgba(0,255,157,0.1)', color: 'var(--success)' }}>SOURCING &amp; SUPPLY CHAIN</div>
          <h1>Procurement Dashboard</h1>
          <p>eBOM Approval (Stage 2 of 3) // Supplier Readiness // Prototype Sourcing</p>
        </div>
      </header>

      <div className="proc-main-grid">
        <section className="glass p-xl">
          <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Truck size={20} />
            <h3 style={{ margin: 0 }}>eBOM Review — Stage 2: Procurement Sourcing</h3>
          </div>
          <p className="text-muted" style={{ marginBottom: '16px', fontSize: '0.85rem' }}>
            You are the <strong>second reviewer</strong>. Only BOMs already approved by Manufacturing Engineering are shown here.
            Your approval unlocks the Design Engineer's final sign-off.
          </p>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center' }}>
            <span style={{ color: '#404050', fontSize: '0.75rem' }}>Stage 1: Manufacturing →</span>
            <span style={{ background: 'rgba(0,255,157,0.12)', color: 'var(--success)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>STAGE 2 — PROCUREMENT ✓</span>
            <span style={{ color: '#404050', fontSize: '0.75rem' }}>→ Stage 3: Design</span>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Program</th><th>Submitted</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mbomReviews.length === 0 ? (
                <tr><td colSpan="4" className="text-center text-muted">No eBOM reviews available for Procurement.</td></tr>
              ) : mbomReviews.map(review => (
                <tr key={review.id}>
                  <td style={{ color: 'var(--accent)' }}><strong>{review.programs?.program_name || 'Unknown'}</strong></td>
                  <td>{new Date(review.created_at).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-pill ${review.status.toLowerCase()}`}>{review.status}</span>
                  </td>
                  <td>
                    {review.status === 'Blocked' ? (
                      <span style={{ color: '#404050', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Lock size={13} /> Awaiting Manufacturing approval
                      </span>
                    ) : review.status === 'Pending' ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="success-btn small" onClick={() => handleMbomDecision(review, 'Approved')}>✓ Sourceable — Approve</button>
                        <button className="danger-btn small" onClick={() => handleMbomDecision(review, 'Rejected')}>✗ Delay Risk</button>
                      </div>
                    ) : review.status === 'Approved' ? (
                      <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>✓ Approved — Design reviewing</span>
                    ) : (
                      <span style={{ color: 'var(--error)', fontSize: '0.85rem' }}>✗ Rejected</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="glass p-xl">
          <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <ShoppingCart size={20} />
            <h3 style={{ margin: 0 }}>Prototype Part Orders</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Program</th><th>Build Type</th><th>Qty</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {prototypeBuilds.length === 0 ? (
                <tr><td colSpan="5" className="text-center text-muted">No prototype builds authorized yet.</td></tr>
              ) : prototypeBuilds.map(build => (
                <tr key={build.id}>
                  <td style={{ color: 'var(--accent)' }}><strong>{build.programs?.program_name || 'Unknown'}</strong></td>
                  <td>{build.build_type}</td>
                  <td>{build.quantity} units</td>
                  <td><span className="status-pill scheduled">{build.status}</span></td>
                  <td>
                    {build.status === 'Planning' ? (
                      <button className="primary-btn small" onClick={() => handlePartSourcing(build.id, build.status)}>Generate POs &amp; Order Parts</button>
                    ) : (
                      <span style={{ color: 'var(--success)' }}>Parts Ordered</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
};

export default ProcurementDashboard;
