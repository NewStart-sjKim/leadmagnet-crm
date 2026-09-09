CREATE TYPE "public"."campaign_status" AS ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('INSTAGRAM', 'X', 'YOUTUBE', 'THREADS');--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"operator_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "campaign_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "distribution_links" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"form_id" text NOT NULL,
	"channel" "channel" NOT NULL,
	"code" text NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "distribution_links_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"campaign_id" text NOT NULL,
	"template_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"html_snapshot" text NOT NULL,
	"success_message" text DEFAULT '신청이 완료되었습니다. 감사합니다!' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "html_templates" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"operator_id" text NOT NULL,
	"name" text NOT NULL,
	"file_name" text NOT NULL,
	"html" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"field_names" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"form_id" text NOT NULL,
	"link_id" text,
	"visitor_id" text,
	"name" text,
	"email" text,
	"phone" text,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operators_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"operator_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"form_id" text NOT NULL,
	"link_id" text,
	"visitor_id" text NOT NULL,
	"user_agent" text,
	"referer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_links" ADD CONSTRAINT "distribution_links_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_template_id_html_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."html_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "html_templates" ADD CONSTRAINT "html_templates_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_link_id_distribution_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."distribution_links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_link_id_distribution_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."distribution_links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaigns_operator_idx" ON "campaigns" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "distribution_links_form_idx" ON "distribution_links" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "forms_campaign_idx" ON "forms" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "html_templates_operator_idx" ON "html_templates" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "leads_form_created_idx" ON "leads" USING btree ("form_id","created_at");--> statement-breakpoint
CREATE INDEX "leads_link_idx" ON "leads" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "leads_form_visitor_idx" ON "leads" USING btree ("form_id","visitor_id");--> statement-breakpoint
CREATE INDEX "sessions_operator_idx" ON "sessions" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "visits_form_created_idx" ON "visits" USING btree ("form_id","created_at");--> statement-breakpoint
CREATE INDEX "visits_link_idx" ON "visits" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "visits_form_visitor_idx" ON "visits" USING btree ("form_id","visitor_id");