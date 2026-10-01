import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const client = createClient({ url });
export const db = drizzle(client);
