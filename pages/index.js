import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { shops, staff, generateAssignments } from '../lib/data';
import { getCompletionStats, isOverdue, avatarColor, initials } from '../lib/utils';
import { useToast, ToastContainer } from '../components/Toast';
import TaskList from '../components/TaskList';

const STORAGE_KEY = 'shop_task_assignments';

function loadAssignments() {
  if (typeof window === 'undefined') return generateAssignments();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : generateAssignments();
  } catch { return generateAssignments(); }
}

function saveAssignments(data) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function Dashboard() {
  const router = useRouter();
  const { toast, toasts } = useToast();
  const [assignments, setAssignments] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [tab, setTab] = useState('overview');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setAssignments(loadAssignments());
    setMounted(true);
  }, []);

  function updateAssignments(updated) {
    setAssignments(updated);
    saveAssignments(updated);
  }

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  async function callNotify(body) {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, appUrl }),
    });
    return res.json();
  }

  async function onStatusChange(id, val, subId) {
    const task = assignments.find(a => a.id === id);
    const updated = assignments.map(a => {
      if (a.id !== id) return a;
      if (subId) return { ...a, subtasks: a.subtasks.map(s => s.id === subId ? { ...s, status: val } : s) };
      return { ...a, status: val };
    });
    updateAssignments(updated);
    toast(`Status updated to "${val}"`);

    // Notify manager when task is marked done
    const managerEmail = process.env.NEXT_PUBLIC_MANAGER_EMAIL;
    if (val === 'done' && managerEmail && task) {
      const person = staff.find(u => u.id === task.staffId);
      const shop = shops.find(s => s.id === task.shopId);
      if (person) callNotify({ type: 'manager_completed', managerEmail, staffName: person.name, shopName: shop?.name, task });
    }
  }

  function onDateChange(id, val) {
    const updated = assignments.map(a => a.id === id ? { ...a, due: val } : a);
    updateAssignments(updated);
    toast('Due date updated');
  }

  function resetData() {
    const fresh = generateAssignments();
    updateAssignments(fresh);
    toast('Data reset to sample');
  }

  async function notifyShop(shopId) {
    const shopObj = shops.find(s => s.id === shopId);
    const shopStaffList = staff.filter(u => u.shopId === shopId);
    let sent = 0;
    for (const u of shopStaffList) {
      if (!u.email) continue;
      const uTasks = assignments.filter(a => a.staffId === u.id);
      try {
        await callNotify({ type: 'staff_assigned', staffEmail: u.email, staffName: u.name, staffId: u.id, shopName: shopObj?.name, tasks: uTasks });
        sent++;
      } catch {}
    }
    toast(`✓ Emails sent to ${sent} staff at ${shopObj?.name}`);
  }

  async function notifyAllShops() {
    const notifications = staff.filter(u => u.email).map(u => {
      const shopObj = shops.find(s => s.id === u.shopId);
      return { staffEmail: u.email, staffName: u.name, staffId: u.id, shopName: shopObj?.name, tasks: assignments.filter(a => a.staffId === u.id) };
    });
    await callNotify({ type: 'bulk_assigned', notifications });
    toast(`✓ Emails sent to all ${notifications.length} staff members`);
  }

  if (!mounted) return null;

  const globalStats = getCompletionStats(assignments);

  const shopStats = shops.map(s => {
    const shopAssignments = assignments.filter(a => a.shopId === s.id);
    return { ...s, ...getCompletionStats(shopAssignments), count: shopAssignments.length };
  });

  const activeShop = shops.find(s => s.id === selectedShop);
  const shopAssignments = selectedShop ? assignments.filter(a => a.shopId === selectedShop) : [];
  const shopStaff = selectedShop ? staff.filter(u => u.shopId === selectedShop) : [];
  const filteredByStaff = selectedStaff ? shopAssignments.filter(a => a.staffId === selectedStaff) : shopAssignments;

  return (
    <div className="page">
      <nav className="topbar">
        <div className="topbar-brand">
          <div className="dot" />
          TaskOps
        </div>
        <div className="topbar-nav">
          <button className={`nav-btn${tab === 'overview' ? ' active' : ''}`} onClick={() => { setTab('overview'); setSelectedShop(null); }}>Overview</button>
          <button className={`nav-btn${tab === 'shops' ? ' active' : ''}`} onClick={() => setTab('shops')}>Shops</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm btn-ghost" onClick={resetData}>Reset data</button>
          <button className="btn btn-sm btn-primary" onClick={notifyAllShops}>
            📣 Send all tasks
          </button>
        </div>
      </nav>

      <div style={{ padding: '28px 24px' }}>

        {/* Overview tab */}
        {tab === 'overview' && (
          <>
            <div className="section-header">
              <div>
                <div className="section-title">Manager Dashboard</div>
                <div className="section-sub">{shops.length} shops · {staff.length} staff · {globalStats.total} tasks</div>
              </div>
            </div>

            <div className="sync-bar">
              <div className="sync-dot" />
              <span>Connected to <strong>Google Sheets</strong> · Last synced just now</span>
              <button className="btn btn-sm" onClick={() => toast('Synced from Google Sheets')}>↻ Sync</button>
            </div>

            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-label">Total tasks</div>
                <div className="metric-value">{globalStats.total}</div>
                <div className="metric-sub">across {shops.length} shops</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Completed</div>
                <div className="metric-value" style={{ color: 'var(--green)' }}>{globalStats.done}</div>
                <div className="metric-sub">{globalStats.pct}% done</div>
                <div className="prog-wrap"><div className="prog-fill green" style={{ width: globalStats.pct + '%' }} /></div>
              </div>
              <div className="metric-card">
                <div className="metric-label">In progress</div>
                <div className="metric-value" style={{ color: 'var(--accent)' }}>{globalStats.inprog}</div>
                <div className="metric-sub">active right now</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Overdue</div>
                <div className="metric-value" style={{ color: 'var(--red)' }}>{globalStats.overdue}</div>
                <div className="metric-sub">need attention</div>
              </div>
            </div>

            <div className="section-header" style={{ marginTop: 8 }}>
              <div className="section-title" style={{ fontSize: 14 }}>All shops at a glance</div>
              <button className="btn btn-sm" onClick={() => setTab('shops')}>View all →</button>
            </div>

            <div className="shop-grid">
              {shopStats.map(s => (
                <div key={s.id} className="shop-card" onClick={() => { setSelectedShop(s.id); setTab('shops'); }}>
                  <div className="shop-name">{s.name}</div>
                  <div className="shop-location">{s.location}</div>
                  <div className="prog-wrap" style={{ marginBottom: 10 }}>
                    <div className={`prog-fill${s.overdue > 0 ? ' warn' : s.pct === 100 ? ' green' : ''}`} style={{ width: s.pct + '%' }} />
                  </div>
                  <div className="shop-meta">
                    <span>{s.done}/{s.total} tasks</span>
                    <span style={{ fontWeight: 600 }}>{s.pct}%</span>
                    {s.overdue > 0 && <span className="badge badge-overdue">{s.overdue} overdue</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Shops tab */}
        {tab === 'shops' && (
          <>
            {!selectedShop ? (
              <>
                <div className="section-header">
                  <div>
                    <div className="section-title">All Shops</div>
                    <div className="section-sub">Click a shop to manage its tasks</div>
                  </div>
                </div>
                <div className="shop-grid">
                  {shopStats.map(s => (
                    <div key={s.id} className="shop-card" onClick={() => setSelectedShop(s.id)}>
                      <div className="shop-name">{s.name}</div>
                      <div className="shop-location">{s.location}</div>
                      <div className="shop-meta" style={{ marginBottom: 10 }}>
                        <span style={{ color: 'var(--text3)', fontSize: 12 }}>Manager: {s.manager}</span>
                      </div>
                      <div className="prog-wrap" style={{ marginBottom: 10 }}>
                        <div className={`prog-fill${s.overdue > 0 ? ' warn' : s.pct === 100 ? ' green' : ''}`} style={{ width: s.pct + '%' }} />
                      </div>
                      <div className="shop-meta">
                        <span>{s.done}/{s.total} tasks</span>
                        <span style={{ fontWeight: 600 }}>{s.pct}%</span>
                        {s.overdue > 0 && <span className="badge badge-overdue">{s.overdue} overdue</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="section-header">
                  <div>
                    <button className="btn btn-sm btn-ghost" style={{ marginBottom: 8 }} onClick={() => { setSelectedShop(null); setSelectedStaff(null); }}>← All shops</button>
                    <div className="section-title">{activeShop?.name}</div>
                    <div className="section-sub">{activeShop?.location} · {shopStaff.length} staff · {shopAssignments.length} tasks</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm" onClick={() => notifyShop(selectedShop)}>
                      📣 Notify shop
                    </button>
                    <button className="btn btn-sm btn-primary" onClick={() => router.push(`/shop/${selectedShop}`)}>
                      Shop view ↗
                    </button>
                  </div>
                </div>

                <div className="staff-grid">
                  <button className={`staff-pill${!selectedStaff ? ' active' : ''}`} onClick={() => setSelectedStaff(null)}>
                    <div className="staff-av">All</div>
                    All staff
                  </button>
                  {shopStaff.map(u => {
                    const av = avatarColor(u.id);
                    const uStats = getCompletionStats(shopAssignments.filter(a => a.staffId === u.id));
                    return (
                      <button key={u.id} className={`staff-pill${selectedStaff === u.id ? ' active' : ''}`} onClick={() => setSelectedStaff(u.id)}>
                        <div className="staff-av" style={{ background: av.bg, color: av.color }}>{initials(u.name)}</div>
                        {u.name}
                        <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 2 }}>{uStats.pct}%</span>
                        {uStats.overdue > 0 && <span className="badge badge-overdue" style={{ padding: '1px 6px', fontSize: 10 }}>!</span>}
                      </button>
                    );
                  })}
                </div>

                {selectedStaff && (
                  <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>Shareable link for {shopStaff.find(u => u.id === selectedStaff)?.name}:</span>
                    <div className="link-box">{typeof window !== 'undefined' ? window.location.origin : ''}/staff/{selectedStaff}</div>
                    <button className="btn btn-sm" onClick={() => toast('Link copied!')}>Copy</button>
                    <button className="btn btn-sm btn-primary" onClick={() => router.push(`/staff/${selectedStaff}`)}>Open ↗</button>
                  </div>
                )}

                <TaskList
                  assignments={filteredByStaff}
                  onStatusChange={onStatusChange}
                  onDateChange={onDateChange}
                  showAssignee={!selectedStaff}
                  staff={shopStaff}
                />
              </>
            )}
          </>
        )}
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
