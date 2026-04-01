import express from "express";
import { createServer as createViteServer } from "vite";
import { v4 as uuidv4 } from "uuid";
import { generateAutofillValue } from "./serverAI";
import "dotenv/config";
import path from "path";
import notionAuthRoutes from "./server/notionAuth";
import { supabase } from "./server/supabase";

const authenticate = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid token' });

    req.user = user;
    next();
  } catch (err: any) {
    console.error('Authentication error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
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
  app.use("/api", (req, res, next) => {
    if (req.path.startsWith('/auth/notion/callback')) {
      next();
    } else {
      authenticate(req, res, next);
    }
  });

  // Notion Auth Routes
  app.use("/api/auth/notion", notionAuthRoutes);

  const mapDatabase = (db: any) => {
    let icon = db.icon;
    let isFavorite = false;
    if (icon && icon.includes("|isFavorite:")) {
      const parts = icon.split("|isFavorite:");
      icon = parts[0];
      isFavorite = parts[1] === "true";
    }
    return { ...db, icon, isFavorite };
  };

  const mapPage = (page: any) => {
    let isFavorite = false;
    let isShared = false;
    let properties = page.properties;
    try {
      const propsObj = JSON.parse(properties || "{}");
      if (propsObj._isFavorite !== undefined) {
        isFavorite = propsObj._isFavorite;
        delete propsObj._isFavorite;
      }
      if (propsObj.isShared !== undefined) {
        isShared = propsObj.isShared;
      }
      properties = JSON.stringify(propsObj);
    } catch (e) {}
    return { ...page, properties, isFavorite, isShared };
  };

  // API Routes for Databases
  app.get("/api/databases", async (req: any, res) => {
    const { data, error } = await supabase.from("app_databases").select("*").eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data.map(mapDatabase));
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

    res.json(mapDatabase(data));
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
    res.json(mapDatabase(newDb));
  });

  app.put("/api/databases/:id", async (req: any, res) => {
    const { id } = req.params;
    const { name, icon, columns, isFavorite } = req.body;
    
    const { data: existing, error: fetchError } = await supabase.from("app_databases").select("*").eq("id", id).eq("user_id", req.user.id).single();
    if (fetchError) return res.status(500).json({ error: fetchError.message });

    let finalIcon = icon !== undefined ? icon : existing.icon;
    let finalIsFavorite = isFavorite !== undefined ? isFavorite : false;
    
    if (isFavorite === undefined && existing.icon && existing.icon.includes("|isFavorite:")) {
      finalIsFavorite = existing.icon.split("|isFavorite:")[1] === "true";
    }
    
    if (finalIcon && finalIcon.includes("|isFavorite:")) {
      finalIcon = finalIcon.split("|isFavorite:")[0];
    }
    
    const dbIcon = `${finalIcon}|isFavorite:${finalIsFavorite}`;

    const { data, error } = await supabase.from("app_databases")
      .update({ name, icon: dbIcon, columns })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(mapDatabase(data));
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
    const { databaseId, isNote, parentId } = req.query;
    let query = supabase.from("app_pages").select("*").eq("user_id", req.user.id);
    if (databaseId) {
      query = query.eq("databaseId", databaseId);
    } else if (parentId) {
      query = query.eq("parentId", parentId);
    } else if (isNote === 'true') {
      query = query.is("databaseId", null);
    }
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data.map(mapPage));
  });

  app.get("/api/pages/:id", async (req: any, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from("app_pages").select("*").eq("id", id).eq("user_id", req.user.id).single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(mapPage(data));
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

    // Handle AI Autofill on_create
    if (databaseId) {
      try {
        const { data: db } = await supabase.from("app_databases").select("columns, name").eq("id", databaseId).single();
        if (db && db.columns) {
          const columns = JSON.parse(db.columns);
          const propsObj = JSON.parse(newPage.properties || "{}");
          let updatedProps = { ...propsObj };
          let hasUpdates = false;

          for (const col of columns) {
            if (col.ai_autofill && col.ai_autofill.trigger === 'on_create') {
              const context = {
                title: newPage.title,
                content: newPage.content,
                ...propsObj
              };
              const value = await generateAutofillValue(col.ai_autofill.prompt, context);
              if (value) {
                updatedProps[col.id] = value;
                hasUpdates = true;
              }
            }
          }

          if (hasUpdates) {
            const finalProps = JSON.stringify(updatedProps);
            await supabase.from("app_pages")
              .update({ properties: finalProps })
              .eq("id", newPage.id)
              .eq("user_id", req.user.id);
            
            // Update newPage object for the response
            newPage.properties = finalProps;
          }
        }
      } catch (e) {
        console.error("Error processing AI autofill on create:", e);
      }
    }

    res.json(mapPage(newPage));
  });

  app.post("/api/pages/:id/duplicate", async (req: any, res) => {
    const { id } = req.params;
    const { data: existing, error: fetchError } = await supabase.from("app_pages").select("*").eq("id", id).eq("user_id", req.user.id).single();
    if (fetchError) return res.status(500).json({ error: fetchError.message });

    const newId = uuidv4();
    const { data: newPage, error } = await supabase.from("app_pages").insert([
      { 
        id: newId, 
        title: existing.title + " (Copy)", 
        content: existing.content, 
        properties: existing.properties, 
        parentId: existing.parentId, 
        databaseId: existing.databaseId, 
        isTemplate: existing.isTemplate, 
        user_id: req.user.id 
      }
    ]).select().single();

    if (error) return res.status(500).json({ error: error.message });

    const versionId = uuidv4();
    await supabase.from("app_page_versions").insert([
      { id: versionId, pageId: newId, title: newPage.title, content: newPage.content, properties: newPage.properties, createdAt: new Date().toISOString(), user_id: req.user.id }
    ]);

    res.json(mapPage(newPage));
  });

  app.put("/api/pages/:id", async (req: any, res) => {
    const { id } = req.params;
    const { title, content, properties, parentId, databaseId, isTemplate, isFavorite } = req.body;
    
    // Fetch existing
    const { data: existing, error: fetchError } = await supabase.from("app_pages").select("*").eq("id", id).eq("user_id", req.user.id).single();
    if (fetchError) return res.status(500).json({ error: fetchError.message });

    let finalProperties = properties !== undefined ? properties : existing.properties;
    let finalIsFavorite = isFavorite !== undefined ? isFavorite : false;
    
    if (isFavorite === undefined) {
      try {
        const existingProps = JSON.parse(existing.properties || "{}");
        finalIsFavorite = existingProps._isFavorite || false;
      } catch (e) {}
    }

    try {
      const propsObj = JSON.parse(finalProperties || "{}");
      propsObj._isFavorite = finalIsFavorite;
      finalProperties = JSON.stringify(propsObj);
    } catch (e) {}

    const { data: updatedPage, error } = await supabase.from("app_pages")
      .update({ title, content, properties: finalProperties, parentId, databaseId, isTemplate: isTemplate !== undefined ? (isTemplate ? 1 : 0) : undefined })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });

    // Handle AI Autofill on_update
    if (updatedPage.databaseId) {
      try {
        const { data: db } = await supabase.from("app_databases").select("columns").eq("id", updatedPage.databaseId).single();
        if (db && db.columns) {
          const columns = JSON.parse(db.columns);
          const propsObj = JSON.parse(updatedPage.properties || "{}");
          let updatedProps = { ...propsObj };
          let hasUpdates = false;

          // Check if properties, content, or title changed
          const titleChanged = title !== undefined && title !== existing.title;
          const contentChanged = content !== undefined && content !== existing.content;
          
          let changedProps: string[] = [];
          if (titleChanged) changedProps.push('title');
          if (contentChanged) changedProps.push('content');
          
          if (properties !== undefined && properties !== existing.properties) {
            const oldProps = JSON.parse(existing.properties || "{}");
            const newProps = JSON.parse(properties || "{}");
            for (const key in newProps) {
              if (newProps[key] !== oldProps[key]) {
                changedProps.push(key);
              }
            }
          }

          if (changedProps.length > 0) {
            const autofillCols = columns.filter((c: any) => c.ai_autofill && c.ai_autofill.trigger === 'on_update');
            
            // Filter out columns that were just updated to prevent infinite loops
            const updatedPropsInRequest = properties ? JSON.parse(properties) : {};
            const colsToTrigger = autofillCols.filter((col: any) => {
              if (updatedPropsInRequest.hasOwnProperty(col.id)) return false;
              
              const sources = col.ai_autofill.source_properties || [];
              if (sources.length === 0) return true; // Trigger on any change if no sources specified
              
              return changedProps.some(prop => sources.includes(prop));
            });

            for (const col of colsToTrigger) {
              const context = {
                title: updatedPage.title,
                content: updatedPage.content,
                ...propsObj
              };
              const value = await generateAutofillValue(col.ai_autofill.prompt, context);
              if (value) {
                updatedProps[col.id] = value;
                hasUpdates = true;
              }
            }

            if (hasUpdates) {
              const finalProps = JSON.stringify(updatedProps);
              await supabase.from("app_pages")
                .update({ properties: finalProps })
                .eq("id", id)
                .eq("user_id", req.user.id);
              
              // Update updatedPage object for the response
              updatedPage.properties = finalProps;
            }
          }
        }
      } catch (e) {
        console.error("Error processing AI autofill on update:", e);
      }
    }

    const versionId = uuidv4();
    await supabase.from("app_page_versions").insert([
      { id: versionId, pageId: id, title: updatedPage.title, content: updatedPage.content, properties: updatedPage.properties, createdAt: new Date().toISOString(), user_id: req.user.id }
    ]);

    res.json(mapPage(updatedPage));
  });

  app.get("/api/pages/:id/ancestors", async (req: any, res) => {
    const { id } = req.params;
    const ancestors = [];
    let currentId = id;

    while (currentId) {
      const { data, error } = await supabase.from("app_pages").select("id, title, parentId").eq("id", currentId).eq("user_id", req.user.id).single();
      if (error || !data) break;
      ancestors.unshift({ id: data.id, title: data.title });
      currentId = data.parentId;
    }
    res.json(ancestors);
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
      databases: (dbRes.data || []).map(mapDatabase), 
      pages: (pageRes.data || []).map(mapPage), 
      dashboards: dashRes.data || [] 
    });
  });

  // API Routes for Agents
  app.get("/api/agents", async (req: any, res) => {
    const { data, error } = await supabase.from("app_agents").select("*").eq("user_id", req.user.id);
    if (error) {
      // If table doesn't exist, return empty array for now
      if (
        error.code === 'PGRST116' || 
        error.message.includes('relation "app_agents" does not exist') ||
        error.message.includes('Could not find the table') ||
        error.message.includes('schema cache')
      ) {
        return res.json([]);
      }
      return res.status(500).json({ error: error.message });
    }
    res.json(data || []);
  });

  app.post("/api/agents", async (req: any, res) => {
    const { name, description, icon, instructions, knowledge_sources, tools } = req.body;
    const id = uuidv4();
    const { data, error } = await supabase.from("app_agents").insert([
      { 
        id, 
        name: name || "New Agent", 
        description: description || "", 
        icon: icon || "Bot", 
        instructions: instructions || "", 
        knowledge_sources: JSON.stringify(knowledge_sources || []), 
        tools: JSON.stringify(tools || []),
        user_id: req.user.id 
      }
    ]).select().single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.put("/api/agents/:id", async (req: any, res) => {
    const { id } = req.params;
    const { name, description, icon, instructions, knowledge_sources, tools } = req.body;
    
    const { data, error } = await supabase.from("app_agents")
      .update({ 
        name, 
        description, 
        icon, 
        instructions, 
        knowledge_sources: JSON.stringify(knowledge_sources || []), 
        tools: JSON.stringify(tools || []) 
      })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.delete("/api/agents/:id", async (req: any, res) => {
    const { id } = req.params;
    const { error } = await supabase.from("app_agents").delete().eq("id", id).eq("user_id", req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // API Routes for Agent Chats
  app.get("/api/agents/:id/chat", async (req: any, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from("app_agent_chats")
      .select("messages")
      .eq("agent_id", id)
      .eq("user_id", req.user.id)
      .single();
    
    if (error) {
      if (
        error.code === 'PGRST116' || 
        error.message.includes('relation "app_agent_chats" does not exist') ||
        error.message.includes('Could not find the table') ||
        error.message.includes('schema cache')
      ) {
        return res.json({ messages: [] });
      }
      return res.status(500).json({ error: error.message });
    }
    
    let messages = [];
    if (data && data.messages) {
      messages = typeof data.messages === 'string' ? JSON.parse(data.messages) : data.messages;
    }
    res.json({ messages });
  });

  app.post("/api/agents/:id/chat", async (req: any, res) => {
    const { id } = req.params;
    const { messages } = req.body;
    
    // Upsert the chat messages
    const { data, error } = await supabase.from("app_agent_chats")
      .upsert({
        agent_id: id,
        user_id: req.user.id,
        messages: JSON.stringify(messages || []),
        updated_at: new Date().toISOString()
      }, { onConflict: 'agent_id,user_id' })
      .select()
      .single();
      
    if (error) {
      // If table doesn't exist, we just ignore the save for now to prevent crashes
      if (
        error.code === 'PGRST116' || 
        error.message.includes('relation "app_agent_chats" does not exist') ||
        error.message.includes('Could not find the table') ||
        error.message.includes('schema cache')
      ) {
        return res.json({ success: true, ignored: true });
      }
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true });
  });

  app.delete("/api/agents/:id/chat", async (req: any, res) => {
    const { id } = req.params;
    const { error } = await supabase.from("app_agent_chats")
      .delete()
      .eq("agent_id", id)
      .eq("user_id", req.user.id);
      
    if (error) {
      if (
        error.code === 'PGRST116' || 
        error.message.includes('relation "app_agent_chats" does not exist') ||
        error.message.includes('Could not find the table') ||
        error.message.includes('schema cache')
      ) {
        return res.json({ success: true });
      }
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
