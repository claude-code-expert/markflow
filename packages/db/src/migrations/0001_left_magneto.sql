CREATE TABLE "embed_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"label" varchar(100) NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"scope" varchar(20) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "embed_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "theme_preset" varchar(20) DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "theme_css" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "embed_tokens" ADD CONSTRAINT "embed_tokens_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embed_tokens" ADD CONSTRAINT "embed_tokens_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_embed_tokens_workspace" ON "embed_tokens" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_join_requests_unique_pending" ON "join_requests" USING btree ("workspace_id","user_id") WHERE "join_requests"."status" = 'pending';