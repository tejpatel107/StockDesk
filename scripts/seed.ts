import bcrypt from "bcrypt";
import { pool } from "../db/db.js";
import {
  SYSTEM_USER_ID,
  SYSTEM_CHANGE_LOG_ID,
  SYSTEM_USER_EMAIL,
  SYSTEM_ROLE,
} from "../api/config/system.js";

// --------------------------------------------------
// System user constants.
// Move these to a shared config (e.g. src/config/system.ts) so that
// /login can reject SYSTEM_USER_ID and /signup can use it as the actor.
// --------------------------------------------------
const client = await pool.connect();

// Inserts a change_log row for the given actor and returns the DB-generated id.
async function createChangeLog(actorUserId: string): Promise<string> {
  const result = await client.query(
    `
      INSERT INTO "change_log" (user_id, change_log_timestamp)
      VALUES ($1, NOW())
      RETURNING change_log_id
    `,
    [actorUserId]
  );
  return result.rows[0].change_log_id;
}

// Inserts a user and returns the DB-generated user_id.
async function createUser(
  name: string,
  email: string,
  passwordHash: string,
  role: string,
  changeLogId: string
): Promise<string> {
  const result = await client.query(
    `
      INSERT INTO "user" (
        user_name,
        user_email,
        user_password,
        user_role,
        flag_deleted,
        history_id,
        change_log_id
      )
      VALUES ($1, $2, $3, $4, false, NULL, $5)
      RETURNING user_id
    `,
    [name, email, passwordHash, role, changeLogId]
  );
  return result.rows[0].user_id;
}

