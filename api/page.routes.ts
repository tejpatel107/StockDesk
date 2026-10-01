import { Router } from "express";

const API_BASE = process.env.API_BASE_URL || "/api";
// const API_BASE = "http://localhost:8000/api";

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

router.get("/products", (req, res) => {
    const token = req.cookies.session;

    if (!token) {
        return res.redirect("/login");
    }

    res.render("products", {
        apiBase: API_BASE,
        token,
    });
});

// Add Product Page
router.get("/products/add", (req, res) => {
    const token = req.cookies.session;

    if (!token) {
        return res.redirect("/login");
    }

    return res.render("product-form", {
        title: "Add Product",
        apiBase: API_BASE,
        token,
    });
});

router.get("/products/:id/edit", (req, res) => {
    const token = req.cookies.session;

    if (!token) {
        return res.redirect("/login");
    }

    return res.render("product-form", {
        title: "Edit Product",
        apiBase: API_BASE,
        token,
        productId: req.params.id,
    });
});

router.get("/orders", (req, res) => {
    const token = req.cookies.session;
    if (!token) return res.redirect("/login");

    const {
        page = "1",
        pageSize = "10",
        status = "",
        startDate = "",
        endDate = "",
        sort = "DESC",
    } = req.query;

    res.render("orders", {
        token,
        apiBase: API_BASE,
        query: {
            page: String(page),
            pageSize: String(pageSize),
            status: String(status).toUpperCase(),
            startDate: String(startDate),
            endDate: String(endDate),
            sort: String(sort).toUpperCase(),
        },
    });
});

router.get("/orders/:id", (req, res) => {
    const token = req.cookies.session;
    if (!token) return res.redirect("/login");

    res.render("orderDetails", {
        token,
        apiBase: API_BASE,
        orderId: req.params.id,
    });
});

router.post('/logout', (req, res) => {
    res.clearCookie('session');
    res.redirect('/login');
});

export default router;