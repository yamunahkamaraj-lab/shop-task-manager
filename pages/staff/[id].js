import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { staff, shops, generateAssignments } from '../../lib/data';
import { getCompletionStats, avatarColor, initials, isOverdue, statusClass, statusLabel, priorityClass } from '../../lib/utils';
import { useToast, ToastContainer } from '../../components/Toast';

const STORAGE_KEY = 'shop_task_assignments';
const STATUS_OPTIONS = ['to do', 'in progress', 'done'];

export default function StaffView() {
  const router = useRouter();
  const { id } = router.query;
  const { toast, toasts } = useToast();
  const [assignments, setAssignments] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState('all');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    if (!id) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setAssignments(saved ? JSON.parse(saved) : generateAssignments());
    } catch { setAssignments(generateAssignments()); }
    setMounted(true);

    // PWA install prompt
    const handler = e => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [id]);

  function onStatusChange(aid, val) {
    const updated = assignments.map(a => a.id === aid ? { ...a, status: val } : a);
    setAssignments(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (val === 'done') toast('✓ Task marked as done!');
    else toast('Status updated');
  }

  async function installApp() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') toast('TaskOps added to your home screen!');
    setShowInstall(false);
    setDeferredPrompt(null);
  }

  if (!mounted || !id) return null;

  const person = staff.find(u => u.id === id);
  if (!person) return <div style={{ padding: 40, textAlign: 'center' }}>Staff member not found</div>;

  const shop = shops.find(s => s.id === person.shopId);
  const myTasks = assignments.filter(a => a.staffId === id);
  const stats = getCompletionStats(myTasks);
  const av = avatarColor(id);

  const filters = [
    { id: 'all', label: 'All', count: myTasks.length },
    { id: 'to do', label: 'To do', count: myTasks.filter(t => t.status === 'to do').length },
    { id: 'in progress', label: 'In progress', count: myTasks.filter(t => t.status === 'in progress').length },
    { id: 'done', label: 'Done', count: myTasks.filter(t => t.status === 'done').length },
    { id: 'overdue', label: 'Overdue', count: myTasks.filter(t => isOverdue(t.status, t.due)).length },
  ];

  const filtered = myTasks.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'overdue') return isOverdue(a.status, a.due);
    return a.status === filter;
  });

  return (
    <div className="page" style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: 'var(--accent)', padding: '20px 20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {initials(person.name)}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: -0.3 }}>{person.name}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{person.role} · {shop?.name}</div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { val: myTasks.length, label: 'Total', color: '#fff' },
            { val: stats.done, label: 'Done', color: '#A8E063' },
            { val: stats.inprog, label: 'Active', color: '#7EC8F8' },
            { val: stats.overdue, label: 'Overdue', color: '#F8A07E' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
            <span>Progress</span><span style={{ fontWeight: 600, color: '#fff' }}>{stats.pct}%</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: stats.pct + '%', background: '#A8E063', borderRadius: 3, transition: 'width 0.4s' }} />
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '14px 16px 0', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {filters.map(f => (
          <button key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 20,
              border: '1px solid ' + (filter === f.id ? 'var(--accent)' : 'var(--border)'),
              background: filter === f.id ? 'var(--accent-bg)' : 'var(--surface)',
              color: filter === f.id ? 'var(--accent)' : 'var(--text2)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}>
            {f.label} {f.count > 0 && <span style={{ opacity: 0.6, marginLeft: 3 }}>{f.count}</span>}
          </button>
        ))}
      </div>

      {/* Task cards */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)', fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>✓</div>
            No tasks here
          </div>
        )}

        {filtered.map(a => {
          const hasSubs = a.subtasks && a.subtasks.length > 0;
          const isExp = expanded[a.id];
          const overdue = isOverdue(a.status, a.due);

          return (
            <div key={a.id} style={{
              background: 'var(--surface)',
              border: '1px solid ' + (overdue ? '#E8A8A8' : 'var(--border)'),
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: 'var(--shadow)',
            }}>
              <div style={{ padding: '14px 16px' }}>
                {/* Task name + status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6, letterSpacing: -0.2 }}>{a.taskName}</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <span className={statusClass(a.status, a.due)}>{statusLabel(a.status, a.due)}</span>
                      <span className={priorityClass(a.priority)}>{a.priority}</span>
                      {a.isShared && <span className="badge badge-shared">shared</span>}
                    </div>
                  </div>

                  {/* Big status toggle button */}
                  <select
                    style={{
                      fontFamily: 'var(--font-sans)', fontSize: 12,
                      border: '1px solid var(--border)', background: 'var(--bg2)',
                      color: 'var(--text)', borderRadius: 8, padding: '6px 8px',
                      flexShrink: 0, cursor: 'pointer',
                    }}
                    value={a.status}
                    onChange={e => onStatusChange(a.id, e.target.value)}>
                    {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                {/* Due date + subtasks */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: overdue ? 'var(--red)' : 'var(--text3)' }}>
                    {overdue ? '⚠ ' : '📅 '}Due: <strong>{a.due}</strong>
                  </span>
                  {hasSubs && (
                    <button
                      style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}
                      onClick={() => setExpanded(e => ({ ...e, [a.id]: !e[a.id] }))}>
                      {isExp ? '▾' : '▸'} {a.subtasks.length} subtask{a.subtasks.length > 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              </div>

              {/* Subtasks */}
              {isExp && hasSubs && (
                <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {a.subtasks.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <span style={{ color: 'var(--text3)' }}>↳</span>
                      <span style={{ flex: 1, color: 'var(--text2)' }}>{s.name}</span>
                      <span className={`badge ${s.status === 'done' ? 'badge-done' : 'badge-todo'}`}>{s.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Install banner */}
      <div className={`install-banner${showInstall ? ' show' : ''}`}>
        <span>Add TaskOps to your home screen for quick access</span>
        <button className="install-btn" onClick={installApp}>Add</button>
        <button className="dismiss-btn" onClick={() => setShowInstall(false)}>✕</button>
      </div>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          <button className={`mobile-nav-btn${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>
            <i className="ti ti-list" />
            All
          </button>
          <button className={`mobile-nav-btn${filter === 'in progress' ? ' active' : ''}`} onClick={() => setFilter('in progress')}>
            <i className="ti ti-loader" />
            Active
          </button>
          <button className={`mobile-nav-btn${filter === 'overdue' ? ' active' : ''}`} onClick={() => setFilter('overdue')}>
            <i className="ti ti-alert-circle" />
            Overdue
          </button>
          <button className={`mobile-nav-btn${filter === 'done' ? ' active' : ''}`} onClick={() => setFilter('done')}>
            <i className="ti ti-circle-check" />
            Done
          </button>
        </div>
      </nav>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
