import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(process.env.VITE_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "");

export async function importDatabase(database: any, pages: any[], userId: string) {
  const dbId = uuidv4();
  
  const { error: dbError } = await supabase.from("app_databases").insert([
    { id: dbId, name: (database.name || "Imported") + " (Imported)", icon: database.icon || "Database", columns: database.columns || "[]", user_id: userId }
  ]);
  
  if (dbError) throw new Error(dbError.message);
  
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
      user_id: userId
    }));
    
    const { error: pagesError } = await supabase.from("app_pages").insert(pagesToInsert);
    if (pagesError) throw new Error(pagesError.message);
  }
  
  const { data: newDb, error: fetchError } = await supabase.from("app_databases").select("*").eq("id", dbId).eq("user_id", userId).single();
  if (fetchError) throw new Error(fetchError.message);
  return newDb;
}
