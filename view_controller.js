import express from "express";

const viewController = express.Router();

viewController.get("/", (req, res) => {
  res.render("login");
});

viewController.get("/reports", async (req, res) => {
  try {
    const headers = {
      Cookie: `session=${req.cookies.session}`,
    };

    const [lowStockRes, topProductsRes, salesReportRes] = await Promise.all([
      fetch("http://localhost:3000/api/reports/low-stock?threshold=10", {
        headers,
      }),
      fetch("http://localhost:3000/api/reports/top-products", {
        headers,
      }),
      fetch("http://localhost:3000/api/reports/sales-report", {
        headers,
      }),
    ]);

    const lowStock = await lowStockRes.json();
    const topProducts = await topProductsRes.json();
    const salesReport = await salesReportRes.json();

    res.render("reports", {
      lowStock: lowStock.data || [],
      topProducts: topProducts.data || [],
      salesReport: salesReport.data || [],
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

viewController.get("/products", async (req, res) => {
  try {
    const headers = {
      Cookie: `session=${req.cookies.session}`,
    };

    const params = {
      page: req.query.page || 1,
      limit: 10,
    };

    if (req.query.search) {
      params.search = req.query.search;
    }

    if (req.query.category_id) {
      params.category_id = req.query.category_id;
    }

    const query = new URLSearchParams(params);

    const [productRes, categoryRes] = await Promise.all([
      fetch(`http://localhost:3000/api/products?${query}`, {
        headers,
      }),
      fetch(`http://localhost:3000/api/category`, {
        headers,
      }),
    ]);

    const result = await productRes.json();
    const categoryResult = await categoryRes.json();

    res.render("products", {
      products: result.data.products || [],
      categories: categoryResult.data,
      pagination: {
        page: result.data.page,
        total: result.data.totalPages,
      },
      query: req.query,
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

viewController.get("/orders", async (req, res) => {
  try {
    const headers = {
      Cookie: `session=${req.cookies.session}`,
    };

    const params = {
      page: req.query.page || 1,
      limit: 10,
    };

    const query = new URLSearchParams(params);

    const [resOrder] = await Promise.all([
      fetch(`http://localhost:3000/api/orders?${query}`, {
        headers,
      }),
    ]);
    const result = await resOrder.json();

    res.render("orders", {
      orders: result.data,
      query: req.query,
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

viewController.get("/orders/:id", async (req, res) => {
  try {
    const headers = {
      Cookie: `session=${req.cookies.session}`,
    };

    const id = req.params.id;

    const resOrder = await fetch(`http://localhost:3000/api/orders/${id}`, {
      headers,
    });

    const result = await resOrder.json();

    res.render("orderdetail", {
      orders: result.data[0],
      orderItems: result.data[0].orderItems,
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Add Product Page
viewController.get("/products/add", async (req, res) => {
  try {
    const categoryRes = await fetch("http://localhost:3000/api/category", {
      headers: {
        Cookie: `session=${req.cookies.session}`,
      },
    });

    const categoryResult = await categoryRes.json();

    res.render("product-form", {
      title: "Add Product",
      product: {},
      categories: categoryResult.data,
      error: "",
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Add Product Submit
viewController.post("/products/add", async (req, res) => {
  try {
    const response = await fetch("http://localhost:3000/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${req.cookies.session}`,
      },
      body: JSON.stringify(req.body),
    });

    const result = await response.json();

    if (!response.ok) {
      const categoryRes = await fetch("http://localhost:3000/api/category", {
        headers: {
          Cookie: `session=${req.cookies.session}`,
        },
      });

      const categoryResult = await categoryRes.json();

      // The template only reads a single `error` string (see the singular
      // `<% if(error){ %>` check) — not a plural `errors` array.
      return res.render("product-form", {
        title: "Add Product",
        product: req.body,
        categories: categoryResult.data,
        error: result.error || result.message || "Could not add product",
      });
    }

    res.redirect("/products");
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Edit Product Page
viewController.get("/products/:id/edit", async (req, res) => {
  try {
    const headers = {
      Cookie: `session=${req.cookies.session}`,
    };

    const [productRes, categoryRes] = await Promise.all([
      fetch(`http://localhost:3000/api/products/${req.params.id}`, { headers }),

      fetch("http://localhost:3000/api/category", { headers }),
    ]);

    const productResult = await productRes.json();
    const categoryResult = await categoryRes.json();

    res.render("product-form", {
      title: "Edit Product",
      product: productResult.data,
      categories: categoryResult.data,
      error: "",
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Edit Product Submit
viewController.post("/products/:id/edit", async (req, res) => {
  try {
    const response = await fetch(
      `http://localhost:3000/api/products/${req.params.id}`,
      {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
          Cookie: `session=${req.cookies.session}`,
        },

        body: JSON.stringify(req.body),
      },
    );

    const result = await response.json();

    if (!result.success) {
      const categoryRes = await fetch("http://localhost:3000/api/category", {
        headers: {
          Cookie: `session=${req.cookies.session}`,
        },
      });

      const categoryResult = await categoryRes.json();

      return res.render("product-form", {
        title: "Edit Product again",

        product: {
          product_id: req.params.id,
          product_name: req.body.name,
          product_sku: req.body.sku,
          product_price: req.body.price,
          product_quantity: req.body.stockQuantity,
          category_id: req.body.categoryId,
        },

        categories: categoryResult.data,

        error: result.error,
      });
    }

    res.redirect("/products");
  } catch (error) {
    res.status(500).send(error.message);
  }
});

export default viewController;