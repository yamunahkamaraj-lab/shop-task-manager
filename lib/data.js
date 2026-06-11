export const shops = [
  { id: "s1", name: "Ipoh Garden", location: "Ipoh, Perak", manager: "Ahmad Fauzi" },
  { id: "s2", name: "Medan Gopeng", location: "Ipoh, Perak", manager: "Lim Wei Ling" },
  { id: "s3", name: "Greentown", location: "Ipoh, Perak", manager: "Priya Devi" },
  { id: "s4", name: "Falim", location: "Ipoh, Perak", manager: "Roslan Hamid" },
  { id: "s5", name: "Bercham", location: "Ipoh, Perak", manager: "Tan Siew Mei" },
  { id: "s6", name: "Tambun", location: "Ipoh, Perak", manager: "Kavitha Raj" },
];

export const staff = [
  { id: "u1", name: "Farah", shopId: "s1", role: "Cashier", email: "farah@email.com" },
  { id: "u2", name: "Hafiz", shopId: "s1", role: "Stock", email: "hafiz@email.com" },
  { id: "u3", name: "Mei Ling", shopId: "s2", role: "Cashier", email: "meiling@email.com" },
  { id: "u4", name: "Rajan", shopId: "s2", role: "Supervisor", email: "rajan@email.com" },
  { id: "u5", name: "Aisha", shopId: "s3", role: "Cashier", email: "aisha@email.com" },
  { id: "u6", name: "David", shopId: "s3", role: "Stock", email: "david@email.com" },
  { id: "u7", name: "Siti", shopId: "s4", role: "Cashier", email: "siti@email.com" },
  { id: "u8", name: "Kumar", shopId: "s4", role: "Supervisor", email: "kumar@email.com" },
  { id: "u9", name: "Nurul", shopId: "s5", role: "Cashier", email: "nurul@email.com" },
  { id: "u10", name: "Jason", shopId: "s5", role: "Stock", email: "jason@email.com" },
  { id: "u11", name: "Amira", shopId: "s6", role: "Cashier", email: "amira@email.com" },
  { id: "u12", name: "Gopal", shopId: "s6", role: "Supervisor", email: "gopal@email.com" },
];

export const tasks = [
  // Shared tasks (all shops)
  { id: "t1", name: "Clean display cabinets", category: "Daily", isShared: true, priority: "high", subtasks: [
    { id: "t1a", name: "Wipe glass panels" },
    { id: "t1b", name: "Restock shelves" },
  ]},
  { id: "t2", name: "Submit daily sales report", category: "Daily", isShared: true, priority: "high", subtasks: [] },
  { id: "t3", name: "Check expiry dates", category: "Weekly", isShared: true, priority: "medium", subtasks: [
    { id: "t3a", name: "Remove expired items" },
    { id: "t3b", name: "Update stock log" },
  ]},
  { id: "t4", name: "Staff attendance log", category: "Daily", isShared: true, priority: "medium", subtasks: [] },
  { id: "t5", name: "Monthly inventory count", category: "Monthly", isShared: true, priority: "high", subtasks: [
    { id: "t5a", name: "Count all SKUs" },
    { id: "t5b", name: "Submit inventory form" },
  ]},
  // Unique tasks per shop
  { id: "t6", name: "Repair broken shelf (Aisle 3)", category: "One-off", isShared: false, shopId: "s1", priority: "high", subtasks: [] },
  { id: "t7", name: "Install new POS system", category: "One-off", isShared: false, shopId: "s2", priority: "high", subtasks: [
    { id: "t7a", name: "Setup hardware" },
    { id: "t7b", name: "Staff training" },
  ]},
  { id: "t8", name: "Repaint entrance wall", category: "One-off", isShared: false, shopId: "s3", priority: "low", subtasks: [] },
  { id: "t9", name: "Fix air conditioning unit", category: "One-off", isShared: false, shopId: "s4", priority: "high", subtasks: [] },
  { id: "t10", name: "Rearrange promo display", category: "One-off", isShared: false, shopId: "s5", priority: "medium", subtasks: [] },
];

// Generate assignments: each task assigned to one staff per shop
export function generateAssignments() {
  const assignments = [];
  let idCounter = 1;

  const today = new Date();
  const dueOffsets = { Daily: 1, Weekly: 7, Monthly: 30, "One-off": 14 };

  tasks.forEach((task) => {
    const targetShops = task.isShared ? shops : shops.filter((s) => s.id === task.shopId);
    targetShops.forEach((shop) => {
      const shopStaff = staff.filter((u) => u.shopId === shop.id);
      if (!shopStaff.length) return;
      const assignee = shopStaff[idCounter % shopStaff.length];
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + (dueOffsets[task.category] || 7) - (idCounter % 3));

      assignments.push({
        id: `a${idCounter++}`,
        taskId: task.id,
        taskName: task.name,
        category: task.category,
        shopId: shop.id,
        shopName: shop.name,
        staffId: assignee.id,
        staffName: assignee.name,
        priority: task.priority,
        status: ["to do", "to do", "in progress", "done"][idCounter % 4],
        due: dueDate.toISOString().split("T")[0],
        isShared: task.isShared,
        subtasks: task.subtasks.map((s, i) => ({
          ...s,
          status: ["to do", "done"][i % 2],
        })),
      });
    });
  });
  return assignments;
}
