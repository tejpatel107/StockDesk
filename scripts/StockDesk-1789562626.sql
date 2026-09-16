-- User records table
CREATE TABLE IF NOT EXISTS "user" (
	"user_id" uuid NOT NULL UNIQUE,
	"user_name" varchar(50) NOT NULL,
	"user_email" varchar(100) NOT NULL UNIQUE,
	"user_password" text NOT NULL,
	"user_role" varchar(10) NOT NULL,
	"flag_deleted" boolean NOT NULL,
	"history_id" uuid,
	"change_log_id" uuid NOT NULL,
	PRIMARY KEY ("user_id")
);
-- table for different categories of products
CREATE TABLE IF NOT EXISTS "category" (
	"category_id" uuid NOT NULL UNIQUE,
	"category_name" varchar(100) NOT NULL UNIQUE,
	"category_description" text NOT NULL,
	"flag_deleted" boolean NOT NULL,
	"history_id" uuid,
	"change_log_id" uuid NOT NULL,
	PRIMARY KEY ("category_id")
);
CREATE TABLE IF NOT EXISTS "product" (
	"product_id" uuid NOT NULL UNIQUE,
	"product_name" varchar(100) NOT NULL,
	"product_sku" varchar(100) NOT NULL UNIQUE,
	"product_price" numeric(10,0) NOT NULL,
	"product_stock_quantity" integer NOT NULL,
	"category_id" uuid NOT NULL, 
	"flag_deleted" boolean NOT NULL,
	"history_id" uuid,
	"change_log_id" uuid NOT NULL,
	PRIMARY KEY ("product_id")
);
CREATE TABLE IF NOT EXISTS "supplier" (
	"supplier_id" uuid NOT NULL UNIQUE,
	"supplier_name" varchar(100) NOT NULL UNIQUE,
	"supplier_email" varchar(100) NOT NULL UNIQUE,
	"supplier_phone_number" varchar(25) UNIQUE,
	"flag_deleted" boolean NOT NULL,
	"history_id" uuid,
	"change_log_id" uuid NOT NULL,
	PRIMARY KEY ("supplier_id")
);
CREATE TABLE IF NOT EXISTS "customer" (
	"customer_id" uuid NOT NULL UNIQUE,
	"customer_phone_number" varchar(25) NOT NULL UNIQUE,
	"customer_address" text,
	"user_id" uuid NOT NULL UNIQUE,
	"flag_deleted" boolean NOT NULL,
	"history_id" uuid,
	"change_log_id" uuid NOT NULL,
	PRIMARY KEY ("customer_id")
);
CREATE TABLE IF NOT EXISTS "order" (
	"order_id" uuid NOT NULL UNIQUE,
	"customer_id" uuid NOT NULL,
	"order_date" date NOT NULL,
	"order_created_at" time without time zone NOT NULL,
	"order_status" varchar(15) NOT NULL,
	"order_total_amount" numeric(10,0) NOT NULL,
	"flag_deleted" boolean NOT NULL,
	"history_id" uuid,
	"change_log_id" uuid NOT NULL,
	PRIMARY KEY ("order_id")
);
CREATE TABLE IF NOT EXISTS "order_item" (
	"order_item_id" uuid NOT NULL UNIQUE,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"order_item_quantity" integer NOT NULL,
	"order_item_unit_price_at_time_of_order" numeric(10,0) NOT NULL,
	"order_item_line_total" numeric(10,0) NOT NULL,
	PRIMARY KEY ("order_item_id")
);
CREATE TABLE IF NOT EXISTS "product_supplier" (
	"product_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	PRIMARY KEY ("product_id", "supplier_id")
);
CREATE TABLE IF NOT EXISTS "change_log" (
	"change_log_id" uuid NOT NULL UNIQUE,
	"user_id" uuid NOT NULL,
	"change_log_timestamp" timestamp with time zone NOT NULL,
	PRIMARY KEY ("change_log_id")
);
ALTER TABLE "user" ADD CONSTRAINT "user_fk7" FOREIGN KEY ("change_log_id") REFERENCES "change_log"("change_log_id");
ALTER TABLE "category" ADD CONSTRAINT "category_fk5" FOREIGN KEY ("change_log_id") REFERENCES "change_log"("change_log_id");
ALTER TABLE "product" ADD CONSTRAINT "product_fk5" FOREIGN KEY ("category_id") REFERENCES "category"("category_id");
ALTER TABLE "product" ADD CONSTRAINT "product_fk8" FOREIGN KEY ("change_log_id") REFERENCES "change_log"("change_log_id");
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_fk6" FOREIGN KEY ("change_log_id") REFERENCES "change_log"("change_log_id");
ALTER TABLE "customer" ADD CONSTRAINT "customer_fk3" FOREIGN KEY ("user_id") REFERENCES "user"("user_id");
ALTER TABLE "customer" ADD CONSTRAINT "customer_fk6" FOREIGN KEY ("change_log_id") REFERENCES "change_log"("change_log_id");
ALTER TABLE "order" ADD CONSTRAINT "order_fk1" FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id");
ALTER TABLE "order" ADD CONSTRAINT "order_fk8" FOREIGN KEY ("change_log_id") REFERENCES "change_log"("change_log_id");
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_fk1" FOREIGN KEY ("order_id") REFERENCES "order"("order_id");
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_fk2" FOREIGN KEY ("product_id") REFERENCES "product"("product_id");
ALTER TABLE "product_supplier" ADD CONSTRAINT "product_supplier_fk0" FOREIGN KEY ("product_id") REFERENCES "product"("product_id");
ALTER TABLE "product_supplier" ADD CONSTRAINT "product_supplier_fk1" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("supplier_id");
ALTER TABLE "change_log" ADD CONSTRAINT "change_log_fk1" FOREIGN KEY ("user_id") REFERENCES "user"("user_id");
COMMENT ON TABLE "user" IS 'User records table';
COMMENT ON TABLE "category" IS 'table for different categories of products';