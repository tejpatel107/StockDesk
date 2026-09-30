import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
    res.render("login", { error: null });
})

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

        const [lowStockRes, topProductsRes, salesSummaryRes] = await Promise.all([
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
            fetch(
                "http://localhost:8000/api/reports/sales-summary",
                {
                    headers,
                }
            ),
        ]);

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

        if (!salesSummaryRes.status) {
            throw new Error(
                `Top products API failed: ${topProductsRes.status} `
            );
        }

        const lowStock = await lowStockRes.json();
        const topProducts = await topProductsRes.json();
        const salesSummary = await salesSummaryRes.json();

        console.log(salesSummary['Sales Summary']);

        res.render("reports", {
            lowStock: lowStock.products || [],
            topProducts: topProducts.products || [],

            // Leave this available for when the API is implemented
            salesReport: salesSummary['Sales Summary'] || {},
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
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        if (response.status === 401) {
            return res.redirect("/login");
        }

        if (!response.ok) {
            throw new Error(
                `Categories API failed: ${response.status} ${response.statusText}`
            );
        }

        const result = await response.json();

        return res.render("product-form", {
            title: "Add Product",
            product: {},
            categories: result.categories || [],
            error: "",
        });

    } catch (error: any) {
        console.error("Add product page error:", error);

        return res.status(500).send(error.message);
    }
});


// Add Product Submit
router.post("/products/add", async (req, res) => {
    try {
        const token = req.cookies.session;

        if (!token) {
            return res.redirect("/login");
        }

        const data = JSON.stringify({
            name: req.body.name,
            sku: req.body.sku,
            price: Number(req.body.price),
            quantity: Number(req.body.quantity),
            categoryId: req.body.categoryId,
        });

        console.log(data);

        const response = await fetch(
            "http://localhost:8000/api/products",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token} `,
                },

                body: data,
            }
        );

        if (response.status === 401) {
            return res.redirect("/login");
        }

        if (!response.ok) {
            const result = await response.json();

            // Re-fetch categories because we need them
            // when rendering the form again.
            const categoriesResponse = await fetch(
                "http://localhost:8000/api/categories",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const categoriesResult = await categoriesResponse.json();

            return res.status(400).render("product-form", {
                title: "Add Product",
                product: req.body,
                categories: categoriesResult.categories || [],
                error: result.message || "Failed to create product",
            });
        }

        return res.redirect("/products");

    } catch (error: any) {
        console.error("Add product error:", error);
        res.status(500).send(error.message);
    }
});


// Edit Product Page
router.get("/products/:sku/edit", async (req, res) => {
    try {
        const token = req.cookies.session;

        if (!token) {
            return res.redirect("/login");
        }

        const { sku } = req.params;

        const productRes = await fetch(
            `http://localhost:8000/api/products?search=${encodeURIComponent(sku)}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );

        const categoryRes = await fetch(
            `http://localhost:8000/api/categories`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );

        if (productRes.status === 401 || categoryRes.status === 401) {
            return res.redirect("/login");
        }

        if (!productRes.ok) {
            throw new Error(
                `Product API failed: ${productRes.status} ${productRes.statusText}`
            );
        }

        if (!categoryRes.ok) {
            throw new Error(
                `Category API failed: ${categoryRes.status} ${categoryRes.statusText}`
            );
        }

        const productsResult = await productRes.json();
        const categoriesResult = await categoryRes.json();

        const product = productsResult.products?.[0];

        if (!product) {
            return res.status(404).send("Product not found");
        }

        console.log(product);

        return res.render("product-form", {
            title: "Edit Product",
            product,
            categories: categoriesResult.categories || [],
            error: "",
        });

    } catch (error: any) {
        console.error("Edit product page error:", error);

        return res.status(500).send(error.message);
    }
});

// Edit Product Submit
router.post("/products/:sku/edit", async (req, res) => {
    try {
        const token = req.cookies.session;

        if (!token) {
            return res.redirect("/login");
        }

        const { product_id } = req.body;

        const updates: Record<string, unknown> = {};

        if (req.body.name !== req.body.original_name) {
            updates.name = req.body.name;
        }

        if (req.body.sku !== req.body.original_sku) {
            updates.sku = req.body.sku;
        }

        if (Number(req.body.price) !== Number(req.body.original_price)) {
            updates.price = Number(req.body.price);
        }

        if (Number(req.body.quantity) !== Number(req.body.original_quantity)) {
            updates.quantity = Number(req.body.quantity);
        }

        if (req.body.categoryId !== req.body.original_categoryId) {
            updates.categoryId = req.body.categoryId;
        }

        console.log("Changed fields:", updates);

        // Nothing changed
        if (Object.keys(updates).length === 0) {
            return res.redirect("/products");
        }

        const response = await fetch(
            `http://localhost:8000/api/products/${product_id}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updates),
            }
        );

        if (response.status === 401) {
            return res.redirect("/login");
        }

        if (!response.ok) {
            const result = await response.json();

            return res.status(400).render("product-form", {
                title: "Edit Product",
                product: req.body,
                categories: [],
                error: result.message || "Failed to update product",
            });
        }

        return res.redirect("/products");

    } catch (error: any) {
        console.error("Edit product error:", error);

        return res.status(500).send(error.message);
    }
});


router.get("/orders", async (req, res) => {
    try {
        const token = req.cookies.session;

        const {
            page = "1",
            pageSize = "10",
            status = "",
            startDate = "",
            endDate = "",
            sort = "DESC",
        } = req.query;


        const params = new URLSearchParams();

        params.set("page", String(page));
        params.set("pageSize", String(pageSize));

        if (status) {
            params.set("status", String(status).toUpperCase());
        }

        if (startDate) {
            params.set("startDate", String(startDate));
        }

        if (endDate) {
            params.set("endDate", String(endDate));
        }

        params.set("sort", String(sort).toUpperCase());


        const response = await fetch(
            `http://localhost:8000/api/orders?${params.toString()}`,
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        // console.log(await response.json());

        if (!response.status) {
            throw new Error(
                `Failed to fetch orders: ${response.status}`
            );
        }


        const result = await response.json();


        res.render("orders", {
            orders: result.orders,
            query: {
                page: String(page),
                pageSize: String(pageSize),
                status: String(status),
                startDate: String(startDate),
                endDate: String(endDate),
                sort: String(sort),
            },
        });

    } catch (error) {
        console.error("Orders view error:", error);

        res.status(500).send(error.message);
    }
});

router.get("/orders/:id", async (req, res) => {
    try {
        const token = req.cookies.session;

        const { id } = req.params;

        const response = await fetch(
            `http://localhost:8000/api/orders/${id}`,
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            }
        );


        if (!response.status) {
            throw new Error(
                `Failed to fetch order: ${response.status}`
            );
        }


        const result = await response.json();

        console.log(result);

        if ("success" in result && !result.success) {
            return res.status(404).send(result.message);
        }


        res.render("orderDetails", {
            order: result,
        });

    } catch (error) {
        console.error("Order detail view error:", error);

        res.status(500).send(error.message);
    }
});


export default router;