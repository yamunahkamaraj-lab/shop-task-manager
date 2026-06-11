import { useState } from 'react';
import { statusClass, statusLabel, priorityClass, isOverdue } from '../lib/utils';

const STATUS_OPTIONS = ['to do', 'in progress', 'done'];

// Single source of truth for column widths
const GRID_WITH_ASSIGNEE    = '32px 1fr 100px 120px 120px 80px 80px';
const GRID_WITHOUT_ASSIGNEE = '32px 1fr 120px 120px 80px 80px';

export default function TaskList({ assignments, onStatusChange, onDateChange, showAssignee = false, staff = [] }) {
  const [expanded, setExpanded] = useState({});
  const [filter, setFilter]     = useState('all');

  const grid = showAssignee ? GRID_WITH_ASSIGNEE : GRID_WITHOUT_ASSIGNEE;

  const filters = [
    { id: 'all',         label: 'All' },
    { id: 'to do',       label: 'To do' },
    { id: 'in progress', label: 'In progress' },
    { id: 'done',        label: 'Done' },
    { id: 'overdue',     label: 'Overdue' },
  ];

  const filtered = assignments.filter(a => {
    if (filter === 'all')     return true;
    if (filter === 'overdue') return isOverdue(a.status, a.due);
    return a.status === filter;
  });

  function getStaffName(staffId) {
    const s = staff.find(x => x.id === staffId);
    return s ? s.name : '—';
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="filter-row">
        {filters.map(f => (
          <button
            key={f.id}
            className={`fbtn${filter === f.id ? ' active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            {f.id !== 'all' && (
              <span style={{ marginLeft: 5, opacity: 0.6 }}>
                {f.id === 'overdue'
                  ? assignments.filter(a => isOverdue(a.status, a.due)).length
                  : assignments.filter(a => a.status === f.id).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Column headers — same grid as task rows */}
      <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '8px 16px', marginBottom: 4 }}>
        <div />
        <div className="col-h">Task</div>
        {showAssignee && <div className="col-h">Assignee</div>}
        <div className="col-h">Status</div>
        <div className="col-h">Due date</div>
        <div className="col-h">Priority</div>
        <div className="col-h">Type</div>
      </div>

      {/* Task cards */}
      <div className="task-list">
        {filtered.length === 0 && (
          <div className="empty"><div className="ei">✓</div>No tasks match this filter</div>
        )}

        {filtered.map(a => {
          const hasSubs = a.subtasks && a.subtasks.length > 0;
          const isExp   = expanded[a.id];
          const overdue = isOverdue(a.status, a.due);

          return (
            <div key={a.id} className={`task-card${overdue ? ' overdue' : ''}`}>

              {/* Main task row */}
              <div
                className="task-main"
                style={{ gridTemplateColumns: grid }}
                onClick={() => hasSubs && setExpanded(e => ({ ...e, [a.id]: !e[a.id] }))}
              >
                <div className={`expand-icon${isExp ? ' open' : ''}`}>
                  {hasSubs ? (isExp ? '▾' : '▸') : ''}
                </div>

                <div className="task-name-wrap">
                  <div className="tname">{a.taskName}</div>
                  {hasSubs && (
                    <div className="tsub">
                      {a.subtasks.length} subtask{a.subtasks.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {showAssignee && (
                  <div onClick={e => e.stopPropagation()}>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                      {getStaffName(a.staffId)}
                    </span>
                  </div>
                )}

                <div onClick={e => e.stopPropagation()}>
                  <select
                    className="status-sel"
                    value={a.status}
                    onChange={e => onStatusChange && onStatusChange(a.id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                <div onClick={e => e.stopPropagation()}>
                  <input
                    type="date"
                    className="date-input"
                    value={a.due}
                    onChange={e => onDateChange && onDateChange(a.id, e.target.value)}
                  />
                </div>

                <div><span className={priorityClass(a.priority)}>{a.priority}</span></div>

                <div>
                  <span className={`badge ${a.isShared ? 'badge-shared' : 'badge-todo'}`}>
                    {a.isShared ? 'shared' : 'unique'}
                  </span>
                </div>
              </div>

              {/* Subtask rows */}
              {isExp && hasSubs && (
                <div className="subtasks-panel">
                  {a.subtasks.map(s => (
                    <div
                      key={s.id}
                      className="subtask-row"
                      style={{ gridTemplateColumns: grid }}
                    >
                      <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>↳</div>
                      <div style={{ fontSize: 13 }}>{s.name}</div>
                      {showAssignee && <div />}
                      <div>
                        <select
                          className="status-sel"
                          value={s.status}
                          onChange={e => onStatusChange && onStatusChange(a.id, e.target.value, s.id)}
                        >
                          {STATUS_OPTIONS.map(st => <option key={st}>{st}</option>)}
                        </select>
                      </div>
                      <div>
                        <input type="date" className="date-input" value={a.due} readOnly />
                      </div>
                      <div><span className={priorityClass(a.priority)}>{a.priority}</span></div>
                      <div />
                    </div>
                  ))}
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}
