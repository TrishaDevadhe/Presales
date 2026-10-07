import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Box, Upload, Layers, FileCode, MessageSquare, RefreshCcw, 
  CheckCircle, Clock, History, FileText, Search, Filter, 
  Plus, Settings, Cpu, Database, Activity, ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import './DesignDashboard.css';

const DesignDashboard = () => {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks'); // tasks, cad, bom, ddr
  const [isUploading, setIsUploading] = useState(false);
  const [revisions, setRevisions] = useState([]);
  const [linkedParts, setLinkedParts] = useState([]);
  const [ebomReviews, setEbomReviews] = useState([]); // Stage 3 sign-off rows

  useEffect(() => {
    fetchDesignTasks();
    fetchEbomReviews();
  }, []);

  const fetchEbomReviews = async () => {
    const { data } = await supabase
      .from('mbom_reviews')
      .select('*, programs(program_name)')
      .eq('role', 'Design Engineer')
      .order('created_at', { ascending: false });
    setEbomReviews(data || []);
  };

  const handleEbomFinalApproval = async (review, decision) => {
    try {
      await supabase
        .from('mbom_reviews')
        .update({
          status: decision,
          comments: decision === 'Approved'
            ? 'Design Engineer: All stages complete. eBOM fully approved.'
            : 'Design Engineer: BOM rejected at final sign-off. Revision required.'
        })
        .eq('id', review.id);

      if (decision === 'Approved') {
        await supabase.from('activity_logs').insert({
          program_id: review.program_id,
          action_type: 'eBOM Final Approved',
          action_description: `Design Engineer completed final sign-off for ${review.programs?.program_name}. eBOM fully approved across all 3 stages.`
        });
        alert('✅ eBOM fully approved! All 3 stages complete:\n1. Manufacturing ✔\n2. Procurement ✔\n3. Design ✔');
      } else {
        alert('❌ eBOM rejected at final sign-off. Design revision required.');
      }
      fetchEbomReviews();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  useEffect(() => {
    if (selectedTask) {
      fetchRevisions();
    }
  }, [selectedTask]);

  const fetchRevisions = async () => {
    if (!selectedTask) return;
    try {
      const { data, error } = await supabase
        .from('cad_files')
        .select('*')
        .eq('program_id', selectedTask.program_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRevisions(data || []);
    } catch (err) {
      console.error('Error fetching revisions:', err);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedTask) return;

    setIsUploading(true);
    
    // Simulate file upload delay
    setTimeout(async () => {
      try {
        const newVersion = `v1.${revisions.length + 1}`;
        const { error } = await supabase.from('cad_files').insert({
          program_id: selectedTask.program_id,
          file_name: file.name,
          file_url: 'storage/cad_models/' + file.name,
          version: newVersion,
          description: `Uploaded for task: ${selectedTask.task_name}`,
          uploaded_by: profile?.id,
          status: 'In Progress'
        });

        if (error) throw error;
        
        await fetchRevisions();
        // Also update task status if it's not started
        if (selectedTask.status === 'Not Started') {
          await updateTaskStatus(selectedTask.id, 'In Progress');
        }
      } catch (err) {
        console.error('Error uploading file:', err);
        alert(`Failed to upload revision: ${err.message || 'Unknown error'}`);
      } finally {
        setIsUploading(false);
      }
    }, 1500);
  };

  const [ddrComments, setDdrComments] = useState([]);

  useEffect(() => {
    if (selectedTask && activeTab === 'ddr-review') {
      fetchDdrComments();
    }
  }, [selectedTask, activeTab]);

  const fetchDdrComments = async () => {
    if (!selectedTask) return;
    try {
      const { data: reviews } = await supabase
        .from('ddr_reviews')
        .select('id')
        .eq('task_id', selectedTask.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (reviews && reviews.length > 0) {
        const { data: comments, error } = await supabase
          .from('ddr_comments')
          .select('*, author:users!author_id(full_name, role)')
          .eq('ddr_id', reviews[0].id)
          .order('created_at', { ascending: true });
        
        if (!error) {
          setDdrComments(comments || []);
        }
      }
    } catch (err) {
      console.error('Error fetching DDR comments:', err);
    }
  };

  const resolveComment = async (id) => {
    try {
      await supabase.from('ddr_comments')
        .update({ status: 'Resolved', resolution_notes: 'Resolved with new CAD revision.' })
        .eq('id', id);
      fetchDdrComments();
    } catch (err) {
      console.error('Failed to resolve comment');
    }
  };

  const fetchDesignTasks = async () => {
    try {
      console.log('AutoDev: [DIAGNOSTIC] Fetching Design Tasks (Simplified)...');
      
      // 1. Fetch only design_tasks first to avoid join errors
      const { data, error } = await supabase
        .from('design_tasks')
        .select('*');

      if (error) {
        console.error('AutoDev: [DIAGNOSTIC] Design Task Fetch Error:', error);
        throw error;
      }

      console.log('AutoDev: [DIAGNOSTIC] Raw Tasks found:', data?.length || 0, data);

      // 2. If tasks exist, manually fetch their program info to be safe
      const enriched = await Promise.all((data || []).map(async (task) => {
        const { data: prog } = await supabase
          .from('programs')
          .select('program_name, program_code')
          .eq('id', task.program_id)
          .maybeSingle();
        
        return { ...task, programs: prog };
      }));

      setTasks(enriched);
      if (enriched.length > 0) setSelectedTask(enriched[0]);
    } catch (err) {
      console.error('AutoDev: [DIAGNOSTIC] Design Workspace Initialization Failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      await supabase.from('design_tasks')
        .update({ status })
        .eq('id', taskId);
      
      if (status === 'DDR Review') {
        // Create DDR Review Entry
        const activeCad = revisions.length > 0 ? revisions[0] : null;
        await supabase.from('ddr_reviews').insert({
          task_id: taskId,
          program_id: selectedTask.program_id,
          cad_file_id: activeCad ? activeCad.id : null,
          title: `DDR: ${selectedTask.task_name}`,
          status: 'Under Review',
          created_by: profile?.id
        });
      }

      fetchDesignTasks();
      alert(`Task status updated to ${status}. ${status === 'DDR Review' ? 'DDR Workflow Initiated.' : ''}`);
    } catch (err) {
      console.error(err);
      alert('Failed to update task');
    }
  };

  if (loading) return <div className="loader">Initializing CAD Workspaces...</div>;

  return (
    <div className="design-dashboard-container">
      <header className="design-header">
        <div className="header-left">
          <div className="status-badge-studio">DESIGN PHASE ACTIVE</div>
          <h1>Engineering Design Studio</h1>
          <p className="technical-meta">SUBSYSTEM DEVELOPMENT // CAD VERSIONING // DDR WORKFLOW</p>
        </div>
        <div className="header-actions">
          <button className="secondary-btn"><History size={18} /> Revision History</button>
          <button className="primary-btn"><Plus size={18} /> New Design Note</button>
        </div>
      </header>

      <div className="design-main-layout">
        {/* LEFT: TASK LIST */}
        <aside className="design-sidebar-tasks glass">
          <div className="sidebar-header">
            <h3><Activity size={18} /> Assigned Tasks</h3>
          </div>
          <div className="task-list">
            {tasks.map(task => (
              <div 
                key={task.id} 
                className={`task-card glass ${selectedTask?.id === task.id ? 'active' : ''}`}
                onClick={() => setSelectedTask(task)}
              >
                <div className="task-top">
                  <span className={`priority-tag ${task.priority.toLowerCase()}`}>{task.priority}</span>
                  <span className="due-tag"><Clock size={12} /> {new Date(task.due_date).toLocaleDateString()}</span>
                </div>
                <h4>{task.task_name}</h4>
                <p>{task.programs?.program_name}</p>
                <div className={`status-pill ${task.status.replace(' ', '-').toLowerCase()}`}>{task.status}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* RIGHT: WORKSPACE */}
        <main className="design-workspace-area">
          {selectedTask ? (
            <div className="workspace-container glass">
              <nav className="workspace-tabs">
                {['Overview', 'CAD Module', 'eBOM Linking', 'DDR Review'].map(tab => (
                  <button 
                    key={tab} 
                    className={activeTab === tab.toLowerCase().replace(' ', '-') ? 'active' : ''}
                    onClick={() => setActiveTab(tab.toLowerCase().replace(' ', '-'))}
                  >
                    {tab}
                  </button>
                ))}
              </nav>

              <div className="workspace-content">
                {activeTab === 'overview' && (
                  <div className="tab-section">
                    <div className="info-grid">
                      <div className="info-card glass">
                        <h3>Subsystem</h3>
                        <p>{selectedTask.subsystem}</p>
                      </div>
                      <div className="info-card glass">
                        <h3>Program</h3>
                        <p>{selectedTask.programs?.program_name}</p>
                      </div>
                      <div className="info-card glass">
                        <h3>Task ID</h3>
                        <p className="font-mono">{selectedTask.id.slice(0, 8)}</p>
                      </div>
                    </div>
                    <div className="action-row">
                      <button className="status-btn in-progress" onClick={() => updateTaskStatus(selectedTask.id, 'In Progress')}>Start Development</button>
                      <button className="status-btn ddr" onClick={() => updateTaskStatus(selectedTask.id, 'DDR Review')}>Request DDR Review</button>
                    </div>
                  </div>
                )}

                {activeTab === 'cad-module' && (
                  <div className="tab-section">
                    <div className="cad-upload-zone glass-dark flex-center" onClick={() => document.getElementById('cad-upload').click()} style={{cursor: 'pointer'}}>
                      <input 
                        type="file" 
                        id="cad-upload" 
                        style={{display: 'none'}} 
                        onChange={handleFileUpload}
                      />
                      {isUploading ? (
                        <div className="flex-center" style={{flexDirection: 'column', gap: '10px'}}>
                          <Activity className="animate-spin text-accent" size={48} />
                          <h3>Processing CAD Geometry...</h3>
                        </div>
                      ) : (
                        <>
                          <Upload size={48} className="muted-icon" />
                          <h3>Upload CAD/STEP Revision</h3>
                          <p>Drag and drop engineering drawings here, or click to browse</p>
                          <button className="upload-btn">Select File</button>
                        </>
                      )}
                    </div>
                    <div className="revision-list">
                      <h3>Revision Control</h3>
                      {revisions.length === 0 ? (
                        <p className="muted-text">No revisions uploaded yet.</p>
                      ) : (
                        revisions.map((rev) => (
                          <div key={rev.id} className="revision-item glass" style={{marginBottom: '10px'}}>
                            <span>{rev.version} - {rev.file_name}</span>
                            <span>{new Date(rev.created_at).toLocaleDateString()}</span>
                            <ExternalLink size={16} style={{cursor: 'pointer'}} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'ebom-linking' && (
                  <div className="tab-section">
                    <h3 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      eBOM Stage 3: Design Engineer Final Sign-Off
                    </h3>
                    <p className="muted-text" style={{ marginBottom: '16px', fontSize: '0.85rem' }}>
                      You are the <strong>final approver</strong> in the eBOM review chain.
                      Your sign-off is only available after Manufacturing and Procurement have approved.
                    </p>
                    {ebomReviews.length === 0 ? (
                      <p className="muted-text">No eBOM reviews pending your sign-off.</p>
                    ) : (
                      <table className="bom-table">
                        <thead>
                          <tr><th>Program</th><th>Submitted</th><th>Status</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                          {ebomReviews.map(review => (
                            <tr key={review.id}>
                              <td style={{ color: 'var(--accent)' }}><strong>{review.programs?.program_name || 'Unknown'}</strong></td>
                              <td>{new Date(review.created_at).toLocaleDateString()}</td>
                              <td>
                                <span className={`status-pill ${review.status.toLowerCase()}`}>{review.status}</span>
                              </td>
                              <td>
                                {review.status === 'Blocked' && (
                                  <span style={{ color: '#404050', fontSize: '0.8rem' }}>
                                    🔒 Awaiting Procurement approval
                                  </span>
                                )}
                                {review.status === 'Pending' && (
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="success-btn small" onClick={() => handleEbomFinalApproval(review, 'Approved')}>✓ Final Approve</button>
                                    <button className="danger-btn small" onClick={() => handleEbomFinalApproval(review, 'Rejected')}>✕ Reject</button>
                                  </div>
                                )}
                                {review.status === 'Approved' && (
                                  <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>✔ Fully Approved</span>
                                )}
                                {review.status === 'Rejected' && (
                                  <span style={{ color: 'var(--error)', fontSize: '0.85rem' }}>✕ Rejected</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {activeTab === 'ddr-review' && (
                  <div className="tab-section">
                    <div className="ddr-status-tracker">
                      <div className="step completed">Initial Review</div>
                      <div className="step active">Cross Functional</div>
                      <div className="step">Manufacturing</div>
                      <div className="step">Quality</div>
                    </div>
                    <div className="ddr-comments glass">
                      <h3>DDR Feedback Loop</h3>
                      <p className="muted-text" style={{marginBottom: '20px'}}>
                        Review feedback from cross-functional teams below.
                      </p>
                      
                      {ddrComments.map(comment => (
                        <div key={comment.id} className="comment" style={{ opacity: comment.status === 'Resolved' ? 0.6 : 1, borderLeftColor: comment.status === 'Resolved' ? 'var(--success)' : (comment.severity === 'Critical' ? 'var(--error)' : 'var(--accent)') }}>
                          <div className="comment-meta">
                            <strong>{comment.author?.full_name || 'Reviewer'} <span style={{fontWeight: 400, color: 'var(--text-muted)'}}>({comment.author?.role || 'Engineer'})</span></strong>
                            <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                          </div>
                          <p style={{ textDecoration: comment.status === 'Resolved' ? 'line-through' : 'none' }}>
                            {comment.comment_text}
                          </p>
                          <div className="comment-actions">
                            {comment.status === 'Resolved' ? (
                              <span style={{color: 'var(--success)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                <CheckCircle size={14} /> {comment.resolution_notes || 'Resolved'}
                              </span>
                            ) : (
                              <>
                                <button className="reply-btn">Reply</button>
                                <button className="resolve-btn" onClick={() => resolveComment(comment.id)}>Resolve Issue</button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-workspace glass flex-center">
              <Cpu size={64} className="muted-icon" />
              <h2>Select a Design Task to Open Studio</h2>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DesignDashboard;
