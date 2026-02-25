import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";

const db = new Database("database.sqlite");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS databases (
    id TEXT PRIMARY KEY,
    name TEXT,
    icon TEXT,
    columns TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT,
    properties TEXT,
    parentId TEXT,
    databaseId TEXT,
    isTemplate INTEGER DEFAULT 0
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS dashboards (
    id TEXT PRIMARY KEY,
    name TEXT,
    widgets TEXT
  )
`);

const defaultColumns = JSON.stringify([
  { id: "status", name: "Status", type: "select", width: 150, options: ["Todo", "In Progress", "Done"] },
  { id: "date", name: "Date", type: "date", width: 150 },
  { id: "priority", name: "Priority", type: "select", width: 150, options: ["Low", "Medium", "High"] },
  { id: "assignee", name: "Assignee", type: "text", width: 150 }
]);

// Seed initial data if empty
const countDbs = db.prepare("SELECT COUNT(*) as count FROM databases").get() as { count: number };
if (countDbs.count === 0) {
  const insertDb = db.prepare("INSERT INTO databases (id, name, icon, columns) VALUES (?, ?, ?, ?)");
  insertDb.run("db-1", "Design Project", "Palette", defaultColumns);
  insertDb.run("db-2", "Engineering Tasks", "Code", defaultColumns);

  const insertPage = db.prepare("INSERT INTO pages (id, title, content, properties, parentId, databaseId, isTemplate) VALUES (?, ?, ?, ?, ?, ?, ?)");
  
  // Seed templates
  insertPage.run("tpl-1", "Bug Report Template", "<h2>Steps to Reproduce</h2><p>1. </p><h2>Expected Behavior</h2><p></p><h2>Actual Behavior</h2><p></p>", JSON.stringify({ status: "Todo", priority: "High" }), null, "db-2", 1);
  insertPage.run("tpl-2", "Design Spec Template", "<h2>Overview</h2><p></p><h2>Requirements</h2><ul><li></li></ul>", JSON.stringify({ status: "Todo", priority: "Medium" }), null, "db-1", 1);

  // Seed pages
  insertPage.run("1", "Color Palette Refinement", "We need to refine the primary and secondary colors for the new brand identity.", JSON.stringify({ status: "In Progress", date: "Oct 12, 2023", priority: "High", assignee: "Alex M." }), null, "db-1", 0);
  insertPage.run("2", "Database Schema UI", "Design the UI for the database schema builder.", JSON.stringify({ status: "Done", date: "Oct 10, 2023", priority: "Medium", assignee: "Lena S." }), null, "db-1", 0);
  insertPage.run("3", "Typography Guide (Inter)", "Create a comprehensive guide for using the Inter font family.", JSON.stringify({ status: "Todo", date: "Oct 08, 2023", priority: "Low", assignee: "Marc K." }), null, "db-1", 0);
  insertPage.run("4", "API Rate Limiting", "Implement rate limiting for the public API.", JSON.stringify({ status: "In Progress", date: "Oct 05, 2023", priority: "High", assignee: "Sarah P." }), null, "db-2", 0);
  insertPage.run("5", "Redis Cache Setup", "Setup Redis cache for faster read operations.", JSON.stringify({ status: "Done", date: "Oct 01, 2023", priority: "Medium", assignee: "Alex M." }), null, "db-2", 0);
  insertPage.run("6", "Primary Colors", "Selected Blue (#135bec) as the primary brand color.", JSON.stringify({ status: "Done", date: "Oct 11, 2023", priority: "High", assignee: "Alex M." }), "1", "db-1", 0);
}

const countDashboards = db.prepare("SELECT COUNT(*) as count FROM dashboards").get() as { count: number };
if (countDashboards.count === 0) {
  const insertDashboard = db.prepare("INSERT INTO dashboards (id, name, widgets) VALUES (?, ?, ?)");
  const defaultWidgets = JSON.stringify([
    { i: 'w1', x: 0, y: 0, w: 2, h: 2, type: 'database', databaseId: 'db-1', viewMode: 'table' },
    { i: 'w2', x: 2, y: 0, w: 1, h: 2, type: 'notes' },
    { i: 'w3', x: 0, y: 2, w: 3, h: 2, type: 'database', databaseId: 'db-2', viewMode: 'board' }
  ]);
  insertDashboard.run("dash-1", "Home Dashboard", defaultWidgets);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes for Databases
  app.get("/api/databases", (req, res) => {
    const databases = db.prepare("SELECT * FROM databases").all();
    res.json(databases);
  });

  app.post("/api/databases", (req, res) => {
    const { name, icon } = req.body;
    const id = uuidv4();
    const insert = db.prepare("INSERT INTO databases (id, name, icon, columns) VALUES (?, ?, ?, ?)");
    insert.run(id, name || "Untitled Database", icon || "Database", defaultColumns);
    
    const newDb = db.prepare("SELECT * FROM databases WHERE id = ?").get(id);
    res.json(newDb);
  });

  app.post("/api/databases/import", (req, res) => {
    const { database, pages } = req.body;
    const dbId = uuidv4();
    
    const insertDb = db.prepare("INSERT INTO databases (id, name, icon, columns) VALUES (?, ?, ?, ?)");
    insertDb.run(dbId, (database.name || "Imported") + " (Imported)", database.icon || "Database", database.columns || "[]");
    
    const insertPage = db.prepare("INSERT INTO pages (id, title, content, properties, parentId, databaseId, isTemplate) VALUES (?, ?, ?, ?, ?, ?, ?)");
    
    const idMap = new Map();
    if (pages && Array.isArray(pages)) {
      for (const page of pages) {
        idMap.set(page.id, uuidv4());
      }
      
      for (const page of pages) {
        const newParentId = page.parentId ? idMap.get(page.parentId) : null;
        insertPage.run(idMap.get(page.id), page.title || "Untitled", page.content || "", page.properties || "{}", newParentId, dbId, page.isTemplate ? 1 : 0);
      }
    }
    
    const newDb = db.prepare("SELECT * FROM databases WHERE id = ?").get(dbId);
    res.json(newDb);
  });

  app.put("/api/databases/:id", (req, res) => {
    const { id } = req.params;
    const { name, icon, columns } = req.body;
    
    const update = db.prepare(`
      UPDATE databases 
      SET name = COALESCE(?, name),
          icon = COALESCE(?, icon),
          columns = COALESCE(?, columns)
      WHERE id = ?
    `);
    
    update.run(name, icon, columns, id);
    const updatedDb = db.prepare("SELECT * FROM databases WHERE id = ?").get(id);
    res.json(updatedDb);
  });

  app.delete("/api/databases/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM pages WHERE databaseId = ?").run(id);
    db.prepare("DELETE FROM databases WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // API Routes for Pages
  app.get("/api/pages", (req, res) => {
    const { databaseId } = req.query;
    if (databaseId) {
      const pages = db.prepare("SELECT * FROM pages WHERE databaseId = ?").all(databaseId);
      res.json(pages);
    } else {
      const pages = db.prepare("SELECT * FROM pages").all();
      res.json(pages);
    }
  });

  app.post("/api/pages", (req, res) => {
    const { title, content, properties, parentId, databaseId, isTemplate } = req.body;
    const id = uuidv4();
    const insert = db.prepare("INSERT INTO pages (id, title, content, properties, parentId, databaseId, isTemplate) VALUES (?, ?, ?, ?, ?, ?, ?)");
    insert.run(id, title || "Untitled", content || "", properties || "{}", parentId || null, databaseId, isTemplate ? 1 : 0);
    
    const newPage = db.prepare("SELECT * FROM pages WHERE id = ?").get(id);
    res.json(newPage);
  });

  app.put("/api/pages/:id", (req, res) => {
    const { id } = req.params;
    const { title, content, properties, parentId, databaseId, isTemplate } = req.body;
    
    const update = db.prepare(`
      UPDATE pages 
      SET title = COALESCE(?, title),
          content = COALESCE(?, content),
          properties = COALESCE(?, properties),
          parentId = COALESCE(?, parentId),
          databaseId = COALESCE(?, databaseId),
          isTemplate = COALESCE(?, isTemplate)
      WHERE id = ?
    `);
    
    update.run(title, content, properties, parentId, databaseId, isTemplate !== undefined ? (isTemplate ? 1 : 0) : null, id);
    const updatedPage = db.prepare("SELECT * FROM pages WHERE id = ?").get(id);
    res.json(updatedPage);
  });

  app.delete("/api/pages/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM pages WHERE parentId = ?").run(id);
    db.prepare("DELETE FROM pages WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // API Routes for Dashboards
  app.get("/api/dashboards", (req, res) => {
    const dashboards = db.prepare("SELECT * FROM dashboards").all();
    res.json(dashboards);
  });

  app.post("/api/dashboards", (req, res) => {
    const { name, widgets } = req.body;
    const id = uuidv4();
    const insert = db.prepare("INSERT INTO dashboards (id, name, widgets) VALUES (?, ?, ?)");
    insert.run(id, name || "Untitled Dashboard", widgets || "[]");
    
    const newDashboard = db.prepare("SELECT * FROM dashboards WHERE id = ?").get(id);
    res.json(newDashboard);
  });

  app.put("/api/dashboards/:id", (req, res) => {
    const { id } = req.params;
    const { name, widgets } = req.body;
    
    const update = db.prepare(`
      UPDATE dashboards 
      SET name = COALESCE(?, name),
          widgets = COALESCE(?, widgets)
      WHERE id = ?
    `);
    
    update.run(name, widgets, id);
    const updatedDashboard = db.prepare("SELECT * FROM dashboards WHERE id = ?").get(id);
    res.json(updatedDashboard);
  });

  app.delete("/api/dashboards/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM dashboards WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/search", (req, res) => {
    const q = req.query.q as string;
    if (!q) return res.json({ databases: [], pages: [], dashboards: [] });

    const searchPattern = `%${q}%`;
    
    const databases = db.prepare("SELECT * FROM databases WHERE name LIKE ?").all(searchPattern);
    const pages = db.prepare("SELECT * FROM pages WHERE title LIKE ? OR content LIKE ?").all(searchPattern, searchPattern);
    const dashboards = db.prepare("SELECT * FROM dashboards WHERE name LIKE ?").all(searchPattern);
    
    res.json({ databases, pages, dashboards });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
