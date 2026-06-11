import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { shops, staff, generateAssignments } from '../../lib/data';
import { getCompletionStats, avatarColor, initials } from '../../lib/utils';
import { useToast, ToastContainer } from '../../components/Toast';
import TaskList from '../../components/TaskList';

const STORAGE_KEY = 'shop_task_assignments';

export default function ShopView() {
  const router = useRouter();
  const { id } = router.query;
  const { toast, toasts } = useToast();
  const [assignments, setAssignments] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!id) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setAssignments(saved ? JSON.parse(saved) : generateAssignments());
    } catch { setAssignments(generateAssignments()); }
    setMounted(true);
  }, [id]);

  function onStatusChange(aid, val, subId) {
    const updated = assignments.map(a => {
      if (a.id !== aid) return a;
      if (subId) return { ...a, subtasks: a.subtasks.map(s => s.id === subId ? { ...s, status: val } : s) };
      return { ...a, status: val };
    });
    setAssignments(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    toast('Status updated');
  }

  function onDateChange(aid, val) {
    const updated = assignments.map(a => a.id === aid ? { ...a, due: val } : a);
    setAssignments(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    toast('Due date updated');
  }

  if (!mounted || !id) return null;

  const shop = shops.find(s => s.id === id);
  if (!shop) return <div style={{ padding: 40, textAlign: 'center' }}>Shop not found</div>;

  const shopAssignments = assignments.filter(a => a.shopId === id);
  const shopStaff = staff.filter(u => u.shopId === id);
  const stats = getCompletionStats(shopAssignments);
  const filtered = selectedStaff ? shopAssignments.filter(a => a.staffId === selectedStaff) : shopAssignments;

  return (
    <div className="page">
      <nav className="topbar">
        <div className="topbar-brand">
          <div className="dot" />
          {shop.name}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text3)' }}>{shop.location}</div>
        <button className="btn btn-sm" onClick={() => router.push('/')}>Manager view ↗</button>
      </nav>

      <div style={{ padding: '28px 24px' }}>
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <div className="metric-card">
            <div className="metric-label">Total tasks</div>
            <div className="metric-value">{stats.total}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Completed</div>
            <div className="metric-value" style={{ color: 'var(--green)' }}>{stats.done}</div>
            <div className="prog-wrap"><div className="prog-fill green" style={{ width: stats.pct + '%' }} /></div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Overdue</div>
            <div className="metric-value" style={{ color: stats.overdue > 0 ? 'var(--red)' : 'var(--text3)' }}>{stats.overdue}</div>
          </div>
        </div>

        <div className="section-header">
          <div className="section-title" style={{ fontSize: 14 }}>Filter by staff</div>
        </div>

        <div className="staff-grid">
          <button className={`staff-pill${!selectedStaff ? ' active' : ''}`} onClick={() => setSelectedStaff(null)}>
            <div className="staff-av">All</div>All staff
          </button>
          {shopStaff.map(u => {
            const av = avatarColor(u.id);
            const uStats = getCompletionStats(shopAssignments.filter(a => a.staffId === u.id));
            return (
              <button key={u.id} className={`staff-pill${selectedStaff === u.id ? ' active' : ''}`} onClick={() => setSelectedStaff(u.id)}>
                <div className="staff-av" style={{ background: av.bg, color: av.color }}>{initials(u.name)}</div>
                {u.name}
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>{uStats.pct}%</span>
              </button>
            );
          })}
        </div>

        <TaskList assignments={filtered} onStatusChange={onStatusChange} onDateChange={onDateChange} showAssignee={!selectedStaff} staff={shopStaff} />
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  );
}
