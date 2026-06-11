import { generateAssignments, shops, staff } from '../../lib/data';

// This runs automatically every day at 8am via Vercel Cron
// It checks all tasks and sends reminders to staff and manager

function daysBetween(dateStr) {
  const due = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - now) / 86400000);
}

async function callNotify(baseUrl, body) {
  const res = await fetch(`${baseUrl}/api/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default async function handler(req, res) {
  // Protect this endpoint — only Vercel cron or you can call it
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.host}`;
  const managerEmail = process.env.MANAGER_EMAIL;
  const assignments = generateAssignments(); // In production, fetch from your real data source

  const results = [];

  // Group assignments by staff member
  const byStaff = {};
  assignments.forEach(a => {
    if (!byStaff[a.staffId]) byStaff[a.staffId] = [];
    byStaff[a.staffId].push(a);
  });

  // Group by shop for manager alerts
  const byShop = {};
  assignments.forEach(a => {
    if (!byShop[a.shopId]) byShop[a.shopId] = [];
    byShop[a.shopId].push(a);
  });

  for (const [staffId, tasks] of Object.entries(byStaff)) {
    const person = staff.find(u => u.id === staffId);
    if (!person || !person.email) continue;

    const shop = shops.find(s => s.id === person.shopId);
    const shopName = shop?.name || 'Shop';

    // Tasks due in exactly 3 days → remind staff
    const due3 = tasks.filter(t => t.status !== 'done' && daysBetween(t.due) === 3);
    if (due3.length > 0) {
      const r = await callNotify(baseUrl, {
        type: 'staff_reminder',
        staffEmail: person.email,
        staffName: person.name,
        staffId,
        shopName,
        tasks: due3,
        daysLeft: 3,
        appUrl: baseUrl,
      });
      results.push({ staff: person.name, type: 'reminder_3days', ...r });
    }

    // Tasks due tomorrow → urgent reminder to staff
    const due1 = tasks.filter(t => t.status !== 'done' && daysBetween(t.due) === 1);
    if (due1.length > 0) {
      const r = await callNotify(baseUrl, {
        type: 'staff_reminder',
        staffEmail: person.email,
        staffName: person.name,
        staffId,
        shopName,
        tasks: due1,
        daysLeft: 1,
        appUrl: baseUrl,
      });
      results.push({ staff: person.name, type: 'reminder_1day', ...r });
    }
  }

  // Manager: overdue alerts per shop
  if (managerEmail) {
    for (const [shopId, tasks] of Object.entries(byShop)) {
      const shop = shops.find(s => s.id === shopId);
      const shopName = shop?.name || 'Shop';

      // Tasks that just became overdue today (due yesterday)
      const overdue = tasks.filter(t => t.status !== 'done' && daysBetween(t.due) === -1);
      if (overdue.length > 0) {
        const r = await callNotify(baseUrl, {
          type: 'manager_overdue',
          managerEmail,
          shopName,
          tasks: overdue,
          appUrl: baseUrl,
        });
        results.push({ shop: shopName, type: 'manager_overdue', ...r });
      }

      // Tasks approaching in 3 days → manager heads up
      const approaching = tasks.filter(t => t.status !== 'done' && daysBetween(t.due) === 3);
      if (approaching.length > 0) {
        const r = await callNotify(baseUrl, {
          type: 'manager_approaching',
          managerEmail,
          shopName,
          tasks: approaching,
          daysLeft: 3,
          appUrl: baseUrl,
        });
        results.push({ shop: shopName, type: 'manager_approaching', ...r });
      }
    }
  }

  return res.status(200).json({ success: true, ran: new Date().toISOString(), results });
}
