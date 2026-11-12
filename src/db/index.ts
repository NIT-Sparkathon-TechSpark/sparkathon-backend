import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
// Relative import so scripts run through tsx (which doesn't resolve the @/ alias) can use this file.
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set (see .env.example)");
}

// neon-http: stateless, no db.transaction(). Use single statements or db.batch([...]).
export const db = drizzle(neon(url), { schema });
