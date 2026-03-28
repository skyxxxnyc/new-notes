import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase credentials missing. Please check your .env file.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const authenticate = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  req.user = user;
  next();
};

const defaultColumns = JSON.stringify([
  { id: "title", name: "Title", type: "text", width: 200 },
  { id: "status", name: "Status", type: "select", width: 150, options: ["Todo", "In Progress", "Done"] }
]);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Apply authentication middleware to all /api routes
  app.use("/api", authenticate);

  // API Routes for Databases
  app.get("/api/databases", async (req: any, res) => {
    const { data, error } = await supabase.from("app_databases").select("*").eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/databases", async (req: any, res) => {
    const { name, icon } = req.body;
    const id = uuidv4();
    const { data, error } = await supabase.from("app_databases").insert([
      { id, name: name || "Untitled Database", icon: icon || "Database", columns: defaultColumns, user_id: req.user.id }
    ]).select().single();
    
    if (error) return res.status(500).json({ error: error.message });

    // Automatically add a row
    const pageId = uuidv4();
    const defaultProperties = JSON.stringify({ status: "Todo" });
    const { error: pageError } = await supabase.from("app_pages").insert([
      { id: pageId, title: "New Task", content: "", properties: defaultProperties, parentId: null, databaseId: id, isTemplate: 0, user_id: req.user.id }
    ]);
    if (pageError) console.error("Failed to insert default page:", pageError);
    
    const versionId = uuidv4();
    const { error: versionError } = await supabase.from("app_page_versions").insert([
      { id: versionId, pageId: pageId, title: "New Task", content: "", properties: defaultProperties, createdAt: new Date().toISOString(), user_id: req.user.id }
    ]);
    if (versionError) console.error("Failed to insert default page version:", versionError);

    res.json(data);
  });

  app.post("/api/databases/import", async (req: any, res) => {
    const { database, pages } = req.body;
    const dbId = uuidv4();
    
    const { error: dbError } = await supabase.from("app_databases").insert([
      { id: dbId, name: (database.name || "Imported") + " (Imported)", icon: database.icon || "Database", columns: database.columns || "[]", user_id: req.user.id }
    ]);
    
    if (dbError) return res.status(500).json({ error: dbError.message });
    
    if (pages && Array.isArray(pages)) {
      const idMap = new Map();
      for (const page of pages) {
        idMap.set(page.id, uuidv4());
      }
      
      const pagesToInsert = pages.map(page => ({
        id: idMap.get(page.id),
        title: page.title || "Untitled",
        content: page.content || "",
        properties: page.properties || "{}",
        parentId: page.parentId ? idMap.get(page.parentId) : null,
        databaseId: dbId,
        isTemplate: page.isTemplate ? 1 : 0,
        user_id: req.user.id
      }));
      
      const { error: pagesError } = await supabase.from("app_pages").insert(pagesToInsert);
      if (pagesError) return res.status(500).json({ error: pagesError.message });
    }
    
    const { data: newDb, error: fetchError } = await supabase.from("app_databases").select("*").eq("id", dbId).eq("user_id", req.user.id).single();
    if (fetchError) return res.status(500).json({ error: fetchError.message });
    res.json(newDb);
  });

  app.put("/api/databases/:id", async (req: any, res) => {
    const { id } = req.params;
    const { name, icon, columns } = req.body;
    
    const { data, error } = await supabase.from("app_databases")
      .update({ name, icon, columns })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.delete("/api/databases/:id", async (req: any, res) => {
    const { id } = req.params;
    await supabase.from("app_pages").delete().eq("databaseId", id).eq("user_id", req.user.id);
    const { error } = await supabase.from("app_databases").delete().eq("id", id).eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // API Routes for Pages
  app.get("/api/pages", async (req: any, res) => {
    const { databaseId, isNote } = req.query;
    let query = supabase.from("app_pages").select("*").eq("user_id", req.user.id);
    if (databaseId) {
      query = query.eq("databaseId", databaseId);
    } else if (isNote === 'true') {
      query = query.is("databaseId", null);
    }
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/pages", async (req: any, res) => {
    const { title, content, properties, parentId, databaseId, isTemplate } = req.body;
    const id = uuidv4();
    const { data: newPage, error } = await supabase.from("app_pages").insert([
      { id, title: title || "Untitled", content: content || "", properties: properties || "{}", parentId: parentId || null, databaseId, isTemplate: isTemplate ? 1 : 0, user_id: req.user.id }
    ]).select().single();
    
    if (error) return res.status(500).json({ error: error.message });
    
    const versionId = uuidv4();
    await supabase.from("app_page_versions").insert([
      { id: versionId, pageId: id, title: newPage.title, content: newPage.content, properties: newPage.properties, createdAt: new Date().toISOString(), user_id: req.user.id }
    ]);

    res.json(newPage);
  });

  app.put("/api/pages/:id", async (req: any, res) => {
    const { id } = req.params;
    const { title, content, properties, parentId, databaseId, isTemplate } = req.body;
    
    const { data: updatedPage, error } = await supabase.from("app_pages")
      .update({ title, content, properties, parentId, databaseId, isTemplate: isTemplate !== undefined ? (isTemplate ? 1 : 0) : undefined })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });

    const versionId = uuidv4();
    await supabase.from("app_page_versions").insert([
      { id: versionId, pageId: id, title: updatedPage.title, content: updatedPage.content, properties: updatedPage.properties, createdAt: new Date().toISOString(), user_id: req.user.id }
    ]);

    res.json(updatedPage);
  });

  app.get("/api/pages/:id/versions", async (req: any, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from("app_page_versions").select("*").eq("pageId", id).eq("user_id", req.user.id).order("createdAt", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.delete("/api/pages/:id", async (req: any, res) => {
    const { id } = req.params;
    await supabase.from("app_page_versions").delete().eq("pageId", id).eq("user_id", req.user.id);
    await supabase.from("app_pages").delete().eq("parentId", id).eq("user_id", req.user.id);
    const { error } = await supabase.from("app_pages").delete().eq("id", id).eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // API Routes for Dashboards
  app.get("/api/dashboards", async (req: any, res) => {
    const { data, error } = await supabase.from("app_dashboards").select("*").eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/dashboards", async (req: any, res) => {
    const { name, widgets } = req.body;
    const id = uuidv4();
    const { data, error } = await supabase.from("app_dashboards").insert([
      { id, name: name || "Untitled Dashboard", widgets: widgets || "[]", user_id: req.user.id }
    ]).select().single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.put("/api/dashboards/:id", async (req: any, res) => {
    const { id } = req.params;
    const { name, widgets } = req.body;
    
    const { data, error } = await supabase.from("app_dashboards")
      .update({ name, widgets })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.delete("/api/dashboards/:id", async (req: any, res) => {
    const { id } = req.params;
    const { error } = await supabase.from("app_dashboards").delete().eq("id", id).eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/search", async (req: any, res) => {
    const q = req.query.q as string;
    if (!q) return res.json({ databases: [], pages: [], dashboards: [] });

    const searchPattern = `%${q}%`;
    
    const [dbRes, pageRes, dashRes] = await Promise.all([
      supabase.from("app_databases").select("*").eq("user_id", req.user.id).ilike("name", searchPattern),
      supabase.from("app_pages").select("*").eq("user_id", req.user.id).or(`title.ilike.${searchPattern},content.ilike.${searchPattern}`),
      supabase.from("app_dashboards").select("*").eq("user_id", req.user.id).ilike("name", searchPattern)
    ]);
    
    res.json({ 
      databases: dbRes.data || [], 
      pages: pageRes.data || [], 
      dashboards: dashRes.data || [] 
    });
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
