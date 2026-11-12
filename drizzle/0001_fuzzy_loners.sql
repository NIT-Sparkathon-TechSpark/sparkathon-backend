CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"passcode_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organizations_slug_format" CHECK ("organizations"."slug" ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$')
);
--> statement-breakpoint
CREATE TABLE "task_sets" (
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
ALTER TABLE "task_sets" ADD CONSTRAINT "task_sets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_sets_org_idx" ON "task_sets" USING btree ("org_id");