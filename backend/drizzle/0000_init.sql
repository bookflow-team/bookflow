CREATE TYPE "public"."admin_action_type" AS ENUM('APPROVE_BUSINESS', 'REJECT_BUSINESS', 'CANCEL_BOOKING');--> statement-breakpoint
CREATE TYPE "public"."admin_target_type" AS ENUM('BUSINESS', 'BOOKING');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."block_reason" AS ENUM('EXTERNAL_BOOKING', 'UNAVAILABLE');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."exception_type" AS ENUM('CLOSED', 'OPEN');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('CUSTOMER', 'BUSINESS_OWNER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "admin_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"action_type" "admin_action_type" NOT NULL,
	"target_type" "admin_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_actions_reason_nonempty" CHECK (length(trim("admin_actions"."reason")) > 0)
);
--> statement-breakpoint
CREATE TABLE "availability_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"type" "exception_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_exceptions_interval" CHECK ("availability_exceptions"."end_at" > "availability_exceptions"."start_at")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" "booking_status" DEFAULT 'PENDING' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"price_at_booking" numeric(10, 2) NOT NULL,
	"status_reason" text,
	"cancelled_by" "user_role",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_interval" CHECK ("bookings"."end_at" > "bookings"."start_at"),
	CONSTRAINT "bookings_expiry_not_after_start" CHECK ("bookings"."expires_at" <= "bookings"."start_at")
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"timezone" text NOT NULL,
	"approval_status" "approval_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_owner_id_unique" UNIQUE("owner_id"),
	CONSTRAINT "businesses_name_nonempty" CHECK (length(trim("businesses"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "service_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	CONSTRAINT "service_schedules_weekday_range" CHECK ("service_schedules"."weekday" between 1 and 7),
	CONSTRAINT "service_schedules_interval" CHECK ("service_schedules"."end_time" > "service_schedules"."start_time")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"duration_minutes" integer NOT NULL,
	"capacity" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_name_nonempty" CHECK (length(trim("services"."name")) > 0),
	CONSTRAINT "services_price_nonnegative" CHECK ("services"."price" >= 0),
	CONSTRAINT "services_duration_range" CHECK ("services"."duration_minutes" between 1 and 1440),
	CONSTRAINT "services_capacity_positive" CHECK ("services"."capacity" > 0)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"units" integer NOT NULL,
	"reason" "block_reason" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "time_blocks_interval" CHECK ("time_blocks"."end_at" > "time_blocks"."start_at"),
	CONSTRAINT "time_blocks_units_positive" CHECK ("time_blocks"."units" > 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"password_hash" text NOT NULL,
	"role" "user_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_email_lowercase" CHECK ("users"."email" = lower("users"."email")),
	CONSTRAINT "users_name_nonempty" CHECK (length(trim("users"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_exceptions" ADD CONSTRAINT "availability_exceptions_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_schedules" ADD CONSTRAINT "service_schedules_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_actions_admin_idx" ON "admin_actions" USING btree ("admin_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_actions_target_idx" ON "admin_actions" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "availability_exceptions_range_idx" ON "availability_exceptions" USING btree ("service_id","start_at","end_at");--> statement-breakpoint
CREATE INDEX "bookings_service_occupancy_idx" ON "bookings" USING btree ("service_id","start_at","end_at") WHERE "bookings"."status" in ('PENDING', 'CONFIRMED');--> statement-breakpoint
CREATE INDEX "bookings_customer_idx" ON "bookings" USING btree ("customer_id","start_at");--> statement-breakpoint
CREATE INDEX "bookings_status_expiry_idx" ON "bookings" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "businesses_approval_idx" ON "businesses" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX "service_schedules_lookup_idx" ON "service_schedules" USING btree ("service_id","weekday");--> statement-breakpoint
CREATE INDEX "services_business_idx" ON "services" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "time_blocks_range_idx" ON "time_blocks" USING btree ("service_id","start_at","end_at");