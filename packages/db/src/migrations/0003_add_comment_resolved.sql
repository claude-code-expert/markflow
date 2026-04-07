ALTER TABLE "comments" ADD COLUMN "resolved" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "resolved_by" bigint REFERENCES "users"("id");
