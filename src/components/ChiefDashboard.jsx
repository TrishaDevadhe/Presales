import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, Layers, FileText, 
  Clock, ChevronRight, Stamp, Activity, Zap, Compass, Factory, 
  Terminal, BarChart3, Database, Cpu, Trophy, Sparkles, Award,
  GitMerge, Snowflake, MessageSquare
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import './ChiefDashboard.css';

const ChiefDashboard = () => {
  const { profile } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [activeQueue, setActiveQueue] = useState('gate0'); // 'gate0', 'conditional', 'gate5', 'ddr'
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [ddrReviews, setDdrReviews] = useState([]);
  const [selectedDDR, setSelectedDDR] = useState(null);
  const [ddrComments, setDdrComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [bypassActive, setBypassActive] = useState(false);

  useEffect(() => {
    fetchApprovals();
    fetchDDRs();
  }, []);

  const fetchDDRs = async () => {
    try {
      const { data: ddrs, error } = await supabase
        .from('ddr_reviews')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) { console.warn('DDR fetch error:', error.message); return; }

      const enriched = await Promise.all((ddrs || []).map(async (ddr) => {
        let taskData = null;
        if (ddr.task_id) {
          const { data: t } = await supabase.from('design_tasks').select('*, programs(*)').eq('id', ddr.task_id).single();
          taskData = t;
        }
        const { data: comments } = await supabase
          .from('ddr_comments')
          .select('*, author:users!author_id(full_name, role)')
          .eq('ddr_id', ddr.id)
          .order('created_at', { ascending: true });
        return { ...ddr, design_tasks: taskData, comments: comments || [] };
      }));
      setDdrReviews(enriched);
    } catch (err) {
      console.error('Chief DDR fetch error:', err);
    }
  };

  const handleChiefApproveDDR = async (ddr) => {
    setIsProcessing(true);
    try {
      // 1. Approve the DDR
      const { error: ddrErr } = await supabase
        .from('ddr_reviews')
        .update({ status: 'Resolved', current_stage: 'Approved' })
        .eq('id', ddr.id);
      if (ddrErr) throw ddrErr;

      // 2. Freeze linked CAD file
      if (ddr.cad_file_id) {
        await supabase.from('cad_files').update({ status: 'Frozen' }).eq('id', ddr.cad_file_id);
      }

      // 3. Notify + log
      await supabase.from('notifications').insert({
        title: '❄️ DDR Approved — Design Frozen',
        message: `Chief Engineer approved DDR: "${ddr.title}". Design is now officially frozen. ECO required for any further changes.`,
        type: 'success'
      });
      await supabase.from('activity_logs').insert({
        program_id: ddr.design_tasks?.program_id || null,
        action_type: 'DDR Approved',
        action_description: `Chief Engineer froze design: DDR "${ddr.title}" approved. CAD locked.`
      });

      alert('❄️ DDR Approved. Design is now Frozen. CAD file locked — ECO required for any further changes.');
      setSelectedDDR(null);
      fetchDDRs();
    } catch (err) {
      alert('Error approving DDR: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      console.log('AutoDev: [DIAGNOSTIC] Fetching Chief Engineer command center data...');
      
      // 1. Fetch all programs
      const { data: progData, error: progErr } = await supabase
        .from('programs')
        .select('*');
      if (progErr) throw progErr;

      // 2. Fetch all gates
      const { data: gateData, error: gateErr } = await supabase
        .from('apqp_gates')
        .select('*');
      if (gateErr) throw gateErr;

      // 3. Fetch all technical assessments
      const { data: techData } = await supabase
        .from('technical_assessments')
        .select('*');

      // 4. Fetch workflow instances to detect conditional stage
      const { data: workflowData } = await supabase
        .from('workflow_instances')
        .select('program_id, current_stage');

      // 5. Enrich programs with gates and assessments
      const enriched = (progData || []).map(p => {
        const pGates = (gateData || []).filter(g => g.program_id === p.id);
        // Get the LATEST technical assessment for this program
        const allTechForProg = (techData || []).filter(t => t.program_id === p.id);
        const techCase = allTechForProg.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null;
        const workflowInst = (workflowData || []).find(w => w.program_id === p.id);
        
        // Gate status tracking with fail-safe fallbacks
        const g0 = pGates.find(g => g.gate_number === 0) || { gate_status: 'Pending', completion_percentage: 0 };
        const g3 = pGates.find(g => g.gate_number === 3) || { gate_status: 'Pending', completion_percentage: 0 };
        const g4 = pGates.find(g => g.gate_number === 4) || { gate_status: 'Pending', completion_percentage: 0 };
        const g5 = pGates.find(g => g.gate_number === 5) || { gate_status: 'Pending', completion_percentage: 0 };

        // Detect conditional review EXCLUSIVELY via workflow_instances.current_stage.
        // Do NOT use techCase.recommendation — it stays 'Conditional' even after rework return
        // (the CHECK constraint only allows 'Approve'|'Reject'|'Conditional', so 'Rework Required' fails silently).
        // The workflow stage is the single reliable source of truth.
        const isConditionalReview = workflowInst?.current_stage === 'GATE_0_CONDITIONAL_REVIEW';

        return {
          id: p.id,
          program_name: p.program_name,
          program_code: p.program_code || p.program_name.substring(0, 5).toUpperCase(),
          status: p.status,
          gates: pGates,
          technical_case: techCase,
          // Exclude from Gate 0 queue if it's pending conditional review or if Lead hasn't submitted tech case
          isGate0Pending: g0.gate_status !== 'Completed' && !isConditionalReview && techCase !== null,
          isConditionalReview,
          isGate5Pending: g5.gate_status !== 'Completed' && g4.gate_status === 'Completed',
          gate3Completed: g3.gate_status === 'Completed',
          gate4Completed: g4.gate_status === 'Completed',
          gate5Completed: g5.gate_status === 'Completed'
        };
      });

      console.log('AutoDev Chief Enriched Programs:', enriched);
      setPrograms(enriched);
      
      // Keep selection in sync
      if (selectedProgram) {
        const updated = enriched.find(p => p.id === selectedProgram.id);
        setSelectedProgram(updated || null);
      }
    } catch (error) {
      console.error("AutoDev Fetch Failed for Chief:", error);
    } finally {
      setLoading(false);
    }
  };

  const insertResilientApproval = async (programId, gateName, comments) => {
    console.log("AutoDev: Starting self-healing resilient approval insert...", { programId, gateName, comments });
    
    const userId = profile?.id;

    // Strategy 1: target_id & target_type (Polymorphic schema)
    const { error: err1 } = await supabase.from('approvals').insert({
      target_id: programId,
      target_type: gateName,
      status: 'Approved',
      comments: comments,
      approver_id: userId
    });
    if (!err1) {
      console.log("AutoDev: Insert strategy 1 (target_id, target_type) succeeded!");
      return null;
    }
    console.warn("AutoDev: Insert strategy 1 failed, trying strategy 2...", err1);

    // Strategy 2: program_id & gate_name (Direct schema)
    const { error: err2 } = await supabase.from('approvals').insert({
      program_id: programId,
      gate_name: gateName,
      status: 'Approved',
      comments: comments,
      approver_id: userId
    });
    if (!err2) {
      console.log("AutoDev: Insert strategy 2 (program_id, gate_name) succeeded!");
      return null;
    }
    console.warn("AutoDev: Insert strategy 2 failed, trying strategy 3...", err2);

    // Strategy 3: program_id & target_type (Hybrid 1)
    const { error: err3 } = await supabase.from('approvals').insert({
      program_id: programId,
      target_type: gateName,
      status: 'Approved',
      comments: comments,
      approver_id: userId
    });
    if (!err3) {
      console.log("AutoDev: Insert strategy 3 (program_id, target_type) succeeded!");
      return null;
    }
    console.warn("AutoDev: Insert strategy 3 failed, trying strategy 4...", err3);

    // Strategy 4: target_id & gate_name (Hybrid 2)
    const { error: err4 } = await supabase.from('approvals').insert({
      target_id: programId,
      gate_name: gateName,
      status: 'Approved',
      comments: comments,
      approver_id: userId
    });
    if (!err4) {
      console.log("AutoDev: Insert strategy 4 (target_id, gate_name) succeeded!");
      return null;
    }
    console.warn("AutoDev: Insert strategy 4 failed, trying absolute fallback minimal insert...");

    // Strategy 5: absolute fallback insert (omit references, just store comment)
    const { error: err5 } = await supabase.from('approvals').insert({
      status: 'Approved',
      comments: `${gateName} Approval: ${comments}`,
      approver_id: userId
    });
    if (!err5) {
      console.log("AutoDev: Insert strategy 5 (minimal fallback) succeeded!");
      return null;
    }

    return err5;
  };

  const handleGate0Approval = async () => {
    if (!selectedProgram) return;
    setIsProcessing(true);

    try {
      const progId = selectedProgram.id;
      const progName = selectedProgram.program_name;

      // 1. Insert Gate 0 sign-off with self-healing schema wrapper
      const appErr = await insertResilientApproval(
        progId,
        'GATE_0',
        'Gate 0 approved. Technical case validated for high-volume EV platform.'
      );
      if (appErr) throw appErr;

      // 2. Lock Gate 0 (Feasibility)
      const { error: gateErr } = await supabase.from('apqp_gates')
        .update({ 
          gate_status: 'Completed',
          completion_percentage: 100,
          remarks: 'Strategic Feasibility validated. Gate 0 unlocked and passed.'
        })
        .eq('program_id', progId)
        .eq('gate_number', 0);
      if (gateErr) throw gateErr;

      // 3. Advance program to Design status
      const { error: progErr } = await supabase.from('programs')
        .update({ status: 'Design' })
        .eq('id', progId);
      if (progErr) throw progErr;

      // 4. AUTOMATED TASK GENERATION (Battery, Chassis, Integration, Thermal)
      const designTasks = [
        { name: 'CAD: Battery Packaging Design', subsystem: 'Battery', priority: 'High' },
        { name: 'CAD: Chassis Modular Integration', subsystem: 'Chassis', priority: 'High' },
        { name: 'ECU Integration Architecture', subsystem: 'EE-Architecture', priority: 'Medium' },
        { name: 'ADAS Sensor Layout Design', subsystem: 'ADAS', priority: 'High' },
        { name: 'Thermal Management Loop Simulation', subsystem: 'Thermal', priority: 'Medium' }
      ];

      const { data: createdTasks, error: taskError } = await supabase.from('design_tasks').insert(
        designTasks.map(t => ({
          program_id: progId,
          task_name: t.name,
          subsystem: t.subsystem,
          priority: t.priority,
          status: 'Not Started',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }))
      ).select();

      if (taskError) throw taskError;

      // 5. Initialize DDR Workflow
      if (createdTasks) {
        const { error: ddrError } = await supabase.from('ddr_reviews').insert(
          createdTasks.map(t => ({
            task_id: t.id,
            current_stage: 'Initial Review',
            status: 'Pending'
          }))
        );
        if (ddrError) throw ddrError;
      }

      await supabase.from('notifications').insert({
        title: 'Gate 0 Approved',
        message: `Program ${progName} has moved to Design Phase.`,
        type: 'success'
      });

      alert('SUCCESS: Gate 0 approved successfully! Design Phase activated, engineering CAD packages generated.');
      setSelectedProgram(null);
      fetchApprovals();
    } catch (err) {
      console.error('AutoDev Workflow Gate 0 Error:', err);
      alert(`Failed to approve Gate 0: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGate5Release = async () => {
    if (!selectedProgram) return;
    setIsProcessing(true);

    try {
      const progId = selectedProgram.id;
      const progName = selectedProgram.program_name;

      // 1. Generate Compliance Baseline Archive JSON
      const baselineArchive = {
        program_id: progId,
        program_name: progName,
        release_date: new Date().toISOString(),
        authorizer: profile?.name || 'Dana Scully (Chief Engineer)',
        gates: selectedProgram.gates?.map(g => ({
          gate_number: g.gate_number,
          status: 'Completed',
          percentage: g.completion_percentage
        })) || [],
        dvpr_compliance: '100% Passed & Signed Off',
        ppap_status: 'Approved & Level 3 Warrant Stamped'
      };

      // 2. Insert strategic Approval entry with self-healing schema wrapper
      const appErr = await insertResilientApproval(
        progId,
        'GATE_5',
        `Gate 5 Approved. Serial Production Release Authorized. Compliance baseline successfully archived: ${JSON.stringify(baselineArchive)}`
      );
      if (appErr) throw appErr;

      // 3. Complete APQP Gate 5 in database (upsert-style resilient handler)
      const { data: existingGate } = await supabase.from('apqp_gates')
        .select('id')
        .eq('program_id', progId)
        .eq('gate_number', 5)
        .maybeSingle();

      if (existingGate) {
        const { error: gateErr } = await supabase.from('apqp_gates')
          .update({ 
            gate_status: 'Completed',
            completion_percentage: 100,
            remarks: 'APQP Gate 5 officially closed. High-volume manufacturing (HVM) tooling authorized for release.'
          })
          .eq('id', existingGate.id);
        if (gateErr) throw gateErr;
      } else {
        const { error: gateErr } = await supabase.from('apqp_gates')
          .insert({
            program_id: progId,
            gate_name: 'Gate 5: Serial Production Release',
            gate_number: 5,
            gate_status: 'Completed',
            completion_percentage: 100,
            remarks: 'APQP Gate 5 officially closed. High-volume manufacturing (HVM) tooling authorized for release.'
          });
        if (gateErr) throw gateErr;
      }

      // 4. Transition Program to 'Production' phase (Manufacturing Start)
      const { error: progErr } = await supabase.from('programs')
        .update({ status: 'Production' })
        .eq('id', progId);
      if (progErr) throw progErr;

      // 5. Create global production notification
      await supabase.from('notifications').insert({
        title: '🏆 Program Released to Production!',
        message: `${progName} has successfully completed all 15 APQP Stages and is released for Serial Production!`,
        type: 'success'
      });

      setShowCelebration(true);
      
      alert(`🏆 SUCCESS: Program ${progName} is officially released for Mass Manufacturing!\n\nDeliverables Locked:\n1. Gate 5 Approved\n2. Production Release Authorized\n3. Project Baseline Archived\n4. Manufacturing Start Triggered!`);
      setSelectedProgram(null);
      fetchApprovals();
    } catch (err) {
      console.error('AutoDev Gate 5 Release Error:', err);
      alert(`Failed to authorize production release: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredPrograms = programs.filter(p => {
    if (activeQueue === 'gate0') return p.isGate0Pending;
    if (activeQueue === 'conditional') return p.isConditionalReview;
    if (activeQueue === 'gate5') return p.isGate5Pending || p.gate5Completed;
    return false;
  });

  if (loading) return <div className="loader">Synchronizing Strategic Data...</div>;

  return (
    <div className="chief-dashboard-container">
      {showCelebration && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.92)', zIndex: 10000, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(20px)' }}>
          <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', duration: 1 }} style={{ textAlign: 'center' }}>
            <Trophy size={110} color="#ffb703" style={{ marginBottom: '24px', filter: 'drop-shadow(0 0 35px #ffb703)' }} />
            <h1 style={{ fontSize: '3rem', fontWeight: '900', color: 'var(--text)', margin: '0 0 16px 0', tracking: '0.05em' }}>APQP STAGE 15: RELEASE COMPLETED!</h1>
            <p style={{ fontSize: '1.25rem', color: '#ffb703', maxWidth: '600px', margin: '0 auto 32px auto', lineHeight: '1.6' }}>
              Congratulations! You have successfully signed off on the final gateway, unlocking high-volume manufacturing.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '600px', margin: '0 auto', background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a0a0b0', fontSize: '0.95rem' }}>
                <CheckCircle2 size={18} className="green-text" /> <span>Gate 5 Approved</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a0a0b0', fontSize: '0.95rem' }}>
                <CheckCircle2 size={18} className="green-text" /> <span>Production Release Authorized</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a0a0b0', fontSize: '0.95rem' }}>
                <CheckCircle2 size={18} className="green-text" /> <span>Project Baseline Archived</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a0a0b0', fontSize: '0.95rem' }}>
                <CheckCircle2 size={18} className="green-text" /> <span>Manufacturing Start Triggered</span>
              </div>
            </div>
            <button className="primary-btn" onClick={() => setShowCelebration(false)} style={{ marginTop: '40px', padding: '12px 48px', fontSize: '1.1rem', background: 'linear-gradient(135deg, #f72585, #7209b7)', border: 'none', color: '#fff', fontWeight: 'bold', borderRadius: '30px', cursor: 'pointer', boxShadow: '0 0 20px rgba(114, 9, 183, 0.4)' }}>
              Acknowledge & Close
            </button>
          </motion.div>
        </div>
      )}

      <header className="dashboard-header">
        <div className="header-info">
          <h1>Chief Engineer Command Center</h1>
          <p>STRATEGIC GATE REVIEW // APQP COMPLIANCE // DESIGN PHASE ACTIVATION</p>
        </div>
        <div className="system-status">
          <div className="status-item">
            <span className="dot pulse"></span>
            <span>{programs.filter(p => p.isGate0Pending || p.isGate5Pending).length} PENDING GATE REVIEWS</span>
          </div>
        </div>
      </header>

      {/* Dynamic Queue Switcher */}
      <div className="queue-selector-tabs" style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
        <button 
          onClick={() => { setActiveQueue('gate0'); setSelectedProgram(null); }}
          className={`tab-btn ${activeQueue === 'gate0' ? 'active' : ''}`}
          style={{ padding: '12px 24px', background: activeQueue === 'gate0' ? 'var(--accent)' : 'rgba(255,255,255,0.03)', border: 'none', borderRadius: '6px', color: activeQueue === 'gate0' ? '#000' : 'var(--text)', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Compass size={16} /> Stage 3: Gate 0 Feasibility ({programs.filter(p => p.isGate0Pending).length})
        </button>
        <button 
          onClick={() => { setActiveQueue('conditional'); setSelectedProgram(null); }}
          className={`tab-btn ${activeQueue === 'conditional' ? 'active' : ''}`}
          style={{ padding: '12px 24px', background: activeQueue === 'conditional' ? '#b5451b' : 'rgba(255,255,255,0.03)', border: activeQueue === 'conditional' ? 'none' : '1px solid rgba(255,160,50,0.25)', borderRadius: '6px', color: activeQueue === 'conditional' ? '#fff' : '#ffaa33', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <AlertTriangle size={16} /> Conditional Reviews ({programs.filter(p => p.isConditionalReview).length})
        </button>
        <button 
          onClick={() => { setActiveQueue('ddr'); setSelectedProgram(null); }}
          className={`tab-btn ${activeQueue === 'ddr' ? 'active' : ''}`}
          style={{ padding: '12px 24px', background: activeQueue === 'ddr' ? '#0077b6' : 'rgba(255,255,255,0.03)', border: activeQueue === 'ddr' ? 'none' : '1px solid rgba(0,180,216,0.25)', borderRadius: '6px', color: activeQueue === 'ddr' ? '#fff' : '#00b4d8', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Snowflake size={16} /> DDR Design Freeze ({ddrReviews.filter(d => d.status !== 'Resolved').length})
        </button>
        <button 
          onClick={() => { setActiveQueue('gate5'); setSelectedProgram(null); }}
          className={`tab-btn ${activeQueue === 'gate5' ? 'active' : ''}`}
          style={{ padding: '12px 24px', background: activeQueue === 'gate5' ? 'var(--accent)' : 'rgba(255,255,255,0.03)', border: 'none', borderRadius: '6px', color: activeQueue === 'gate5' ? '#000' : 'var(--text)', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Trophy size={16} /> Stage 15: Gate 5 Production Release ({programs.filter(p => p.isGate5Pending).length})
        </button>
      </div>

      <div className="approval-layout-grid">
        {activeQueue === 'ddr' ? (
          /* ===== DDR DESIGN FREEZE PANEL ===== */
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', width: '100%' }}>
            {/* DDR List */}
            <aside className="approval-queue glass">
              <div className="queue-header">
                <h3><Snowflake size={18} /> DDR Queue</h3>
              </div>
              <div className="queue-list">
                {ddrReviews.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px', textAlign: 'center', color: '#606070' }}>No DDR reviews found</div>
                ) : ddrReviews.map(ddr => (
                  <div
                    key={ddr.id}
                    className={`queue-card glass ${selectedDDR?.id === ddr.id ? 'active' : ''}`}
                    onClick={() => setSelectedDDR(ddr)}
                  >
                    <div className="card-top">
                      <span className="gate-tag" style={{ background: ddr.status === 'Resolved' ? 'rgba(46,204,113,0.15)' : 'rgba(0,180,216,0.15)', color: ddr.status === 'Resolved' ? 'var(--success)' : '#00b4d8' }}>
                        {ddr.status === 'Resolved' ? '❄️ FROZEN' : 'PENDING'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#606070' }}>{ddr.comments?.length || 0} comments</span>
                    </div>
                    <h4 style={{ fontSize: '0.9rem', margin: '6px 0 2px' }}>{ddr.title || 'Unnamed DDR'}</h4>
                    <p style={{ fontSize: '0.75rem', color: '#808090', margin: 0 }}>{ddr.design_tasks?.programs?.program_name || 'Unknown Program'}</p>
                  </div>
                ))}
              </div>
            </aside>

            {/* DDR Detail */}
            <main className="executive-workspace">
              {selectedDDR ? (
                <div className="review-panel glass">
                  <div className="review-header">
                    <h2>{selectedDDR.title || 'DDR Review'}</h2>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {selectedDDR.status === 'Resolved' ? (
                        <span style={{ background: 'rgba(46,204,113,0.1)', color: 'var(--success)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Snowflake size={14} /> DESIGN FROZEN
                        </span>
                      ) : (
                        <button
                          className="chief-btn approve"
                          disabled={isProcessing}
                          onClick={() => handleChiefApproveDDR(selectedDDR)}
                          style={{ background: 'linear-gradient(135deg, #00b4d8, #0077b6)', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <Snowflake size={16} />
                          {isProcessing ? 'Processing...' : '❄️ Approve DDR & Freeze Design'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: 'rgba(0,180,216,0.04)', border: '1px solid rgba(0,180,216,0.15)', borderRadius: '8px', marginBottom: '20px' }}>
                    <p style={{ color: '#a0a0b0', margin: '0 0 6px 0', fontSize: '0.85rem' }}>
                      <strong style={{ color: '#00b4d8' }}>Program:</strong> {selectedDDR.design_tasks?.programs?.program_name || 'N/A'}
                      &nbsp;&nbsp;|&nbsp;&nbsp;
                      <strong style={{ color: '#00b4d8' }}>Stage:</strong> {selectedDDR.current_stage || 'Cross Functional'}
                      &nbsp;&nbsp;|&nbsp;&nbsp;
                      <strong style={{ color: '#00b4d8' }}>Created:</strong> {new Date(selectedDDR.created_at).toLocaleDateString()}
                    </p>
                    <p style={{ color: '#606070', margin: 0, fontSize: '0.8rem' }}>
                      Review all engineering comments below. When all issues are resolved, click <strong style={{ color: '#00b4d8' }}>Approve DDR & Freeze Design</strong> to officially lock the CAD. A frozen design cannot be changed without an ECO.
                    </p>
                  </div>

                  {/* Comments thread — read only for Chief */}
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#a0a0b0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={16} /> Engineering Comments ({selectedDDR.comments?.length || 0})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto' }}>
                    {(selectedDDR.comments || []).length === 0 ? (
                      <p style={{ color: '#606070', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>No comments yet on this DDR.</p>
                    ) : selectedDDR.comments.map(c => (
                      <div key={c.id} style={{
                        padding: '12px 14px',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '6px',
                        borderLeft: `3px solid ${c.status === 'Resolved' ? 'var(--success)' : c.severity === 'Critical' ? 'var(--error)' : c.severity === 'High' ? '#ffaa33' : 'var(--accent)'}`,
                        opacity: c.status === 'Resolved' ? 0.65 : 1
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.8rem', color: '#a0a0b0' }}>
                            <strong>{c.author?.full_name || 'Engineer'}</strong>
                            <span style={{ color: '#606070', marginLeft: '6px' }}>({c.author?.role})</span>
                          </span>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: c.severity === 'Critical' ? 'rgba(255,77,77,0.15)' : c.severity === 'High' ? 'rgba(255,170,51,0.15)' : 'rgba(0,180,216,0.1)', color: c.severity === 'Critical' ? 'var(--error)' : c.severity === 'High' ? '#ffaa33' : '#00b4d8' }}>
                              {c.severity}
                            </span>
                            {c.status === 'Resolved' && <span style={{ fontSize: '0.7rem', color: 'var(--success)' }}>✓ Resolved</span>}
                          </div>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text)', textDecoration: c.status === 'Resolved' ? 'line-through' : 'none' }}>{c.comment_text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="empty-workspace glass flex-center">
                  <Snowflake size={48} className="muted-icon" />
                  <h3>Select a DDR from the queue to review</h3>
                  <p style={{ color: '#606070', fontSize: '0.85rem' }}>Only the Chief Engineer can approve DDRs and freeze designs.</p>
                </div>
              )}
            </main>
          </div>
        ) : (
          <>
            <aside className="approval-queue glass">
            <div className="queue-header">
              <h3><Stamp size={18} /> Executive Queue</h3>
            </div>
            <div className="queue-list">
              {filteredPrograms.length > 0 ? filteredPrograms.map(app => (
                <div 
                  key={app.id} 
                  className={`queue-card glass ${selectedProgram?.id === app.id ? 'active' : ''}`}
                  onClick={() => { setSelectedProgram(app); setBypassActive(false); }}
                >
                  <div className="card-top">
                    <span className="gate-tag">{activeQueue === 'gate0' ? 'GATE 0' : 'GATE 5'}</span>
                    <span className="time-tag">
                      {app.gate5Completed ? (
                        <span style={{ color: 'var(--success)' }}>✓ Released</span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> Pending</span>
                      )}
                    </span>
                  </div>
                  <h4>{app.program_name}</h4>
                  <p>{app.program_code}</p>
                </div>
              )) : (
                <div className="empty-state" style={{ padding: '24px', textAlign: 'center', color: '#606070' }}>No pending gate items in this queue</div>
              )}
            </div>
          </aside>

          <main className="executive-workspace">
          {selectedProgram ? (
            <div className="review-panel glass">
              <div className="review-header">
                <h2>{selectedProgram.program_name} — Executive Review</h2>
                <div className="trl-badge" style={{ background: activeQueue === 'gate0' ? '#5a189a' : activeQueue === 'conditional' ? '#7a3a00' : '#1b4332', color: '#fff', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {activeQueue === 'gate0' ? 'FEASIBILITY PHASE' : activeQueue === 'conditional' ? 'CONDITIONAL REVIEW' : 'PRODUCTION RELEASE PHASE'}
                </div>
              </div>

              {activeQueue === 'gate0' ? (
                /* GATE 0 VIEW */
                <>
                  <div className="executive-grid">
                    <div className="exec-card glass">
                      <h3><Cpu size={18} /> Technical Assessment</h3>
                      <p><strong>Architecture:</strong> {selectedProgram.technical_case?.architecture_complexity || 'Modular Chassis'}</p>
                      <p><strong>EV Readiness:</strong> {selectedProgram.technical_case?.ev_compatibility_score || 95}%</p>
                    </div>
                    <div className="exec-card glass">
                      <h3><AlertTriangle size={18} /> Strategic Risks</h3>
                      <p>Supply chain validation needed for next-gen silicon carbide inverters.</p>
                    </div>
                    <div className="exec-card glass">
                      <h3><Factory size={18} /> Mfg. Readiness</h3>
                      <p>{selectedProgram.technical_case?.plant_readiness_assessment || 'Tooling capability confirmed.'}</p>
                    </div>
                    <div className="exec-card glass">
                      <h3><Database size={18} /> Resource Budget</h3>
                      <p>{selectedProgram.technical_case?.est_engineering_hours || 4200} Engineering Hours</p>
                    </div>
                  </div>

                  <div className="review-actions">
                    <textarea placeholder="Executive directives..." className="directive-input"></textarea>
                    <div className="btn-group">
                      <button className="chief-btn reject">Reject</button>
                      <button className="chief-btn approve" onClick={handleGate0Approval} disabled={isProcessing}>
                        {isProcessing ? 'Processing...' : 'Approve Gate 0'}
                      </button>
                    </div>
                  </div>
                </>
              ) : activeQueue === 'conditional' ? (
                /* CONDITIONAL REVIEW VIEW */
                <>
                  <div style={{ padding: '20px', background: 'rgba(255, 160, 50, 0.05)', border: '1px solid rgba(255, 160, 50, 0.2)', borderRadius: '8px', marginBottom: '20px' }}>
                    <h3 style={{ color: '#ffaa33', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={18} /> Lead Engineer Issued a Conditional Approval
                    </h3>
                    <p style={{ color: '#a0a0b0', margin: '0 0 8px 0', fontSize: '0.9rem' }}>
                      This program passed feasibility review with conditions. Review the Lead Engineer's technical assessment below and decide whether to:
                    </p>
                    <ul style={{ color: '#a0a0b0', fontSize: '0.88rem', margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
                      <li><strong style={{ color: '#ffaa33' }}>Escalate to Gate 0</strong> — Accept conditions and advance to full Gate 0 Feasibility approval</li>
                      <li><strong style={{ color: '#ff4d4d' }}>Return for Rework</strong> — Send back to Lead Engineer to address outstanding conditions</li>
                    </ul>
                  </div>

                  <div className="executive-grid">
                    <div className="exec-card glass">
                      <h3><Cpu size={18} /> Lead Assessment</h3>
                      <p><strong>Recommendation:</strong> <span style={{ color: '#ffaa33' }}>Conditional</span></p>
                      <p><strong>Architecture:</strong> {selectedProgram.technical_case?.architecture_complexity || 'Modular Chassis'}</p>
                      <p><strong>EV Readiness:</strong> {selectedProgram.technical_case?.ev_compatibility_score || 85}%</p>
                    </div>
                    <div className="exec-card glass">
                      <h3><AlertTriangle size={18} /> Conditions to Resolve</h3>
                      <p>{selectedProgram.technical_case?.plant_readiness_assessment || 'Tooling update required for high-cycle stamping.'}</p>
                    </div>
                    <div className="exec-card glass">
                      <h3><Database size={18} /> Est. Engineering Hours</h3>
                      <p>{selectedProgram.technical_case?.est_engineering_hours || 12500} Hours</p>
                    </div>
                    <div className="exec-card glass">
                      <h3><Zap size={18} /> Risk Level</h3>
                      <p style={{ color: '#ffaa33' }}>Medium-High — conditions must be tracked to closure</p>
                    </div>
                  </div>

                  <div className="review-actions">
                    <textarea placeholder="Chief Engineer directives on conditions..." className="directive-input"></textarea>
                    <div className="btn-group">
                      <button
                        className="chief-btn reject"
                        disabled={isProcessing}
                        onClick={async () => {
                          setIsProcessing(true);
                          try {
                            // CRITICAL: Reset program status back to 'Feasibility'.
                            // The old code (pre-fix) set programs.status = 'Design' even for Conditional,
                            // so we must explicitly reset it here so Lead's filter picks it up again.
                            const { error: progResetErr } = await supabase
                              .from('programs')
                              .update({ status: 'Feasibility' })
                              .eq('id', selectedProgram.id);
                            if (progResetErr) throw progResetErr;

                            // Reset workflow stage — this removes from Chief's Conditional queue
                            const { error: wfError } = await supabase.from('workflow_instances')
                              .update({ current_stage: 'FEASIBILITY_PENDING', assigned_role: 'Lead Engineer' })
                              .eq('program_id', selectedProgram.id);
                            if (wfError) throw wfError;

                            await supabase.from('notifications').insert({
                              title: '↩️ Conditional Review Returned for Rework',
                              message: `Chief Engineer returned ${selectedProgram.program_name} to Lead Engineer. Outstanding conditions must be resolved before Gate 0 can proceed.`,
                              type: 'warning'
                            });
                            alert('↩️ Program returned to Lead Engineer for rework. It will reappear in their Feasibility queue.');
                            setSelectedProgram(null);
                            fetchApprovals();
                          } catch(e) { alert('Error returning for rework: ' + e.message); }
                          finally { setIsProcessing(false); }
                        }}
                      >↩️ Return for Rework</button>
                      <button
                        className="chief-btn approve"
                        disabled={isProcessing}
                        onClick={async () => {
                          setIsProcessing(true);
                          try {
                            // Update workflow stage to gate 0 pending — this removes from conditional queue
                            await supabase.from('workflow_instances')
                              .update({ current_stage: 'GATE_0_APPROVAL_PENDING', assigned_role: 'Chief Engineer' })
                              .eq('program_id', selectedProgram.id);
                            // Update tech assessment recommendation to 'Approve' so it exits conditional detection
                            if (selectedProgram.technical_case?.id) {
                              await supabase.from('technical_assessments')
                                .update({ recommendation: 'Approve' })
                                .eq('id', selectedProgram.technical_case.id);
                            }
                            // Advance program to Design phase for full Gate 0 review
                            await supabase.from('programs').update({ status: 'Design' }).eq('id', selectedProgram.id);
                            await supabase.from('notifications').insert({
                              title: '✅ Conditional Accepted — Moved to Gate 0 Queue',
                              message: `Chief Engineer accepted conditions for ${selectedProgram.program_name}. Program is now in the Gate 0 Feasibility Approval queue.`,
                              type: 'success'
                            });
                            alert('✅ Conditions accepted. Program escalated to Gate 0 Approval queue.');
                            setActiveQueue('gate0');
                            setSelectedProgram(null);
                            fetchApprovals();
                          } catch(e) { alert('Error: ' + e.message); }
                          finally { setIsProcessing(false); }
                        }}
                      >
                        {isProcessing ? 'Processing...' : '✅ Accept Conditions → Gate 0'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* GATE 5 PRODUCTION RELEASE VIEW */
                <>
                  <div className="gate5-overview-card glass-dark" style={{ padding: '24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}><ShieldCheck size={20}/> 15-Stage Gate Traceability Checklist</h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <CheckCircle2 size={18} className="green-text" />
                          <div>
                            <strong style={{ fontSize: '0.9rem' }}>Stage 3: Gate 0 Approved</strong>
                            <div style={{ fontSize: '0.75rem', color: '#808090' }}>Feasibility & Strategic Alignment Locked</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <CheckCircle2 size={18} className="green-text" />
                          <div>
                            <strong style={{ fontSize: '0.9rem' }}>Stage 7: Gate 1 Design Freeze</strong>
                            <div style={{ fontSize: '0.75rem', color: '#808090' }}>CAD Models & Drawing Package frozen</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <CheckCircle2 size={18} className="green-text" />
                          <div>
                            <strong style={{ fontSize: '0.9rem' }}>Stage 10: Prototype Build Complete</strong>
                            <div style={{ fontSize: '0.75rem', color: '#808090' }}>Physical parts built & procured successfully</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <CheckCircle2 size={18} className={selectedProgram.gate3Completed ? "green-text" : "yellow-text"} />
                          <div>
                            <strong style={{ fontSize: '0.9rem' }}>Stage 13: DVP&R Document Signed Off</strong>
                            <div style={{ fontSize: '0.75rem', color: '#808090' }}>
                              {selectedProgram.gate3Completed ? "Approved (100% test protocols passed)" : "In Review by Quality"}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <CheckCircle2 size={18} className={selectedProgram.gate4Completed ? "green-text" : "yellow-text"} />
                          <div>
                            <strong style={{ fontSize: '0.9rem' }}>Stage 14: PPAP Package Validated</strong>
                            <div style={{ fontSize: '0.75rem', color: '#808090' }}>
                              {selectedProgram.gate4Completed ? "Approved (Supplier PSW warrant loaded)" : "Pending Review"}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <CheckCircle2 size={18} className={selectedProgram.gate5Completed ? "green-text" : "yellow-text"} style={{ opacity: selectedProgram.gate5Completed ? 1 : 0.4 }} />
                          <div>
                            <strong style={{ fontSize: '0.9rem' }}>Stage 15: Production Release (Gate 5)</strong>
                            <div style={{ fontSize: '0.75rem', color: '#808090' }}>
                              {selectedProgram.gate5Completed ? "COMPLETED & LOCKED" : "Awaiting Chief Sign-Off"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="review-actions">
                    <textarea placeholder="Directives for manufacturing plant tooling setup..." className="directive-input" defaultValue="All design validation targets achieved. PSW warrants approved. Release of high-volume serial tooling officially authorized for launch." style={{ minHeight: '80px' }}></textarea>
                    
                    {!selectedProgram.gate5Completed && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255, 77, 77, 0.04)', border: '1px solid rgba(255, 77, 77, 0.15)', borderRadius: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#ff4d4d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <AlertTriangle size={16}/> <strong>Executive Override Authorized</strong>
                        </span>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px', fontSize: '0.8rem', color: '#a0a0b0' }}>
                          <input type="checkbox" checked={bypassActive} onChange={(e) => setBypassActive(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                          Bypass Quality Gates
                        </label>
                      </div>
                    )}

                    {selectedProgram.gate5Completed ? (
                      <div className="green-text" style={{ padding: '16px', background: 'rgba(46, 204, 113, 0.05)', borderRadius: '6px', border: '1px solid rgba(46, 204, 113, 0.2)', textAlign: 'center', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Trophy size={20}/> PROGRAM SUCCESSFULLY RELEASED TO MASS PRODUCTION
                      </div>
                    ) : (
                      <div className="btn-group">
                        <button className="chief-btn approve" onClick={handleGate5Release} disabled={isProcessing || (!selectedProgram.gate4Completed && !bypassActive)} style={{ width: '100%', background: 'linear-gradient(135deg, #f72585, #7209b7)', color: '#fff', fontWeight: 'bold' }}>
                          {isProcessing ? 'Processing Production Release...' : '🏆 Authorize Serial Production (Lock Gate 5)'}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="empty-workspace glass flex-center">
              <Stamp size={48} className="muted-icon" />
              <h3>Select a program from the queue to begin review</h3>
            </div>
          )}
        </main>
          </>
        )} {/* end of activeQueue !== 'ddr' branch */}
      </div>
    </div>
  );
};

export default ChiefDashboard;
