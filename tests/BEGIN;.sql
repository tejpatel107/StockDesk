BEGIN;

DO $$
DECLARE
    customer_ids uuid[];
    product_ids uuid[];
    actor_id uuid;
    batch_log_id uuid;
    inserted_count integer;
BEGIN
    SELECT array_agg(c.customer_id ORDER BY c.customer_id)
    INTO customer_ids
    FROM "customer" c
    JOIN "user" u ON u.user_id = c.user_id
    WHERE c.history_id IS NULL
      AND c.flag_deleted = false
      AND u.history_id IS NULL
      AND u.flag_deleted = false;

    SELECT array_agg(product_id ORDER BY product_id)
    INTO product_ids
    FROM "product"
    WHERE history_id IS NULL
      AND flag_deleted = false;

    IF coalesce(cardinality(customer_ids), 0) = 0
       OR coalesce(cardinality(product_ids), 0) = 0 THEN
        RAISE EXCEPTION
            'At least one active customer and product are required.';
    END IF;

    SELECT user_id INTO actor_id
    FROM "customer"
    WHERE customer_id = customer_ids[1];

    INSERT INTO "change_log" (
        user_id,
        change_log_timestamp
    )
    VALUES (actor_id, now())
    RETURNING change_log_id INTO batch_log_id;

    WITH sample_orders AS MATERIALIZED (
        SELECT
            gen_random_uuid() AS order_id,
            customer_ids[
                1 + ((n - 1) % cardinality(customer_ids))
            ] AS customer_id,
            product_ids[
                1 + ((n - 1) % cardinality(product_ids))
            ] AS product_id,
            current_date - floor(random() * 365)::integer AS order_date,
            (ARRAY[
                'PENDING',
                'CONFIRMED',
                'SHIPPED',
                'DELIVERED',
                'CANCELLED'
            ])[1 + floor(random() * 5)::integer] AS order_status,
            1 + floor(random() * 5)::integer AS quantity
        FROM generate_series(1, 10000) AS g(n)
    ),
    priced_orders AS MATERIALIZED (
        SELECT
            s.*,
            p.product_price AS unit_price
        FROM sample_orders s
        JOIN "product" p ON p.product_id = s.product_id
    ),
    inserted_orders AS (
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
        SELECT
            order_id,
            customer_id,
            order_date,
            current_time,
            order_status,
            quantity * unit_price,
            false,
            NULL,
            batch_log_id
        FROM priced_orders
        RETURNING order_id
    )
    INSERT INTO "order_item" (
        order_id,
        product_id,
        order_item_quantity,
        order_item_unit_price_at_time_of_order,
        order_item_line_total
    )
    SELECT
        p.order_id,
        p.product_id,
        p.quantity,
        p.unit_price,
        p.quantity * p.unit_price
    FROM priced_orders p
    JOIN inserted_orders o ON o.order_id = p.order_id;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;

    RAISE NOTICE 'Inserted % orders and items. Batch change_log_id: %',
        inserted_count, batch_log_id;
END $$;

COMMIT;