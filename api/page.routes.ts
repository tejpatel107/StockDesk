import { Router } from "express";

const router = Router();

router.get("/login", (req, res) => {
    res.render("login", { error: null });
});

router.get("/reports", async (req, res) => {
    try {

        const token = req.cookies['session'];

        if (!token) {
            return res.redirect("/login");
        }

        const headers = { Authorization: `Bearer ${token}`, };

        const [lowStockRes, topProductsRes] = await Promise.all([
            fetch(
                "http://localhost:8000/api/reports/low-stock?threshold=10",
                {
                    headers,
                }
            ),

            fetch(
                "http://localhost:8000/api/reports/top-products?limit=10",
                {
                    headers,
                }
            ),
        ]);

        console.log(topProductsRes);

        // Check API responses
        if (!lowStockRes.status) {
            throw new Error(
                `Low stock API failed: ${lowStockRes.status} `
            );
        }

        if (!topProductsRes.status) {
            throw new Error(
                `Top products API failed: ${topProductsRes.status} `
            );
        }

        const lowStock = await lowStockRes.json();
        const topProducts = await topProductsRes.json();

        res.render("reports", {
            lowStock: lowStock.products || [],
            topProducts: topProducts.products || [],

            // Leave this available for when the API is implemented
            salesReport: [],
        });

    } catch (error: any) {
        console.error("Reports error:", error);

        res.status(500).send(error.message);
    }
});



router.get("/products", async (req, res) => {
    try {
        const token = req.cookies.session;

        if (!token) {
            return res.redirect("/login");
        }

        const headers = {
            Authorization: `Bearer ${token}`,
        };

        /*
         * Query parameters that are currently supported.
         *
         * Keep this section open for adding more parameters later:
         * - page
         * - pageSize
         * - search
         * - categoryId
         * - inStock
         */
        const params = new URLSearchParams();

        // Pagination
        params.set("page", req.query.page as string || "1");

        // Keep pageSize available for future use
        if (req.query.pageSize) {
            params.set("pageSize", req.query.pageSize as string);
        }

        // Search by product name / SKU
        if (req.query.search) {
            params.set("search", req.query.search as string);
        }

        // Category filter
        if (req.query.categoryId) {
            params.set("categoryId", req.query.categoryId as string);
        }

        // Stock filter
        if (req.query.inStock) {
            params.set("inStock", req.query.inStock as string);
        }

        const [productRes, categoryRes] = await Promise.all([
            fetch(
                `http://localhost:8000/api/products?${params.toString()}`,
                {
                    headers,
                }
            ),

            fetch(
                "http://localhost:8000/api/categories",
                {
                    headers,
                }
            ),
        ]);

        // Authentication failure
        if (
            productRes.status === 401 ||
            categoryRes.status === 401
        ) {
            return res.redirect("/login");
        }

        if (!productRes.status) {
            throw new Error(
                `Products API failed: ${productRes.status}`
            );
        }

        if (!categoryRes.status) {
            throw new Error(
                `Category API failed: ${categoryRes.status}`
            );
        }

        const result = await productRes.json();
        const categoryResult = await categoryRes.json();

        const products = result.products || [];
        const categories = categoryResult.categories || [];

        console.log("CATEGORY RESULT:", categories);

        const categoryMap = new Map(categories.map(category =>
            [category.category_id, category.category_name]));

        const productsWithCategory = products.map(product =>
            ({ ...product, category_name: categoryMap.get(product.category_id) || "-" }));

        res.render("products", {
            products: productsWithCategory,
            categories: categories,

            pagination: {
                page: result.page || req.query.page || 1,
                totalPages: result.totalPages || 1,
                pageSize: result.pageSize || req.query.pageSize || 10,
            },

            query: {
                search: req.query.search || "",
                categoryId: req.query.categoryId || "",
                inStock: req.query.inStock || "",
                pageSize: req.query.pageSize || "",
            },
        });

    } catch (error: any) {
        console.error("Products view error:", error);

        res.status(500).send(error.message);
    }
});


// Add Product Page
router.get("/products/add", async (req, res) => {
    try {
        const token = req.cookies.session;

        if (!token) {
            return res.redirect("/login");
        }

        const response = await fetch(
            "http://localhost:8000/api/categories",
            {
                headers: {
                    Authorization: `Bearer ${ token } `,
                },
            }
        );

        if (response.status === 401) {
            return res.redirect("/login");
        }

        if (!response.status) {
            throw new Error(`Categories API failed: ${ response.status } `);
        }

        const result = await response.json();

        res.render("product-form", {
            title: "Add Product",
            product: {},
            categories: result.categories || [],
            error: "",
        });

    } catch (error: any) {
        console.error("Add product page error:", error);
        res.status(500).send(error.message);
    }
});