try {
  await client.query("BEGIN");

  // --------------------------------------------------
  // Clear existing seed data
  // --------------------------------------------------

  await client.query(`
    TRUNCATE TABLE
      "order_item",
      "order",
      "product_supplier",
      "product",
      "supplier",
      "customer",
      "category",
      "change_log",
      "user"
    CASCADE
  `);

  // --------------------------------------------------
  // System user (bootstrap)
  //
  // user <-> change_log is circular, so this is the only place
  // where ids are fixed. change_log goes first; its user_id FK
  // (change_log_fk1, DEFERRABLE INITIALLY DEFERRED) is checked at COMMIT.
  //
  // The password '!' can never match a bcrypt comparison, and /login
  // should also reject SYSTEM_USER_ID explicitly.
  // --------------------------------------------------

  await client.query(
    `
      INSERT INTO "change_log" (change_log_id, user_id, change_log_timestamp)
      VALUES ($1, $2, NOW())
    `,
    [SYSTEM_CHANGE_LOG_ID, SYSTEM_USER_ID]
  );

  await client.query(
    `
      INSERT INTO "user" (
        user_id,
        user_name,
        user_email,
        user_password,
        user_role,
        flag_deleted,
        history_id,
        change_log_id
      )
      VALUES ($1, 'System', $2, '!', $3, false, NULL, $4)
    `,
    [SYSTEM_USER_ID, SYSTEM_USER_EMAIL, SYSTEM_ROLE, SYSTEM_CHANGE_LOG_ID]
  );

  // --------------------------------------------------
  // Admin and staff users (created by the system user)
  // --------------------------------------------------

  const passwordHash = await bcrypt.hash("Password123!", 10);

  await createUser(
    "Admin User",
    "admin@stockdesk.com",
    passwordHash,
    "ADMIN",
    await createChangeLog(SYSTEM_USER_ID)
  );

  await createUser(
    "Staff User",
    "staff@stockdesk.com",
    passwordHash,
    "STAFF",
    await createChangeLog(SYSTEM_USER_ID)
  );

  // --------------------------------------------------
  // Categories (created by the system user)
  // --------------------------------------------------

  const categories = [
    {
      name: "Laptops",
      description: "Laptop computers and notebooks",
    },
    {
      name: "Monitors",
      description: "Computer monitors and displays",
    },
    {
      name: "Keyboards",
      description: "Mechanical and standard keyboards",
    },
    {
      name: "Mice",
      description: "Computer mice and pointing devices",
    },
    {
      name: "Accessories",
      description: "Other computer accessories",
    },
  ];

  const categoryIds: string[] = [];

  for (const category of categories) {
    const result = await client.query(
      `
        INSERT INTO "category" (
          category_name,
          category_description,
          flag_deleted,
          history_id,
          change_log_id
        )
        VALUES ($1, $2, false, NULL, $3)
        RETURNING category_id
      `,
      [
        category.name,
        category.description,
        await createChangeLog(SYSTEM_USER_ID),
      ]
    );
    categoryIds.push(result.rows[0].category_id);
  }

  // --------------------------------------------------
  // Suppliers (created by the system user)
  // --------------------------------------------------

  const suppliers = [
    ["TechSource", "contact@techsource.com", "+91-9876500001"],
    ["Global Components", "sales@globalcomponents.com", "+91-9876500002"],
    ["Digital World", "sales@digitalworld.com", "+91-9876500003"],
    ["Prime Supplies", "contact@primesupplies.com", "+91-9876500004"],
    ["ElectroHub", "sales@electrohub.com", "+91-9876500005"],
  ];

  const supplierIds: string[] = [];

  for (const [name, email, phone] of suppliers) {
    const result = await client.query(
      `
        INSERT INTO "supplier" (
          supplier_name,
          supplier_email,
          supplier_phone_number,
          flag_deleted,
          history_id,
          change_log_id
        )
        VALUES ($1, $2, $3, false, NULL, $4)
        RETURNING supplier_id
      `,
      [name, email, phone, await createChangeLog(SYSTEM_USER_ID)]
    );
    supplierIds.push(result.rows[0].supplier_id);
  }

  // --------------------------------------------------
  // Products - 50 (created by the system user)
  // --------------------------------------------------

  const productIds: string[] = [];

  for (let i = 1; i <= 50; i++) {
    const categoryId = categoryIds[(i - 1) % categoryIds.length];

    const price = 500 + i * 250;
    const stock = 10 + (i % 41);

    const productResult = await client.query(
      `
        INSERT INTO "product" (
          product_name,
          product_sku,
          product_price,
          product_stock_quantity,
          category_id,
          flag_deleted,
          history_id,
          change_log_id
        )
        VALUES ($1, $2, $3, $4, $5, false, NULL, $6)
        RETURNING product_id
      `,
      [
        `Product ${i}`,
        `SKU-${String(i).padStart(4, "0")}`,
        price,
        stock,
        categoryId,
        await createChangeLog(SYSTEM_USER_ID),
      ]
    );

    const productId: string = productResult.rows[0].product_id;
    productIds.push(productId);

    // Assign 1-2 suppliers to each product
    const supplier1 = supplierIds[(i - 1) % supplierIds.length];

    await client.query(
      `
        INSERT INTO "product_supplier" (
          product_id,
          supplier_id
        )
        VALUES ($1, $2)
      `,
      [productId, supplier1]
    );

    if (i % 2 === 0) {
      const supplier2 = supplierIds[i % supplierIds.length];

      if (supplier1 !== supplier2) {
        await client.query(
          `
            INSERT INTO "product_supplier" (
              product_id,
              supplier_id
            )
            VALUES ($1, $2)
          `,
          [productId, supplier2]
        );
      }
    }
  }

  // --------------------------------------------------
  // Customers - 10
  //
  // Mirrors the signup flow: one change_log row (actor = system user)
  // is shared by the customer's user row and the customer row.
  // customer.user_id is NOT NULL UNIQUE, so each customer needs its own user.
  // --------------------------------------------------

  const customerUserIds: string[] = [];
  const customerIds: string[] = [];

  for (let i = 1; i <= 10; i++) {
    const changeLogId = await createChangeLog(SYSTEM_USER_ID);

    const userId = await createUser(
      `Customer ${i}`,
      `customer${i}@stockdesk.com`,
      passwordHash,
      "CUSTOMER",
      changeLogId
    );
    customerUserIds.push(userId);

    const customerResult = await client.query(
      `
        INSERT INTO "customer" (
          customer_phone_number,
          customer_address,
          user_id,
          flag_deleted,
          history_id,
          change_log_id
        )
        VALUES ($1, $2, $3, false, NULL, $4)
        RETURNING customer_id
      `,
      [
        `+91-90000000${String(i).padStart(2, "0")}`,
        `${i} Main Street, Ahmedabad`,
        userId,
        changeLogId,
      ]
    );
    customerIds.push(customerResult.rows[0].customer_id);
  }

  // --------------------------------------------------
  // Orders - 20 (each placed by the customer's own user)
  // --------------------------------------------------

  const statuses = [
    "PENDING",
    "CONFIRMED",
    "SHIPPED",
    "DELIVERED",
  ];

  for (let i = 1; i <= 20; i++) {
    const customerIndex = (i - 1) % customerIds.length;
    const customerId = customerIds[customerIndex];
    const customerUserId = customerUserIds[customerIndex];

    const orderDate = new Date();
    orderDate.setDate(orderDate.getDate() - i);

    const orderStatus = statuses[(i - 1) % statuses.length];

    // Pick two products for each order
    const product1Index = (i - 1) % productIds.length;
    const product2Index = (i + 9) % productIds.length;

    const product1Id = productIds[product1Index];
    const product2Id = productIds[product2Index];

    const quantity1 = (i % 3) + 1;
    const quantity2 = (i % 2) + 1;

    const product1Result = await client.query(
      `
        SELECT product_price
        FROM "product"
        WHERE product_id = $1
      `,
      [product1Id]
    );

    const product2Result = await client.query(
      `
        SELECT product_price
        FROM "product"
        WHERE product_id = $1
      `,
      [product2Id]
    );

    const price1 = Number(product1Result.rows[0].product_price);
    const price2 = Number(product2Result.rows[0].product_price);

    const lineTotal1 = price1 * quantity1;
    const lineTotal2 = price2 * quantity2;

    const totalAmount = lineTotal1 + lineTotal2;

    const orderResult = await client.query(
      `
        INSERT INTO "order" (
          customer_id,
          order_date,
          order_created_at,
          order_status,
          order_total_amount,
          flag_deleted,
          history_id,
          change_log_id
        )
        VALUES ($1, $2, $3, $4, $5, false, NULL, $6)
        RETURNING order_id
      `,
      [
        customerId,
        orderDate.toISOString().split("T")[0],
        "10:00:00",
        orderStatus,
        totalAmount,
        await createChangeLog(customerUserId),
      ]
    );

    const orderId: string = orderResult.rows[0].order_id;

    // Order item 1
    await client.query(
      `
        INSERT INTO "order_item" (
          order_id,
          product_id,
          order_item_quantity,
          order_item_unit_price_at_time_of_order,
          order_item_line_total
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [orderId, product1Id, quantity1, price1, lineTotal1]
    );

    // Order item 2
    await client.query(
      `
        INSERT INTO "order_item" (
          order_id,
          product_id,
          order_item_quantity,
          order_item_unit_price_at_time_of_order,
          order_item_line_total
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [orderId, product2Id, quantity2, price2, lineTotal2]
    );
  }

  await client.query("COMMIT");

  console.log("Seed completed successfully.");
  console.log("Created:");
  console.log("- 1 system user");
  console.log("- 1 admin user, 1 staff user");
  console.log("- 10 customer users");
  console.log("- 10 customers");
  console.log("- 5 categories");
  console.log("- 5 suppliers");
  console.log("- 50 products");
  console.log("- 20 orders");
} catch (error) {
  await client.query("ROLLBACK");

  console.error("Seed failed:");
  console.error(error);

  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}