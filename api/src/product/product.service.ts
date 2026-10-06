import type { Request } from "express";
import { getAllProductsDb, getProductsByCategoryIdDb, getProductsByNameOrSkuDb, getProductsWithinPriceRangeDb, getProductsWithinStockDb, getProductsOutOfStockDb, addNewProductDb, deleteProductDb, updateProductDb, getProductByIdDb, getProductsBySkuIfExistDb, getProductsByCatgoryIdsDb, addProductsInBulkDb, getProductByNameDb, getProductBySkuDb } from "./product.db.js";
import { insertNewChangeLogRecord } from "../../../db/change_log.js";
import { AppError, ConflictError, NotFoundError } from "../../utilities/globalErrorHandlers.js";
import { csvRowValidationSchema, productCategoryQueryValidationSchema, productPriceRangeQueryValidationSchema, productSearchQueryValidationSchema, productStockQueryValidationSchema } from "../../validators/productValidation.js";
import { pool } from "../../../db/db.js";
import { parse } from "csv-parse/sync";
import { paginationQueryValidationSchema } from "../../validators/common.validation.js";
import { insertQueryBuilder } from "../../../db/querybuilder.js";

const MAX_ROWS = 5000;
const REQUIRED_COLUMNS = ["name", "sku", "price", "quantity", "category_id"] as const;

type ImportError = { row: number; reason: string };
export type ValidRow = {
    row: number;
    name: string;
    sku: string;
    price: string;
    quantity: number;
    categoryId: string;
};

const allowedFields = {
    name: "product_name",
    price: "product_price",
    quantity: "product_stock_quantity",
    sku: "product_sku",
    category_id: "category_id"
} as const;

type AllowedKeys = keyof typeof allowedFields;

function getOffset(page: number, pageSize: number) {
    return (page - 1) * pageSize;
}

function paginate(rows: any[], page: number, pageSize: number) {
    const total = rows.length ? Number(rows[0].total_count) : 0;
    const products = rows.map(({ total_count, ...product }) => product);
    return {
        statusCode: 200,
        data: {
            count: products.length,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
            products,
        },
    };
}

export async function getAllProductsService(req: Request) {
    const { page, pageSize } = paginationQueryValidationSchema.parse(req.query);
    const { rows } = await getAllProductsDb(pageSize, getOffset(page, pageSize));
    return paginate(rows, page, pageSize);
}

export async function getProductsByNameOrSkuService(req: Request) {
    const { search, page, pageSize } = productSearchQueryValidationSchema.parse(req.query);
    const { rows } = await getProductsByNameOrSkuDb(search, pageSize, getOffset(page, pageSize));
    return paginate(rows, page, pageSize);
}

export async function getProductsByCategoryIdService(req: Request) {
    const { categoryId, page, pageSize } = productCategoryQueryValidationSchema.parse(req.query);
    const { rows } = await getProductsByCategoryIdDb(categoryId, pageSize, getOffset(page, pageSize));
    return paginate(rows, page, pageSize);
}

export async function getProductsWithinPriceRangeService(req: Request) {
    const { minPrice, maxPrice, page, pageSize } = productPriceRangeQueryValidationSchema.parse(req.query);
    const { rows } = await getProductsWithinPriceRangeDb(pageSize, getOffset(page, pageSize), minPrice, maxPrice);
    return paginate(rows, page, pageSize);
}

export async function getProductsWithinStockService(req: Request) {
    const { inStock, page, pageSize } = productStockQueryValidationSchema.parse(req.query);
    const offset = getOffset(page, pageSize);
    const { rows } =
        inStock === "true"
            ? await getProductsWithinStockDb(pageSize, offset)
            : await getProductsOutOfStockDb(pageSize, offset);
    return paginate(rows, page, pageSize);
}

export async function getProductByIdService(req: Request) {

    const { id } = req.params;

    const { rows: [product] } = await getProductByIdDb(id as string);

    if (!product)
        throw new NotFoundError(`Product for id: ${id} does not exist!`);

    return {
        statusCode: 200,
        data: product
    };
}

export async function addNewProductService(req: Request) {

    const { name, price, quantity, sku, categoryId } = req.body;
    const userId: string = req.user?.userId;

    let product;

    product = (await getProductByNameDb(name)).rows[0];

    if (product) {
        throw new ConflictError(`Product by name ${name} already exists`);
    }

    product = (await getProductBySkuDb(sku)).rows[0];

    if (product) {
        throw new ConflictError(`Product by sku ${sku} already exists`);
    }

    const { rows: [changeLog] } = await insertNewChangeLogRecord(userId);
    const { rows: [newProduct] } = await addNewProductDb(name, sku, price, quantity, categoryId, changeLog.change_log_id);

    return {
        statusCode: 201,
        data: { newProduct }
    };

}

export async function deleteProductService(req: Request) {

    const userId: string = req.user?.userId;
    const { id } = req.params;

    let { rows: [product] } = await getProductByIdDb(id as string);

    if (!product) {
        throw new NotFoundError(`Product by id: ${id} not found, or either the product is deleted!`);
    }

    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        const { rows: [changeLog] } = await insertNewChangeLogRecord(userId, client);

        product = await deleteProductDb(client, product, changeLog.change_log_id);

        await client.query('COMMIT');

        return {
            statusCode: 204,
            data: product
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw new AppError(error.message);
    }
    finally {
        client.release();
    }
}