// Add Product Submit
router.post("/products/add", async (req, res) => {
    try {
        const token = req.cookies.session;

        if (!token) {
            return res.redirect("/login");
        }

        const response = await fetch(
            "http://localhost:8000/api/products",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${ token } `,
                },

                body: JSON.stringify(req.body),
            }
        );

        const result = await response.json();

        if (!response.ok) {

            // Fetch categories again so the form can be rendered
            const categoryRes = await fetch(
                "http://localhost:8000/api/categories",
                {
                    headers: {
                        Authorization: `Bearer ${ token } `,
                    },
                }
            );

            const categoryResult = await categoryRes.json();

            return res.render("product-form", {
                title: "Add Product",

                product: {
                    product_name: req.body.name,
                    product_sku: req.body.sku,
                    product_price: req.body.price,
                    product_stock_quantity: req.body.stockQuantity,
                    category_id: req.body.categoryId,
                },

                categories: categoryResult.categories || [],

                error:
                    result.error ||
                    result.message ||
                    "Could not add product",
            });
        }

        return res.redirect("/products");

    } catch (error: any) {
        console.error("Add product error:", error);
        res.status(500).send(error.message);
    }
});


// Edit Product Page
router.get("/products/:id/edit", async (req, res) => {
    try {
        const token = req.cookies.session;

        if (!token) {
            return res.redirect("/login");
        }

        const headers = {
            Authorization: `Bearer ${ token } `,
        };

        const [productRes, categoryRes] = await Promise.all([
            fetch(
                `http://localhost:8000/api/products/${req.params.id}`,
{ headers }
            ),

fetch(
    "http://localhost:8000/api/categories",
    { headers }
),
        ]);

if (productRes.status === 401 || categoryRes.status === 401) {
    return res.redirect("/login");
}

if (!productRes.ok) {
    throw new Error(
        `Product API failed: ${productRes.status}`
    );
}

if (!categoryRes.ok) {
    throw new Error(
        `Categories API failed: ${categoryRes.status}`
    );
}

const productResult = await productRes.json();
const categoryResult = await categoryRes.json();

/*
 * Normalize the product API response
 * into the fields expected by product-form.ejs.
 */
const apiProduct =
    productResult.product ||
    productResult.data;

const product = {
    product_id:
        apiProduct.productId ||
        apiProduct.product_id,

    product_name:
        apiProduct.productName ||
        apiProduct.product_name,

    product_sku:
        apiProduct.productSku ||
        apiProduct.product_sku,

    product_price:
        apiProduct.productPrice ||
        apiProduct.product_price,

    product_stock_quantity:
        apiProduct.productQuantity ??
        apiProduct.product_stock_quantity,

    category_id:
        apiProduct.categoryId ||
        apiProduct.category_id,
};

res.render("product-form", {
    title: "Edit Product",
    product,
    categories: categoryResult.categories || [],
    error: "",
});

    } catch (error: any) {
    console.error("Edit product page error:", error);
    res.status(500).send(error.message);
}
});


// Edit Product Submit
router.post("/products/:id/edit", async (req, res) => {
    try {
        const token = req.cookies.session;

        if (!token) {
            return res.redirect("/login");
        }

        const response = await fetch(
            `http://localhost:8000/api/products/${req.params.id}`,
            {
                method: "PATCH",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },

                body: JSON.stringify(req.body),
            }
        );

        const result = await response.json();

        if (!response.ok) {

            const categoryRes = await fetch(
                "http://localhost:8000/api/categories",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const categoryResult = await categoryRes.json();

            return res.render("product-form", {
                title: "Edit Product",

                product: {
                    product_id: req.params.id,
                    product_name: req.body.name,
                    product_sku: req.body.sku,
                    product_price: req.body.price,
                    product_stock_quantity: req.body.stockQuantity,
                    category_id: req.body.categoryId,
                },

                categories: categoryResult.categories || [],

                error:
                    result.error ||
                    result.message ||
                    "Could not update product",
            });
        }

        return res.redirect("/products");

    } catch (error: any) {
        console.error("Edit product error:", error);
        res.status(500).send(error.message);
    }
});



export default router;