import type { Request } from "express";
import { getAllProductsDb, getProductsByCategoryIdDb, getProductsByNameOrSkuDb, getProductsWithinPriceRangeDb, getProductsWithinStockDb, getProductsOutOfStockDb, addNewProductDb, deleteProductDb, updateProductDb, getProductByIdDb, getProductsBySkuIfExistDb, getProductsByCatgoryIdsDb, addProductsInBulkDb, getProductsByNameDb, getProductsBySkuDb } from "./product.db.js";
import { error } from "node:console";
import { randomUUID } from "node:crypto";
import { insertNewChangeLogRecord } from "../../../db/change_log.js";
import { AppError, ConflictError } from "../../utilities/globalErrorHandlers.js";
import { csvRowValidationSchema } from "../../validators/productValidation.js";
import { pool } from "../../../db/db.js";
import { parse } from "csv-parse/sync";

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

export async function getAllProductsService() {

    try {
        const products = await getAllProductsDb();
        return {
            statusCode: 200,
            data: { count: products.length, products }
        };

    } catch (error) {
        return {
            statusCode: 500,
            data: {
                error: (error as any).message
            }
        };
    }
}


export async function getProductsByNameOrSkuService(req: Request) {

    const { search } = req.query;
    console.log(search);
    try {
        const products = await getProductsByNameOrSkuDb(search as string);
        return {
            statusCode: 200,
            data: { count: products.length, products }
        };

    } catch (error) {
        return {
            statusCode: 500,
            data: {
                error: (error as any).message
            }
        };
    }
}

export async function getProductsByCategoryIdService(req: Request) {

    const { categoryId } = req.query;
    try {
        const products = await getProductsByCategoryIdDb(categoryId as string);
        return {
            statusCode: 200,
            data: { count: products.length, products }
        };
    } catch (error) {
        return {
            statusCode: 500,
            data: {
                error: (error as any).message
            }
        };
    }
}

export async function getProductsWithinPriceRangeService(req: Request) {
    const { minPrice, maxPrice } = req.query;

    try {
        const products = await getProductsWithinPriceRangeDb(Number(minPrice), Number(maxPrice));
        return {
            statusCode: 200,
            data: { count: products.length, products }
        };
    } catch (error) {
        return {
            statusCode: 500,
            data: {
                error: (error as any).message
            }
        };
    }
}

export async function getProductsWithinStockService(req: Request) {
    const inStock = req.query.inStock === "true";

    try {
        const products = inStock ? await getProductsWithinStockDb() : await getProductsOutOfStockDb();
        return {
            statusCode: 200,
            data: { count: products.length, products }
        };
    } catch (error) {
        return {
            statusCode: 500,
            data: {
                error: (error as any).message
            }
        };
    }
}

export async function addNewProductService(req: Request) {

    const { name, price, quantity, sku, categoryId } = req.body;
    const userId: string = req.user?.userId;

    console.log(userId);

    try {

        const products = await getProductsByNameOrSkuDb(sku);
        let product: any = products.length > 0 && products[0];

        console.log(product);

        if (product && product.product_sku === sku) {
            throw new ConflictError("Product already exists");
        }

        const changeLogId = (await insertNewChangeLogRecord(userId)).rows[0].change_log_id;
        product = await addNewProductDb(randomUUID(), name, sku, price, quantity, categoryId, userId, changeLogId);
        return {
            statusCode: 201,
            data: { product }
        };
    } catch (error) {
        return {
            statusCode: 500,
            data: {
                error: (error as any).message
            }
        };
    }
}

export async function deleteProductService(req: Request) {

    const userId: string = req.user?.userId;
    const { id } = req.params;

    try {

        let { rows : [product] } = await getProductByIdDb(id as string);

        if (!product) {
            throw new Error("Product not found!");
        }

        console.log(product);

        const changeLogId = (await insertNewChangeLogRecord(userId)).rows[0].change_log_id;
        
        product = await deleteProductDb(product, userId, changeLogId);

        return {
            statusCode: 204,
            data: product
        };
    } catch (error) {
        return {
            statusCode: 500,
            data: {
                error: (error as any).message
            }
        };
    }
}

export async function updateProductService(req: Request) {
    const userId: string = req.user?.userId;
    const { id } = req.params;
    const fields = req.body;
    const { sku, name } = fields;

    try {

        let { rows: [product] } = await getProductByIdDb(id as string);

        if (!product) {
            throw new Error("Product does not exist, Please try to update existing product!");
        }

        if (sku) {
            const { rows: [existingProductWithSku] } = await getProductsBySkuDb(sku);
            if (existingProductWithSku && existingProductWithSku.product_id !== product.product_id)
                throw new ConflictError(`Product with sku: ${sku} already exists. Editing is restricted`);
        }

        if (name) {
            const { rows: [existingProductWithName] } = await getProductsByNameDb(name);
            if (existingProductWithName && existingProductWithName.product_id !== product.product_id)
                throw new ConflictError(`Product with sku: ${sku} already exists. Editing is restricted`);
        }

        const changeLogId = (await insertNewChangeLogRecord(userId)).rows[0].change_log_id;

        product = await updateProductDb(product, userId, fields, changeLogId);

        return {
            statusCode: 200,
            data: { product }
        };
    } catch (error) {

        console.log(error.message);
        return {
            statusCode: (error as ConflictError).statusCode,
            data: {
                error: (error as any).message
            }
        };
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

