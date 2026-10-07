import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckSquare, 
  FileCheck, 
  ShieldCheck, 
  ClipboardList, 
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Eye,
  History
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import './QualityDashboard.css';

const QualityDashboard = () => {
  const [programs, setPrograms] = useState([]);
  const [ppapSubmissions, setPpapSubmissions] = useState([]);
  const [apqpGates, setApqpGates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mbomReviews, setMbomReviews] = useState([]);
  const [dvprRecords, setDvprRecords] = useState([]);
  const [validationTests, setValidationTests] = useState([]);

  useEffect(() => {
    fetchQualityData();
  }, []);

  const fetchQualityData = async () => {
    try {
      const { data: progs } = await supabase.from('programs').select('*').order('created_at', { ascending: false });
      const { data: ppap } = await supabase.from('ppap_submissions').select('*, programs(program_name)');
      const { data: gates } = await supabase.from('apqp_gates').select('*').order('gate_number', { ascending: true });
      const { data: mbom } = await supabase.from('mbom_reviews').select('*, programs(program_name)').order('created_at', { ascending: false });
      const { data: dvpr } = await supabase.from('dvpr_records').select('*, programs(program_name)');
      // Need to fetch validation_tests joined with prototype_builds so we know the program_id
      const { data: rawTests } = await supabase.from('validation_tests').select('*');
      
      let enrichedTests = [];
      if (rawTests && rawTests.length > 0) {
        enrichedTests = await Promise.all(rawTests.map(async (test) => {
          let protoData = null;
          if (test.prototype_id) {
            const { data: pData } = await supabase.from('prototype_builds').select('*').eq('id', test.prototype_id).maybeSingle();
            protoData = pData;
          }
          return { ...test, prototype_builds: protoData };
        }));
      }

      setPrograms(progs || []);
      setPpapSubmissions(ppap || []);
      setApqpGates(gates || []);
      setMbomReviews(mbom || []);
      setDvprRecords(dvpr || []);
      setValidationTests(enrichedTests || []);
    } catch (error) {
      console.error("Error fetching quality data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMbomDecision = async (id, decision) => {
    try {
      await supabase.from('mbom_reviews').update({ status: decision }).eq('id', id);
      fetchQualityData();
    } catch (err) {
      console.error('Error updating MBOM review:', err);
    }
  };

  const handleDvprApproval = async (programId) => {
    try {
      if (!programId) {
        alert('Error: No active program ID passed.');
        return;
      }

      // 1. Check if DVP&R record exists for this program
      const { data: existing, error: existErr } = await supabase
        .from('dvpr_records')
        .select('id')
        .eq('program_id', programId)
        .limit(1)
        .maybeSingle();

      if (existErr) throw existErr;

      if (existing) {
        // Update to Approved
        const { error: updErr } = await supabase
          .from('dvpr_records')
          .update({
            status: 'Approved',
            approval_date: new Date().toISOString()
          })
          .eq('program_id', programId);
        if (updErr) throw updErr;
      } else {
        // Insert new Approved record
        const { error: insErr } = await supabase
          .from('dvpr_records')
          .insert({
            program_id: programId,
            status: 'Approved',
            approval_date: new Date().toISOString()
          });
        if (insErr) throw insErr;
      }

      // 2. Advance APQP Gate 3 (DVP&R Approved) to Completed
      const { error: gateErr } = await supabase
        .from('apqp_gates')
        .update({
          gate_status: 'Completed',
          completion_percentage: 100,
          remarks: 'DVP&R Approved. Validation Phase successfully closed. Program transitioned to PPAP.'
        })
        .eq('program_id', programId)
        .eq('gate_number', 3);
        
      if (gateErr) throw gateErr;

      // 3. Update program status to PPAP
      await supabase.from('programs').update({ status: 'PPAP' }).eq('id', programId);

      alert('SUCCESS: DVP&R Document approved! Validation phase closed. PPAP phase unlocked.');
      fetchQualityData();
    } catch (err) {
      console.error('Error approving DVP&R:', err);
      alert('Error approving DVP&R: ' + err.message);
    }
  };

  const handlePpapDecision = async (id, status) => {
    try {
      const { error: ppapErr } = await supabase
        .from('ppap_submissions')
        .update({ status })
        .eq('id', id);
      
      if (ppapErr) throw ppapErr;

      if (status === 'Approved') {
        // Automatically advance APQP Gate 4 (PPAP Process) to completed
        const { error: gateErr } = await supabase
          .from('apqp_gates')
          .update({
            gate_status: 'Completed',
            completion_percentage: 100,
            remarks: 'Supplier PSW and Level 3 PPAP elements officially approved by Quality Assurance. Production release authorized.'
          })
          .eq('gate_number', 4);
        
        if (gateErr) throw gateErr;
        alert('SUCCESS: PPAP submission approved! Stage 14 (PPAP Process) completed and Gate 4 closed.');
      } else {
        alert('PPAP submission marked as Rejected. Notification sent back to supplier.');
      }

      fetchQualityData();
    } catch (err) {
      console.error('Error updating PPAP decision:', err);
      alert('Error updating PPAP decision: ' + err.message);
    }
  };

  return (
    <div className="quality-dashboard-container">
      <header className="quality-header">
        <div className="header-info">
          <h1>Quality Assurance & Compliance</h1>
          <p>APQP Lifecycle Management and PPAP Approval Center</p>
        </div>
        <div className="compliance-badge glass-dark">
          <ShieldCheck size={18} />
          <span>IATF 16949 Compliant</span>
        </div>
      </header>

      <div className="quality-main-grid">
        <section className="mbom-review-center glass" style={{ gridColumn: '1 / -1', marginBottom: '24px' }}>
          <div className="section-header">
            <h3><FileText size={20} /> eBOM / MBOM Review Queue</h3>
          </div>
          <div className="audit-table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Program</th>
                  <th>Submitted By</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {mbomReviews.length === 0 ? (
                  <tr><td colSpan="5" className="text-center text-muted">No pending BOM reviews.</td></tr>
                ) : mbomReviews.map(review => (
                  <tr key={review.id}>
                    <td style={{color: 'var(--accent)'}}><strong>{review.programs?.program_name || 'Unknown'}</strong></td>
                    <td>Design Engineering</td>
                    <td>{new Date(review.created_at).toLocaleDateString()}</td>
                    <td><span className={`status-pill ${review.status.toLowerCase()}`}>{review.status}</span></td>
                    <td>
                      {review.status === 'Pending' ? (
                        <div style={{display: 'flex', gap: '8px'}}>
                          <button className="success-btn small" onClick={() => handleMbomDecision(review.id, 'Approved')}>Approve</button>
                          <button className="danger-btn small" onClick={() => handleMbomDecision(review.id, 'Rejected')}>Reject</button>
                        </div>
                      ) : (
                        <span style={{color: 'var(--text-muted)'}}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="dvpr-verification-center glass" style={{ gridColumn: '1 / -1', marginBottom: '24px' }}>
          <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={20} color="var(--accent)" />
            <h3 style={{ margin: 0 }}>Stage 13: DVP&R Verification & Approval Center</h3>
          </div>
          
          <div className="dvpr-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', padding: '16px 0', marginBottom: '16px' }}>
            <div className="metric-card glass-dark" style={{ padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', tracking: '0.05em' }}>Total Validation Tests</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent)', marginTop: '4px' }}>{validationTests.length}</div>
            </div>
            <div className="metric-card glass-dark" style={{ padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', tracking: '0.05em' }}>Passed Protocols</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00ff9d', marginTop: '4px' }}>{validationTests.filter(t => t.status === 'Passed').length}</div>
            </div>
            <div className="metric-card glass-dark" style={{ padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', tracking: '0.05em' }}>Failed Protocols</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--error)', marginTop: '4px' }}>{validationTests.filter(t => t.status === 'Failed').length}</div>
            </div>
            <div className="metric-card glass-dark" style={{ padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', tracking: '0.05em' }}>DVP&R Phase Gate Status</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text)', marginTop: '8px' }}>
                <span className={`status-pill ${dvprRecords.some(d => d.status === 'Approved') ? 'passed' : 'scheduled'}`}>
                  {dvprRecords.some(d => d.status === 'Approved') ? 'APPROVED & CLOSED' : 'PENDING APPROVAL'}
                </span>
              </div>
            </div>
          </div>

          <div className="audit-table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Vehicle Program</th>
                  <th>Total Tests Run</th>
                  <th>Pass Rate</th>
                  <th>DVP&R Status</th>
                  <th>Validation Phase Sign-Off</th>
                </tr>
              </thead>
              <tbody>
                {programs.length === 0 ? (
                  <tr><td colSpan="5" className="text-center text-muted">No active programs found.</td></tr>
                ) : programs.map(prog => {
                  // Calculate stats for this specific program
                  const progTests = validationTests.filter(t => t.prototype_builds?.program_id === prog.id);
                  const passedTests = progTests.filter(t => t.status === 'Passed').length;
                  const passRate = progTests.length > 0 ? Math.round((passedTests / progTests.length) * 100) : 0;
                  const isApproved = dvprRecords.some(d => d.program_id === prog.id && d.status === 'Approved');

                  return (
                    <tr key={prog.id}>
                      <td style={{color: 'var(--accent)'}}><strong>{prog.program_name}</strong></td>
                      <td>{progTests.length} Tests</td>
                      <td><strong>{progTests.length > 0 ? `${passRate}%` : 'N/A'}</strong></td>
                      <td>
                        <span className={`status-pill ${isApproved ? 'passed' : 'scheduled'}`}>
                          {isApproved ? 'Approved' : 'Pending Approval'}
                        </span>
                      </td>
                      <td>
                        {!isApproved ? (
                          <button 
                            className="primary-btn small" 
                            onClick={() => handleDvprApproval(prog.id)}
                            disabled={progTests.length === 0 || passedTests !== progTests.length}
                            title={progTests.length === 0 ? "Waiting for Validation Tests" : passedTests !== progTests.length ? "All tests must pass before DVP&R approval" : ""}
                            style={{ 
                              opacity: (progTests.length === 0 || passedTests !== progTests.length) ? 0.5 : 1,
                              cursor: (progTests.length === 0 || passedTests !== progTests.length) ? 'not-allowed' : 'pointer'
                            }}
                          >
                            Approve DVP&R Document
                          </button>
                        ) : (
                          <span className="text-success" style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                            <CheckCircle2 size={16} /> Validation Phase Closed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ppap-center glass">
          <div className="section-header">
            <h3><FileCheck size={20} /> PPAP Submission Queue</h3>
            <div className="header-tools">
              <div className="search-box">
                <Search size={14} />
                <input type="text" placeholder="Search supplier..." />
              </div>
            </div>
          </div>
          <div className="ppap-list">
            {ppapSubmissions.length > 0 ? ppapSubmissions.map(ppap => (
              <div key={ppap.id} className="ppap-item glass-dark">
                <div className="ppap-main">
                  <div className="ppap-info">
                    <h4>{ppap.programs?.program_name || 'Falcon X'} - Continental</h4>
                    <p>Level {ppap.submission_level} Submission</p>
                  </div>
                  <div className="ppap-status">
                    <span className={`status-pill ${ppap.status.replace(' ', '-').toLowerCase()}`}>{ppap.status}</span>
                  </div>
                </div>
                <div className="ppap-footer">
                  <span className="ppap-date">Submitted: {new Date(ppap.created_at).toLocaleDateString()}</span>
                  <div className="ppap-actions">
                    <button className="action-btn" title="View Documents" onClick={() => alert(`PART SUBMISSION WARRANT (PSW) INSPECTION:\n\nPSW Document URL: ${ppap.psw_url}\n\nDFMEA Document: ${ppap.dfmea_url || 'Not Provided'}\nPFMEA Document: ${ppap.pfmea_url || 'Not Provided'}\nControl Plan: ${ppap.control_plan_url}`)}><Eye size={16} /></button>
                    <button className="action-btn" title="Approve" onClick={() => handlePpapDecision(ppap.id, 'Approved')}><CheckCircle2 size={16} className="green-text" /></button>
                    <button className="action-btn" title="Reject" onClick={() => handlePpapDecision(ppap.id, 'Rejected')}><AlertCircle size={16} className="red-text" /></button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="empty-state">No pending PPAP submissions</div>
            )}
          </div>
        </section>

        <section className="apqp-tracker glass">
          <div className="section-header">
            <h3><ClipboardList size={20} /> APQP Gate Status</h3>
          </div>
          <div className="gate-timeline">
            {apqpGates.map(gate => (
              <div key={gate.id} className="gate-node">
                <div className="node-marker" data-status={gate.gate_status}>
                  {gate.gate_status === 'Completed' ? <CheckCircle2 size={16} /> : gate.gate_number}
                </div>
                <div className="node-content">
                  <div className="node-header">
                    <h4>Gate {gate.gate_number}: {gate.gate_name}</h4>
                    <span className="node-percentage">{gate.completion_percentage}%</span>
                  </div>
                  <div className="node-progress">
                    <div className="fill" style={{width: `${gate.completion_percentage}%`}}></div>
                  </div>
                  <p className="node-remarks">{gate.remarks || 'No remarks recorded'}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="audit-section glass">
        <div className="section-header">
          <h3><History size={20} /> Compliance Audit Trail</h3>
          <button className="secondary-btn"><Download size={16} /> Export Audit Log</button>
        </div>
        <div className="audit-table-wrapper">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Subject</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>2026-05-16 14:20</td>
                <td>System Auditor</td>
                <td>Validation Check</td>
                <td>DVP&R-092</td>
                <td><span className="audit-pass">PASS</span></td>
              </tr>
              <tr>
                <td>2026-05-16 11:05</td>
                <td>Quality Manager</td>
                <td>PPAP Approval</td>
                <td>Continental-CH-01</td>
                <td><span className="audit-pass">APPROVED</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QualityDashboard;
