async function sendEmail(apiKey, { to, subject, html }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'TaskOps <onboarding@resend.dev>', to: [to], subject, html }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to send email');
  return data;
}

function badge(text, bg, color) {
  return `<span style="padding:2px 8px;border-radius:20px;font-size:11px;font-weight:500;background:${bg};color:${color}">${text}</span>`;
}

function statusBadge(status, due) {
  const overdue = status !== 'done' && new Date(due) < new Date();
  if (overdue) return badge('overdue', '#FCEBEB', '#9B2828');
  if (status === 'done') return badge('done', '#EAF3DE', '#3B6D11');
  if (status === 'in progress') return badge('in progress', '#E6F1FB', '#185FA5');
  return badge('to do', '#F1EFE8', '#5F5E5A');
}

function priorityBadge(p) {
  if (p === 'high') return badge('high', '#FCEBEB', '#9B2828');
  if (p === 'medium') return badge('medium', '#FAEEDA', '#854F0B');
  return badge('low', '#F1EFE8', '#5F5E5A');
}

function baseTemplate({ title, subtitle, headerBg = '#1A4F8A', shopName, body, appUrl, ctaText, ctaUrl }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F3EE;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:32px auto;background:#FDFCFA;border-radius:12px;border:1px solid #D8D4CC;overflow:hidden">
  <div style="background:${headerBg};padding:24px 32px">
    <div style="font-size:18px;font-weight:600;color:#fff">TaskOps</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:2px">${shopName}</div>
  </div>
  <div style="padding:28px 32px">
    <div style="font-size:20px;font-weight:600;color:#1C1A17;margin-bottom:4px">${title}</div>
    <div style="font-size:14px;color:#6B6760;margin-bottom:24px;line-height:1.6">${subtitle}</div>
    ${body}
    ${ctaUrl ? `<a href="${ctaUrl}" style="display:block;background:${headerBg};color:#fff;text-align:center;padding:13px 24px;border-radius:8px;font-size:14px;font-weight:500;text-decoration:none;margin-top:24px">${ctaText} →</a>` : ''}
  </div>
  <div style="padding:16px 32px;border-top:1px solid #E2DED6;font-size:12px;color:#9E9A94;text-align:center">
    Sent by TaskOps · ${shopName}
  </div>
</div></body></html>`;
}

function taskTable(tasks) {
  const rows = tasks.map(t => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0ece4;font-size:14px;color:#1C1A17">${t.taskName}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0ece4">${statusBadge(t.status, t.due)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0ece4;font-size:13px;color:#6B6760">${t.due}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0ece4">${priorityBadge(t.priority)}</td>
    </tr>`).join('');
  return `<table style="width:100%;border-collapse:collapse;margin-bottom:8px">
    <thead><tr style="background:#F5F3EE">
      <th style="padding:8px 12px;text-align:left;font-size:11px;color:#9E9A94;text-transform:uppercase;letter-spacing:0.06em">Task</th>
      <th style="padding:8px 12px;text-align:left;font-size:11px;color:#9E9A94;text-transform:uppercase;letter-spacing:0.06em">Status</th>
      <th style="padding:8px 12px;text-align:left;font-size:11px;color:#9E9A94;text-transform:uppercase;letter-spacing:0.06em">Due</th>
      <th style="padding:8px 12px;text-align:left;font-size:11px;color:#9E9A94;text-transform:uppercase;letter-spacing:0.06em">Priority</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function statBox(value, label, bg, color) {
  return `<div style="flex:1;background:${bg};border-radius:8px;padding:14px;text-align:center">
    <div style="font-size:22px;font-weight:600;color:${color}">${value}</div>
    <div style="font-size:11px;color:${color};opacity:0.7;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px">${label}</div>
  </div>`;
}

// ─── EMAIL TEMPLATES ────────────────────────────────────────────────────────

function staffAssignedEmail({ staffName, shopName, tasks, appUrl, staffId }) {
  const pending = tasks.filter(t => t.status !== 'done');
  const high = tasks.filter(t => t.priority === 'high').length;
  const body = `
    <div style="display:flex;gap:12px;margin-bottom:24px">
      ${statBox(tasks.length, 'Total', '#F5F3EE', '#1C1A17')}
      ${statBox(pending.length, 'Pending', '#E6F1FB', '#185FA5')}
      ${high > 0 ? statBox(high, 'High priority', '#FCEBEB', '#9B2828') : ''}
    </div>
    ${taskTable(tasks)}`;
  return baseTemplate({
    title: `Hi ${staffName} 👋 You have new tasks`,
    subtitle: `You have been assigned <strong>${tasks.length} task${tasks.length > 1 ? 's' : ''}</strong> at <strong>${shopName}</strong>. Please review and get started.`,
    shopName, appUrl, body,
    ctaText: 'View my tasks',
    ctaUrl: `${appUrl}/staff/${staffId}`,
  });
}

function staffReminderEmail({ staffName, shopName, tasks, appUrl, staffId, daysLeft }) {
  const urgency = daysLeft === 1 ? '⚠️ Due tomorrow' : `📅 Due in ${daysLeft} days`;
  const headerBg = daysLeft === 1 ? '#8B1A1A' : '#B06000';
  const body = taskTable(tasks);
  return baseTemplate({
    title: `${urgency} — action needed`,
    subtitle: `Hi ${staffName}, you have <strong>${tasks.length} task${tasks.length > 1 ? 's' : ''}</strong> due ${daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`} at <strong>${shopName}</strong>. Please complete them on time.`,
    shopName, appUrl, body, headerBg,
    ctaText: 'View my tasks',
    ctaUrl: `${appUrl}/staff/${staffId}`,
  });
}

