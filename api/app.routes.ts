import type { Router } from "express";
import express from "express";
import { authenticateJwtToken } from "./middlewares/auth.middleware.js";
import authRouter from "./src/auth/index.js";
import productRouter from "./src/product/index.js";
import supplierRouter from "./src/supplier/index.js";
import categoryRouter from "./src/category/index.js";
import customerRouter from "./src/customer/index.js";
import orderRouter from "./src/order/index.js";
// import reportRouter from "./src/report/index.js";

const appRouter : Router = express.Router();

appRouter.use("/auth", authRouter);
appRouter.use("/products", authenticateJwtToken, productRouter);
appRouter.use("/suppliers", authenticateJwtToken, supplierRouter);
appRouter.use("/categories", authenticateJwtToken, categoryRouter);
appRouter.use("/customers", authenticateJwtToken, customerRouter);
appRouter.use("/orders", authenticateJwtToken, orderRouter);
// appRouter.use("/reports", authenticateJwtToken, reportRouter);

export default appRouter;