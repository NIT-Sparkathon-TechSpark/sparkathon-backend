import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set (see .env.example)");
}

// neon-http: stateless, no db.transaction(). Use single statements or db.batch([...]).
// P2: pass `{ schema }` here once src/db/schema.ts exists.
export const db = drizzle(neon(url));
