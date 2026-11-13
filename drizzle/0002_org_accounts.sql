-- Organization accounts (docs/plan/org-accounts.md). Written to be safe to run on a database
-- that already has these tables: the development branch got them from an earlier, unmerged
-- version of this migration. On a database without them it does exactly what drizzle-kit generated.
CREATE TABLE IF NOT EXISTS "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"passcode_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organizations_slug_format" CHECK ("organizations"."slug" ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$')
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_sets" (
	"slug" text PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"share_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_sets_share_token_unique" UNIQUE("share_token"),
	CONSTRAINT "task_sets_slug_format" CHECK ("task_sets"."slug" ~ '^o-[a-z0-9]{10}$')
);
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_sets_org_id_organizations_id_fk') THEN
		ALTER TABLE "task_sets" ADD CONSTRAINT "task_sets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_sets_org_idx" ON "task_sets" USING btree ("org_id");
