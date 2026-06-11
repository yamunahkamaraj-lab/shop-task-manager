export function days(d) {
  return Math.round((new Date(d) - new Date()) / 86400000);
}

export function isOverdue(status, due) {
  return status !== 'done' && days(due) < 0;
}

export function statusLabel(status, due) {
  if (isOverdue(status, due)) return 'overdue';
  return status;
}

export function statusClass(status, due) {
  if (isOverdue(status, due)) return 'badge badge-overdue';
  if (status === 'done') return 'badge badge-done';
  if (status === 'in progress') return 'badge badge-inprog';
  return 'badge badge-todo';
}

export function priorityClass(p) {
  return `badge badge-${p}`;
}

export function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function avatarColor(id) {
  const colors = [
    { bg: '#E8F0FA', color: '#1A4F8A' },
    { bg: '#E8F2E0', color: '#3A6B1A' },
    { bg: '#FAF0E0', color: '#8B5E1A' },
    { bg: '#FAE8F4', color: '#8A1A6B' },
    { bg: '#E8FAFA', color: '#1A7A8A' },
    { bg: '#FAE8E8', color: '#9B2828' },
  ];
  const idx = parseInt(id.replace(/\D/g, ''), 10) % colors.length;
  return colors[idx];
}

export function getCompletionStats(assignments) {
  const total = assignments.length;
  const done = assignments.filter(a => a.status === 'done').length;
  const overdue = assignments.filter(a => isOverdue(a.status, a.due)).length;
  const inprog = assignments.filter(a => a.status === 'in progress').length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return { total, done, overdue, inprog, pct };
}