function managerCompletedEmail({ managerEmail, staffName, shopName, task, appUrl }) {
  const body = `
    <div style="background:#EAF3DE;border-radius:10px;padding:18px 20px;margin-bottom:20px">
      <div style="font-size:16px;font-weight:600;color:#3B6D11;margin-bottom:4px">✓ ${task.taskName}</div>
      <div style="font-size:13px;color:#5A8A2A">Completed by <strong>${staffName}</strong> · ${shopName}</div>
      <div style="font-size:12px;color:#7AAF3A;margin-top:6px">Due date was: ${task.due}</div>
    </div>`;
  return baseTemplate({
    title: 'Task completed',
    subtitle: `<strong>${staffName}</strong> at <strong>${shopName}</strong> has marked a task as done.`,
    shopName, appUrl, body, headerBg: '#27500A',
    ctaText: 'View dashboard',
    ctaUrl: appUrl,
  });
}

function managerOverdueEmail({ tasks, shopName, appUrl }) {
  const body = `
    <div style="background:#FCEBEB;border-radius:8px;padding:14px 18px;margin-bottom:20px;font-size:13px;color:#9B2828">
      ⚠️ The following tasks are overdue and have not been completed. Please follow up with the relevant staff.
    </div>
    ${taskTable(tasks)}`;
  return baseTemplate({
    title: `⚠️ ${tasks.length} overdue task${tasks.length > 1 ? 's' : ''} at ${shopName}`,
    subtitle: `These tasks have passed their due date and are still incomplete.`,
    shopName, appUrl, body, headerBg: '#8B1A1A',
    ctaText: 'View dashboard',
    ctaUrl: appUrl,
  });
}

function managerApproachingEmail({ tasks, shopName, appUrl, daysLeft }) {
  const body = taskTable(tasks);
  return baseTemplate({
    title: `📅 ${tasks.length} task${tasks.length > 1 ? 's' : ''} approaching deadline`,
    subtitle: `The following tasks at <strong>${shopName}</strong> are due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Make sure staff are on track.`,
    shopName, appUrl, body, headerBg: '#B06000',
    ctaText: 'View dashboard',
    ctaUrl: appUrl,
  });
}

