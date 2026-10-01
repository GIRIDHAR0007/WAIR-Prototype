import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEMO_WARDROBE, demoImageSvg } from "@/data/demo-wardrobe";

async function main() {
  const client = createClient({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, password TEXT NOT NULL, gender TEXT NOT NULL, face_shape TEXT, body_type TEXT, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS wardrobe_items (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, image_key TEXT NOT NULL, category TEXT NOT NULL, subcategory TEXT NOT NULL, colors TEXT NOT NULL DEFAULT '[]', fabric TEXT, seasons TEXT NOT NULL DEFAULT '[]', formality INTEGER NOT NULL DEFAULT 5, is_traditional INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS outfit_rounds (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, occasion TEXT NOT NULL, color_mode TEXT, preferred_colors TEXT NOT NULL DEFAULT '[]', created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS outfits (id TEXT PRIMARY KEY, round_id TEXT NOT NULL REFERENCES outfit_rounds(id) ON DELETE CASCADE, explanation TEXT NOT NULL, score REAL NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS outfit_items (outfit_id TEXT NOT NULL REFERENCES outfits(id) ON DELETE CASCADE, wardrobe_item_id TEXT NOT NULL REFERENCES wardrobe_items(id) ON DELETE CASCADE, slot TEXT NOT NULL, PRIMARY KEY(outfit_id, wardrobe_item_id))`,
    `CREATE TABLE IF NOT EXISTS feedback (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, outfit_id TEXT NOT NULL REFERENCES outfits(id) ON DELETE CASCADE, liked INTEGER NOT NULL, created_at INTEGER NOT NULL, UNIQUE(user_id, outfit_id))`,
    `CREATE TABLE IF NOT EXISTS preference_weights (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL, value TEXT NOT NULL, weight REAL NOT NULL DEFAULT 0, UNIQUE(user_id, kind, value))`,
  ];
  await client.batch(statements.map(sql => ({ sql, args: [] })), "write");
  const now = Date.now();
  await client.execute({ sql: `INSERT INTO users (id,name,password,gender,created_at) VALUES (?,?,?,?,?) ON CONFLICT(name) DO NOTHING`, args: ["demo-wair-user", "Avery", "wair-demo", "OTHER", now] });
  const demoUser = await client.execute({ sql: `SELECT id FROM users WHERE name = ? LIMIT 1`, args: ["Avery"] });
  const demoUserId = String(demoUser.rows[0]?.id ?? "demo-wair-user");
  const directory = path.join(process.cwd(), "public", "placeholders");
  await mkdir(directory, { recursive: true });
  for (let i = 0; i < DEMO_WARDROBE.length; i++) {
    const { category, subcategory, color, hex, formality, traditional } = DEMO_WARDROBE[i]!;
    const id = `sample-item-${i + 1}`;
    const image = `sample-${String(i + 1).padStart(2,"0")}.svg`;
    await writeFile(path.join(directory, image), demoImageSvg(hex, subcategory));
    await client.execute({ sql: `INSERT INTO wardrobe_items (id,user_id,image_key,category,subcategory,colors,fabric,seasons,formality,is_traditional,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`, args: [id,demoUserId,`/placeholders/${image}`,category,subcategory,JSON.stringify([{name:color,hex}]),"Demo sample",JSON.stringify(["All season"]),formality,traditional ? 1 : 0,now,now] });
  }
  console.log(`Seeded ${DEMO_WARDROBE.length} sample garments for Avery (password: wair-demo).`);
  await client.close();
}
main().catch(error => { console.error(error); process.exitCode = 1; });
