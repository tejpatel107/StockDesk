import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { pool } from "../db/db.js";

const client = await pool.connect();

try {
  await client.query("BEGIN");

  // --------------------------------------------------
  // Temporarily disable FK triggers.
  // Required because user <-> change_log are circular.
  // --------------------------------------------------
  await client.query("SET session_replication_role = replica");

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
  // IDs
  // --------------------------------------------------

  const adminUserId = randomUUID();
  const staffUserId = randomUUID();

  // --------------------------------------------------
  // Users
  // --------------------------------------------------

  const passwordHash = await bcrypt.hash("Password123!", 10);

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
      VALUES
        ($1, $2, $3, $4, $5, false, NULL, $6),
        ($7, $8, $9, $4, $10, false, NULL, $11)
    `,
    [
      adminUserId,
      "Admin User",
      "admin@stockdesk.com",
      passwordHash,
      "ADMIN",
      randomUUID(),

      staffUserId,
      "Staff User",
      "staff@stockdesk.com",
      "STAFF",
      randomUUID(),
    ]
  );

  // --------------------------------------------------
  // Categories
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
    const categoryId = randomUUID();
    categoryIds.push(categoryId);

    await client.query(
      `
        INSERT INTO "category" (
          category_id,
          category_name,
          category_description,
          flag_deleted,
          history_id,
          change_log_id
        )
        VALUES ($1, $2, $3, false, NULL, $4)
      `,
      [categoryId, category.name, category.description, randomUUID()]
    );
  }

  // --------------------------------------------------
  // Suppliers
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
    const supplierId = randomUUID();
    supplierIds.push(supplierId);

    await client.query(
      `
        INSERT INTO "supplier" (
          supplier_id,
          supplier_name,
          supplier_email,
          supplier_phone_number,
          flag_deleted,
          history_id,
          change_log_id
        )
        VALUES ($1, $2, $3, $4, false, NULL, $5)
      `,
      [supplierId, name, email, phone, randomUUID()]
    );
  }

  // --------------------------------------------------
  // Products - 50
  // --------------------------------------------------

  const productIds: string[] = [];

  for (let i = 1; i <= 50; i++) {
    const productId = randomUUID();
    productIds.push(productId);

    const categoryId = categoryIds[(i - 1) % categoryIds.length];

    const price = 500 + i * 250;
    const stock = 10 + (i % 41);

    await client.query(
      `
        INSERT INTO "product" (
          product_id,
          product_name,
          product_sku,
          product_price,
          product_stock_quantity,
          category_id,
          flag_deleted,
          history_id,
          change_log_id
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, false, NULL, $7
        )
      `,
      [
        productId,
        `Product ${i}`,
        `SKU-${String(i).padStart(4, "0")}`,
        price,
        stock,
        categoryId,
        randomUUID(),
      ]
    );

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
  // Customer users
  //
  // Because customer.user_id is NOT NULL UNIQUE,
  // each customer needs its own user account.
  // --------------------------------------------------

  const customerUserIds: string[] = [];

  for (let i = 1; i <= 10; i++) {
    const userId = randomUUID();
    customerUserIds.push(userId);

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
        VALUES ($1, $2, $3, $4, 'CUSTOMER', false, NULL, $5)
      `,
      [
        userId,
        `Customer ${i}`,
        `customer${i}@stockdesk.com`,
        passwordHash,
        randomUUID(),
      ]
    );
  }

  // --------------------------------------------------
  // Customers - 10
  // --------------------------------------------------

  const customerIds: string[] = [];

  for (let i = 1; i <= 10; i++) {
    const customerId = randomUUID();
    customerIds.push(customerId);

    await client.query(
      `
        INSERT INTO "customer" (
          customer_id,
          customer_phone_number,
          customer_address,
          user_id,
          flag_deleted,
          history_id,
          change_log_id
        )
        VALUES ($1, $2, $3, $4, false, NULL, $5)
      `,
      [
        customerId,
        `+91-90000000${String(i).padStart(2, "0")}`,
        `${i} Main Street, Ahmedabad`,
        customerUserIds[i - 1],
        randomUUID(),
      ]
    );
  }

  // --------------------------------------------------
  // Orders - 20
  // --------------------------------------------------

  const statuses = [
    "PENDING",
    "CONFIRMED",
    "SHIPPED",
    "DELIVERED",
  ];

  for (let i = 1; i <= 20; i++) {
    const orderId = randomUUID();

    const customerId = customerIds[(i - 1) % customerIds.length];

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

    await client.query(
      `
        INSERT INTO "order" (
          order_id,
          customer_id,
          order_date,
          order_created_at,
          order_status,
          order_total_amount,
          flag_deleted,
          history_id,
          change_log_id
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          false,
          NULL,
          $7
        )
      `,
      [
        orderId,
        customerId,
        orderDate.toISOString().split("T")[0],
        "10:00:00",
        orderStatus,
        totalAmount,
        randomUUID(),
      ]
    );

    // Order item 1
    await client.query(
      `
        INSERT INTO "order_item" (
          order_item_id,
          order_id,
          product_id,
          order_item_quantity,
          order_item_unit_price_at_time_of_order,
          order_item_line_total
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        randomUUID(),
        orderId,
        product1Id,
        quantity1,
        price1,
        lineTotal1,
      ]
    );

    // Order item 2
    await client.query(
      `
        INSERT INTO "order_item" (
          order_item_id,
          order_id,
          product_id,
          order_item_quantity,
          order_item_unit_price_at_time_of_order,
          order_item_line_total
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        randomUUID(),
        orderId,
        product2Id,
        quantity2,
        price2,
        lineTotal2,
      ]
    );
  }

  // --------------------------------------------------
  // Create change-log records
  // --------------------------------------------------

  const users = await client.query(`
    SELECT user_id
    FROM "user"
  `);

  for (const user of users.rows) {
    const changeLogId = randomUUID();

    await client.query(
      `
        INSERT INTO "change_log" (
          change_log_id,
          user_id,
          change_log_timestamp
        )
        VALUES ($1, $2, NOW())
      `,
      [changeLogId, user.user_id]
    );

    // Connect the user to its change log
    await client.query(
      `
        UPDATE "user"
        SET change_log_id = $1
        WHERE user_id = $2
      `,
      [changeLogId, user.user_id]
    );
  }

  // --------------------------------------------------
  // Restore FK enforcement
  // --------------------------------------------------

  await client.query("SET session_replication_role = DEFAULT");

  await client.query("COMMIT");

  console.log("Seed completed successfully.");
  console.log("Created:");
  console.log("- 2 staff users");
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