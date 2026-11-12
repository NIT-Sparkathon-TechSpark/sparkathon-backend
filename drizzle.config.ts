import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Direct (unpooled) connection, as required for migrations.
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
});
