import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle2, AlertCircle, Wrench, Factory, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './ProcurementDashboard.css';

const ManufacturingDashboard = () => {
  const [mbomReviews, setMbomReviews] = useState([]);
  const [prototypeBuilds, setPrototypeBuilds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchMfgData(); }, []);

  const fetchMfgData = async () => {
    try {
      // Only fetch THIS role's review rows (Manufacturing Engineer)
      const { data: mbom } = await supabase
        .from('mbom_reviews')
        .select('*, programs(program_name)')
        .eq('role', 'Manufacturing Engineer')
        .order('created_at', { ascending: false });

      const { data: protos } = await supabase
        .from('prototype_builds')
        .select('*, programs(program_name)')
        .order('created_at', { ascending: false });

      setMbomReviews(mbom || []);
      setPrototypeBuilds(protos || []);
    } catch (error) {
      console.error('Error fetching mfg data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMbomDecision = async (review, decision) => {
    try {
      // 1. Update Manufacturing row
      await supabase
        .from('mbom_reviews')
        .update({ status: decision, comments: `Manufacturing Engineer: ${decision === 'Approved' ? 'DFM feasible. Approved for Procurement review.' : 'Assembly risk identified. BOM rejected.'}` })
        .eq('id', review.id);

      if (decision === 'Approved') {
        // 2. Unlock Procurement row (set from Blocked → Pending)
        await supabase
          .from('mbom_reviews')
          .update({ status: 'Pending', comments: 'Manufacturing approved. Awaiting Procurement Engineer sourcing review.' })
          .eq('program_id', review.program_id)
          .eq('role', 'Procurement Engineer')
          .eq('status', 'Blocked');

        // 3. Activity log
        await supabase.from('activity_logs').insert({
          program_id: review.program_id,
          action_type: 'eBOM Approved (Manufacturing)',
          action_description: `Manufacturing Engineer approved eBOM for ${review.programs?.program_name}. Procurement review unlocked.`
        });
        alert('✅ DFM Approved. Procurement Engineer can now review the BOM.');
      } else {
        alert('❌ Assembly risk flagged. BOM returned to Design Engineer.');
      }

      fetchMfgData();
    } catch (err) {
      console.error('Error updating review:', err);
      alert('Error: ' + err.message);
    }
  };

  const advanceBuildStatus = async (id, currentStatus) => {
    const statuses = ['Planning', 'Parts Sourcing', 'Sub-Assembly', 'Final Assembly', 'Inspection', 'Complete'];
    const nextIdx = statuses.indexOf(currentStatus) + 1;
    if (nextIdx >= statuses.length) return;
    try {
      await supabase.from('prototype_builds').update({ status: statuses[nextIdx] }).eq('id', id);
      if (statuses[nextIdx] === 'Complete') {
        const { error: testError } = await supabase.from('validation_tests').insert([
          { prototype_id: id, test_name: 'Crash Worthiness (Frontal)', test_category: 'Safety', status: 'Scheduled' },
          { prototype_id: id, test_name: 'Battery Thermal Runaway', test_category: 'Powertrain', status: 'Scheduled' },
          { prototype_id: id, test_name: 'NVH Acoustics Evaluation', test_category: 'Comfort', status: 'Scheduled' }
        ]);
        
        if (testError) {
          alert(`Error creating validation tests: ${testError.message}`);
          console.error('Validation test insert error:', testError);
        } else {
          alert('Prototype marked as Complete! Validation tests have been automatically scheduled.');
        }
      }
      fetchMfgData();
    } catch (err) {
      console.error('Error updating build:', err);
      alert('Error: ' + err.message);
    }
  };

  if (loading) return <div className="flex-center h-100">Loading Manufacturing Data...</div>;

  return (
    <div className="procurement-dashboard">
      <header className="proc-header">
        <div className="header-info">
          <div className="status-badge" style={{ background: 'rgba(255,170,0,0.1)', color: 'var(--warning)' }}>PLANT OPERATIONS</div>
          <h1>Manufacturing Engineering</h1>
          <p>DFM Analysis // eBOM Approval (Stage 1 of 3) // Prototype Assembly</p>
        </div>
      </header>

      <div className="proc-main-grid" style={{ gridTemplateColumns: '1fr' }}>
        <section className="glass p-xl">
          <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Settings size={20} />
            <h3 style={{ margin: 0 }}>eBOM Review — Stage 1: Manufacturing DFM</h3>
          </div>
          <p className="text-muted" style={{ marginBottom: '16px', fontSize: '0.85rem' }}>
            You are the <strong>first reviewer</strong> in the sequential eBOM approval chain.
            Your approval unlocks the Procurement Engineer's review. Procurement cannot act until you approve.
          </p>

          {/* Stage indicator */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center' }}>
            <span style={{ background: 'rgba(255,170,0,0.12)', color: 'var(--warning)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>STAGE 1 — MANUFACTURING ✓</span>
            <span style={{ color: '#404050', fontSize: '0.75rem' }}>→ Stage 2: Procurement → Stage 3: Design</span>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Program</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mbomReviews.length === 0 ? (
                <tr><td colSpan="4" className="text-center text-muted">No eBOM reviews pending for Manufacturing.</td></tr>
              ) : mbomReviews.map(review => (
                <tr key={review.id}>
                  <td style={{ color: 'var(--accent)' }}><strong>{review.programs?.program_name || 'Unknown'}</strong></td>
                  <td>{new Date(review.created_at).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-pill ${review.status.toLowerCase()}`}>{review.status}</span>
                  </td>
                  <td>
                    {review.status === 'Pending' ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="success-btn small" onClick={() => handleMbomDecision(review, 'Approved')}>✓ Feasible — Approve</button>
                        <button className="danger-btn small" onClick={() => handleMbomDecision(review, 'Rejected')}>✗ Assembly Risk</button>
                      </div>
                    ) : review.status === 'Approved' ? (
                      <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>✓ Approved — Procurement reviewing</span>
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
            <Factory size={20} />
            <h3 style={{ margin: 0 }}>Active Prototype Builds</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Program</th><th>Build Type</th><th>Plant</th><th>Phase</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {prototypeBuilds.length === 0 ? (
                <tr><td colSpan="5" className="text-center text-muted">No active prototype builds.</td></tr>
              ) : prototypeBuilds.map(build => (
                <tr key={build.id}>
                  <td style={{ color: 'var(--accent)' }}><strong>{build.programs?.program_name || 'Unknown'}</strong></td>
                  <td>{build.build_type} (Qty: {build.quantity})</td>
                  <td>{build.plant_location || 'TBD'}</td>
                  <td><span className="status-pill scheduled">{build.status}</span></td>
                  <td>
                    {build.status !== 'Complete' ? (
                      (() => {
                        const statuses = ['Planning', 'Parts Sourcing', 'Sub-Assembly', 'Final Assembly', 'Inspection', 'Complete'];
                        const nextStatus = statuses[statuses.indexOf(build.status) + 1] || 'Next Stage';
                        return (
                          <button className="primary-btn small" onClick={() => advanceBuildStatus(build.id, build.status)}>
                            Move to {nextStatus}
                          </button>
                        );
                      })()
                    ) : (
                      <span style={{ color: 'var(--success)' }}>Ready for Validation</span>
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

export default ManufacturingDashboard;