// ─── MAIN HANDLER ───────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not set' });

  const { type, appUrl } = req.body;
  const results = [];

  try {
    // ── Staff: new task assigned ─────────────────────────────────────────
    if (type === 'staff_assigned') {
      const { staffEmail, staffName, staffId, shopName, tasks } = req.body;
      await sendEmail(apiKey, {
        to: staffEmail,
        subject: `📋 You have been assigned ${tasks.length} task${tasks.length > 1 ? 's' : ''} — ${shopName}`,
        html: staffAssignedEmail({ staffName, shopName, tasks, appUrl, staffId }),
      });
      results.push({ type, to: staffEmail, success: true });
    }

    // ── Staff: due date reminder ─────────────────────────────────────────
    else if (type === 'staff_reminder') {
      const { staffEmail, staffName, staffId, shopName, tasks, daysLeft } = req.body;
      await sendEmail(apiKey, {
        to: staffEmail,
        subject: `${daysLeft === 1 ? '⚠️ Due tomorrow' : `📅 Due in ${daysLeft} days`} — ${tasks.length} task${tasks.length > 1 ? 's' : ''} at ${shopName}`,
        html: staffReminderEmail({ staffName, shopName, tasks, appUrl, staffId, daysLeft }),
      });
      results.push({ type, to: staffEmail, success: true });
    }

    // ── Manager: task completed ──────────────────────────────────────────
    else if (type === 'manager_completed') {
      const { managerEmail, staffName, shopName, task } = req.body;
      await sendEmail(apiKey, {
        to: managerEmail,
        subject: `✅ Task completed — ${staffName} · ${shopName}`,
        html: managerCompletedEmail({ managerEmail, staffName, shopName, task, appUrl }),
      });
      results.push({ type, to: managerEmail, success: true });
    }

    // ── Manager: overdue alert ───────────────────────────────────────────
    else if (type === 'manager_overdue') {
      const { managerEmail, shopName, tasks } = req.body;
      await sendEmail(apiKey, {
        to: managerEmail,
        subject: `⚠️ ${tasks.length} overdue task${tasks.length > 1 ? 's' : ''} — ${shopName}`,
        html: managerOverdueEmail({ tasks, shopName, appUrl }),
      });
      results.push({ type, to: managerEmail, success: true });
    }

    // ── Manager: approaching deadline ────────────────────────────────────
    else if (type === 'manager_approaching') {
      const { managerEmail, shopName, tasks, daysLeft } = req.body;
      await sendEmail(apiKey, {
        to: managerEmail,
        subject: `📅 ${tasks.length} task${tasks.length > 1 ? 's' : ''} approaching deadline — ${shopName}`,
        html: managerApproachingEmail({ tasks, shopName, appUrl, daysLeft }),
      });
      results.push({ type, to: managerEmail, success: true });
    }

    // ── Bulk: send all assigned ──────────────────────────────────────────
    else if (type === 'bulk_assigned') {
      const { notifications } = req.body; // array of { staffEmail, staffName, staffId, shopName, tasks }
      for (const n of notifications) {
        try {
          await sendEmail(apiKey, {
            to: n.staffEmail,
            subject: `📋 You have been assigned ${n.tasks.length} task${n.tasks.length > 1 ? 's' : ''} — ${n.shopName}`,
            html: staffAssignedEmail({ ...n, appUrl }),
          });
          results.push({ to: n.staffEmail, success: true });
        } catch (e) {
          results.push({ to: n.staffEmail, success: false, error: e.message });
        }
      }
    }

    else {
      return res.status(400).json({ error: `Unknown notification type: ${type}` });
    }

    return res.status(200).json({ success: true, results });
  } catch (err) {
    console.error('Notify error:', err);
    return res.status(500).json({ error: err.message });
  }
}
