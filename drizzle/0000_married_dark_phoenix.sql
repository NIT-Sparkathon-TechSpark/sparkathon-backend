CREATE TABLE "responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"task_id" text NOT NULL,
	"position" smallint NOT NULL,
	"rationale_shown" boolean NOT NULL,
	"first_answer" smallint,
	"first_confidence" smallint,
	"final_answer" smallint,
	"final_confidence" smallint,
	"ms_first" integer,
	"ms_final" integer,
	"first_at" timestamp with time zone,
	"final_at" timestamp with time zone,
	CONSTRAINT "responses_session_task_unique" UNIQUE("session_id","task_id"),
	CONSTRAINT "responses_session_position_unique" UNIQUE("session_id","position"),
	CONSTRAINT "responses_first_answer_range" CHECK ("responses"."first_answer" is null or "responses"."first_answer" between 0 and 3),
	CONSTRAINT "responses_final_answer_range" CHECK ("responses"."final_answer" is null or "responses"."final_answer" between 0 and 3),
	CONSTRAINT "responses_first_confidence_range" CHECK ("responses"."first_confidence" is null or "responses"."first_confidence" between 0 and 100),
	CONSTRAINT "responses_final_confidence_range" CHECK ("responses"."final_confidence" is null or "responses"."final_confidence" between 0 and 100),
	CONSTRAINT "responses_final_after_first" CHECK ("responses"."final_answer" is null or "responses"."first_answer" is not null)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"set_slug" text NOT NULL,
	"nickname" text NOT NULL,
	"label" text DEFAULT 'pilot' NOT NULL,
	"self_rated_expertise" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "sessions_label_valid" CHECK ("sessions"."label" in ('pilot', 'practice', 'judge', 'seeded')),
	CONSTRAINT "sessions_expertise_range" CHECK ("sessions"."self_rated_expertise" is null or "sessions"."self_rated_expertise" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"set_slug" text NOT NULL,
	"position" smallint NOT NULL,
	"category" text NOT NULL,
	"difficulty" smallint NOT NULL,
	"prompt" text NOT NULL,
	"context" text,
	"options" jsonb NOT NULL,
	"correct_index" smallint NOT NULL,
	"advice_index" smallint NOT NULL,
	"advice_confidence" smallint,
	"advice_explanation" text NOT NULL,
	"advice_source" text NOT NULL,
	"advice_model" text,
	"verified_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_set_position_unique" UNIQUE("set_slug","position"),
	CONSTRAINT "tasks_difficulty_range" CHECK ("tasks"."difficulty" between 1 and 3),
	CONSTRAINT "tasks_correct_index_range" CHECK ("tasks"."correct_index" between 0 and 3),
	CONSTRAINT "tasks_advice_index_range" CHECK ("tasks"."advice_index" between 0 and 3),
	CONSTRAINT "tasks_advice_confidence_range" CHECK ("tasks"."advice_confidence" is null or "tasks"."advice_confidence" between 0 and 100),
	CONSTRAINT "tasks_advice_source_valid" CHECK ("tasks"."advice_source" in ('recorded', 'seeded'))
);
--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "responses_task_idx" ON "responses" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "sessions_set_label_idx" ON "sessions" USING btree ("set_slug","label");--> statement-breakpoint
CREATE INDEX "tasks_set_idx" ON "tasks" USING btree ("set_slug");