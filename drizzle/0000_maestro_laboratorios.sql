CREATE TABLE "module_vademecum_laboratories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tax_id" text,
	"registration_number" text,
	"country" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