export async function updateProductService(req: Request) {
    const userId: string = req.user?.userId;
    const { id } = req.params;
    const fields = req.body;
    const { sku, name } = fields;

    let { rows: [product] } = await getProductByIdDb(id as string);

    if (!product) {
        throw new Error(`Product does not exist for id: ${id}, Please try to update existing product!`);
    }

    if (sku) {
        const { rows: [existingProductWithSku] } = await getProductBySkuDb(sku);
        if (existingProductWithSku)
            throw new ConflictError(`Product with sku: ${sku} already exists. Editing is restricted`);
    }

    if (name) {
        const { rows: [existingProductWithName] } = await getProductByNameDb(name);
        if (existingProductWithName)
            throw new ConflictError(`Product with name: ${name} already exists. Editing is restricted`);
    }

    const keys = (Object.keys(fields)).filter((key): key is AllowedKeys => {
        return Object.hasOwn(allowedFields, key) && (fields[key] !== undefined || fields[key] !== null)
    });

    if (keys.length === 0) {
        throw new Error("No valid fields provided for update");
    }

    const rows = keys.map((k) => ({ field: allowedFields[k], value: fields[k] }));

    const client = await pool.connect();

    try {

        await client.query('BEGIN');

        const { rows: [changeLog] } = await insertNewChangeLogRecord(userId, client);

        product = await updateProductDb(client, product, rows, changeLog.change_log_id);

        await client.query('COMMIT');

        return {
            statusCode: 200,
            data: product
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw new AppError(error.message);
    } finally {
        client.release();
    }
}

export async function importProductsService(req: Request) {

    const userId = req.user?.userId;

    const records = await parseCsvService(req.file?.buffer as Buffer<ArrayBufferLike>);
    const { errors, validatedRows: rows } = await validateCsvRowsService(records);

    const client = await pool.connect();

    console.log(...new Set(rows.map(r => r.categoryId)));
    try {

        await client.query('BEGIN');

        await client.query("SELECT pg_advisory_xact_lock(hashtext('product_import'))");

        const [skuRes, catRes] = await Promise.all([
            getProductsBySkuIfExistDb(client, rows.map((r) => r.sku)),
            getProductsByCatgoryIdsDb(client, [...new Set(rows.map((r) => r.categoryId))])
        ]);

        const existingSkus = new Set(skuRes.rows.map((r) => r.product_sku));
        const existingCats = new Set(catRes.rows.map((r) => r.category_id));

        const rowsToInsert: ValidRow[] = [];
        for (const r of rows) {
            if (existingSkus.has(r.sku)) {
                errors.push({ row: r.row, reason: "duplicate SKU" });
            } else if (!existingCats.has(r.categoryId)) {
                errors.push({ row: r.row, reason: "category not found" });
            } else {
                rowsToInsert.push(r);
            }
        }

        const rowsInserted = rowsToInsert.length > 0
            ? await addProductsInBulkDb(client, rowsToInsert, userId)
            : 0;

        await client.query("COMMIT");

        return {
            statusCode: 200,
            data: {
                "imported": rowsInserted,
                "failed": errors.length,
                "errors": errors
            }
        };

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Product import failed", error.message);
        throw new AppError(error.message, 500);
    } finally {
        await client.release();
    }
}

async function parseCsvService(buffer: Buffer<ArrayBufferLike>) {
    let headers: string[] = [];
    let records: Record<string, string>[];

    try {
        records = parse(buffer, {
            columns: (h: string[]) => (headers = h.map((c) => c.trim().toLowerCase())),
            bom: true,
            skip_empty_lines: true,
            relax_column_count: true, // bad column counts become per-row errors
            trim: true,
        });
    } catch (error) {
        throw new AppError(error.message);
    }

    const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
    if (missing.length) {
        throw new AppError(`Missing required columns: ${missing.join(", ")}`, 400);
    }
    if (records.length > MAX_ROWS) {
        throw new AppError(`Too many rows (max ${MAX_ROWS})`, 400);
    }

    return records;
}

export async function validateCsvRowsService(records: Record<string, string>[]) {

    const errors: ImportError[] = [];
    const valid: ValidRow[] = [];
    const seenSkus = new Map<string, number>();

    records.forEach((rec, i) => {

        const row = i + 2;

        const input = Object.fromEntries(REQUIRED_COLUMNS.map(c => [c, rec[c] ?? ""]));

        const parsed = csvRowValidationSchema.safeParse(input);

        if (!parsed.success) {
            errors.push({ row, reason: parsed.error.issues[0].message });
            return;
        }
        const d = parsed.data;

        if (seenSkus.has(d.sku)) {
            errors.push({ row, reason: `duplicate SKU (also on row ${seenSkus.get(d.sku)})` });
            return;
        }
        seenSkus.set(d.sku, row);

        valid.push({
            row,
            name: d.name,
            sku: d.sku,
            price: d.price,
            quantity: Number(d.quantity),
            categoryId: d.category_id,
        });
    });

    return { errors, validatedRows: valid }
}

