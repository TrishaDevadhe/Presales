import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TestTube, FileCheck, AlertOctagon, CheckCircle, Clock, PlayCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import './ValidationDashboard.css';

const ValidationDashboard = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('test-schedule');
  const [tests, setTests] = useState([]);
  const [ecos, setEcos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      // 1. Fetch raw validation tests
      const { data: rawTests, error } = await supabase
        .from('validation_tests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        alert(`Validation Fetch Error: ${error.message}`);
        throw error;
      }

      if (!rawTests || rawTests.length === 0) {
        setTests([]);
        setLoading(false);
        return;
      }

      // 2. Safely enrich the data using manual joins to avoid PGRST200 schema cache errors
      const enrichedTests = await Promise.all(rawTests.map(async (test) => {
        let protoData = null;

        if (test.prototype_id) {
          // Fetch prototype details and its program
          const { data: pData } = await supabase
            .from('prototype_builds')
            .select('*, programs(*)')
            .eq('id', test.prototype_id)
            .single();
            
          protoData = pData;
        }

        return {
          ...test,
          prototype_builds: protoData
        };
      }));

      // 3. Fetch ECOs
      const { data: rawEcos, error: ecoFetchError } = await supabase.from('eco_requests').select('*').order('created_at', { ascending: false });
      
      if (ecoFetchError) {
        alert('ECO Fetch Error: ' + ecoFetchError.message);
      }
      
      setEcos(rawEcos || []);

      setTests(enrichedTests);
    } catch (err) {
      console.error('Error fetching tests:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateTestStatus = async (id, status) => {
    try {
      await supabase.from('validation_tests').update({ status }).eq('id', id);
      fetchTests();
    } catch (err) {
      console.error('Error updating test:', err);
    }
  };

  const failTestTriggerECO = async (test) => {
    const reason = prompt("Enter failure reason to trigger Engineering Change Order (ECO):");
    if (!reason) return;

    try {
      // Mark as Failed
      await supabase.from('validation_tests').update({ status: 'Failed', failure_reason: reason }).eq('id', test.id);
      
      // Trigger ECO in eco_requests table
      const payload = {
        program_id: test.prototype_builds?.program_id || null,
        title: `Validation Failure ECO: ${test.test_name}`,
        description: `Test failed during physical validation. Reason: ${reason}. Redesign required immediately.`,
        priority: 'Urgent',
        status: 'Pending'
      };
      
      const res = await supabase.from('eco_requests').insert(payload).select();
      
      if (res.error) {
        alert(`Database Error on ECO Insert: ${res.error.message} (Details: ${res.error.details || 'none'})`);
        console.error('ECO Insert Error:', res.error);
        return;
      }

      alert('SUCCESS! Database returned row: ' + JSON.stringify(res.data));
      fetchTests();
    } catch (err) {
      console.error('Error triggering ECO:', err);
    }
  };

  if (loading) return <div className="flex-center h-100">Loading Validation Systems...</div>;

  return (
    <div className="validation-dashboard">
      <header className="val-header">
        <div className="header-left">
          <div className="status-badge-val">VALIDATION PHASE ACTIVE</div>
          <h1>Test Engineering & DVP&R</h1>
          <p className="technical-meta">PROTOTYPE TESTING // FAILURE LOGGING // ECO TRIGGERS</p>
        </div>
      </header>

      <div className="val-content">
        <div className="val-tabs">
          <button className={`tab-btn ${activeTab === 'test-schedule' ? 'active' : ''}`} onClick={() => setActiveTab('test-schedule')}>
            <Clock size={16} /> Test Schedule
          </button>
          <button className={`tab-btn ${activeTab === 'dvpr' ? 'active' : ''}`} onClick={() => setActiveTab('dvpr')}>
            <FileCheck size={16} /> DVP&R Matrix
          </button>
          <button className={`tab-btn ${activeTab === 'failures' ? 'active' : ''}`} onClick={() => setActiveTab('failures')}>
            <AlertOctagon size={16} /> Critical Failures
          </button>
        </div>

        <div className="val-tab-content glass">
          {activeTab === 'test-schedule' && (
            <div className="test-list">
              <h3>Active Validation Tests</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Test Protocol</th>
                    <th>Program</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.length === 0 ? (
                    <tr><td colSpan="5">No tests scheduled. Waiting for Prototype Build completion.</td></tr>
                  ) : (
                    tests.map(test => (
                      <tr key={test.id}>
                        <td><strong>{test.test_name}</strong></td>
                        <td>{test.prototype_builds?.programs?.program_name}</td>
                        <td>{test.test_category}</td>
                        <td>
                          <span className={`status-pill ${test.status.toLowerCase().replace(' ', '-')}`}>
                            {test.status}
                          </span>
                        </td>
                        <td>
                          {test.status === 'Scheduled' && (
                            <button className="secondary-btn small" onClick={() => updateTestStatus(test.id, 'In Progress')}>
                              <PlayCircle size={14} /> Start Execution
                            </button>
                          )}
                          {test.status === 'In Progress' && (
                            <div style={{display: 'flex', gap: '8px'}}>
                              <button className="success-btn small" onClick={() => updateTestStatus(test.id, 'Passed')}>Pass</button>
                              <button className="danger-btn small" onClick={() => failTestTriggerECO(test)}>Fail (Trigger ECO)</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'dvpr' && (
            <div className="dvpr-view">
              <h3>Design Verification Plan & Report (DVP&R) Matrix</h3>
              <p className="text-muted" style={{ marginBottom: '16px' }}>Aggregate validation metrics across all active prototype builds.</p>
              
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Program</th>
                    <th>Total Tests</th>
                    <th>Passed</th>
                    <th>Failed</th>
                    <th>Compliance (%)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(
                    tests.reduce((acc, test) => {
                      const progName = test.prototype_builds?.programs?.program_name || 'Unknown Program';
                      if (!acc[progName]) acc[progName] = { total: 0, passed: 0, failed: 0 };
                      acc[progName].total += 1;
                      if (test.status === 'Passed') acc[progName].passed += 1;
                      if (test.status === 'Failed') acc[progName].failed += 1;
                      return acc;
                    }, {})
                  ).map(([progName, stats]) => {
                    const passRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
                    return (
                      <tr key={progName}>
                        <td style={{ color: 'var(--accent)' }}><strong>{progName}</strong></td>
                        <td>{stats.total}</td>
                        <td style={{ color: 'var(--success)' }}>{stats.passed}</td>
                        <td style={{ color: 'var(--error)' }}>{stats.failed}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '100px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                              <div style={{ width: `${passRate}%`, height: '100%', background: passRate === 100 ? 'var(--success)' : passRate > 50 ? 'var(--warning)' : 'var(--error)', borderRadius: '3px' }}></div>
                            </div>
                            <span>{passRate}%</span>
                          </div>
                        </td>
                        <td>
                          {stats.failed > 0 ? (
                            <span className="status-pill rejected">Non-Compliant</span>
                          ) : passRate === 100 ? (
                            <span className="status-pill scheduled" style={{ background: 'rgba(46,204,113,0.1)', color: 'var(--success)', border: '1px solid rgba(46,204,113,0.3)' }}>Fully Verified</span>
                          ) : (
                            <span className="status-pill in-progress">In Progress</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {tests.length === 0 && (
                    <tr><td colSpan="6" className="text-center text-muted">No validation data available for DVP&R matrix.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'failures' && (
            <div className="failures-view">
              <h3>Triggered ECOs</h3>
              <p className="text-muted" style={{ marginBottom: '16px' }}>A list of all Engineering Change Orders automatically triggered by validation failures.</p>
              
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ECO Title</th>
                    <th>Description</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ecos.length === 0 ? (
                    <tr><td colSpan="4" className="text-center text-muted">No ECOs triggered yet.</td></tr>
                  ) : ecos.map(eco => (
                    <tr key={eco.id}>
                      <td style={{color: 'var(--accent)'}}><strong>{eco.title}</strong></td>
                      <td style={{maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{eco.description}</td>
                      <td><span className="status-pill rejected">{eco.priority}</span></td>
                      <td><span className="status-pill scheduled">{eco.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValidationDashboard;
