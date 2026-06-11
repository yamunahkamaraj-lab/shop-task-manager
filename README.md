# TaskOps — Shop Task Manager

A task management app for multi-shop operations. Assign tasks to staff across multiple shops, track completion, and give each staff member their own personal task link.

---

## Deploy to Vercel (5 minutes)

### Step 1 — Upload to GitHub
1. Go to [github.com](https://github.com) and create a new repository (name it `shop-task-manager`)
2. Upload all these files to the repository (drag and drop the whole folder)

### Step 2 — Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account
2. Click **"Add New Project"**
3. Select your `shop-task-manager` repository
4. Click **"Deploy"** — Vercel auto-detects Next.js, no config needed
5. Done! Your app is live at `https://your-project.vercel.app`

---

## Pages

| URL | Who uses it | What it shows |
|-----|-------------|---------------|
| `/` | You (manager) | All shops overview + task management |
| `/shop/[id]` | Shop managers | Tasks for one shop |
| `/staff/[id]` | Individual staff | Only their own tasks |

### Staff links
Each staff member has a unique link like:
- `yourapp.vercel.app/staff/u1` → Farah's tasks
- `yourapp.vercel.app/staff/u2` → Hafiz's tasks

Send these links to your staff. They only see their own tasks and can mark them done.

---

## Connecting your real Google Sheet

When you're ready to use real data instead of sample data:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **Google Sheets API**
3. Create a Service Account and download the JSON key
4. Add environment variables in Vercel:
   - `GOOGLE_SHEET_ID` — your sheet ID (from the URL)
   - `GOOGLE_SERVICE_ACCOUNT_KEY` — the JSON key content
5. Replace `generateAssignments()` in `lib/data.js` with a fetch to your sheet

Or simply paste your data directly into `lib/data.js` as a JSON array — no API needed.

---

## Customising your shops and staff

Edit `lib/data.js`:

```js
export const shops = [
  { id: "s1", name: "Your Shop Name", location: "City", manager: "Name" },
  // add more...
];

export const staff = [
  { id: "u1", name: "Staff Name", shopId: "s1", role: "Role" },
  // add more...
];
```

---

## Tech stack
- **Next.js 14** — React framework
- **localStorage** — saves task updates in the browser (no database needed to start)
- **Vercel** — free hosting with auto-deploy on every push
