import express, { type Router } from "express";
import { getLowStockController, getTopProductsController } from "./report.controller.js";
import { lowStockValidationSchema, topProductsValidationSchema } from "../../validators/report.validation.js";
import { validate } from "../../middlewares/validate.middleware.js";

const reportRouter: Router = express.Router();

reportRouter.get("/low-stock", validate({ query: lowStockValidationSchema }), getLowStockController);
reportRouter.get("/top-products", validate({ query: topProductsValidationSchema }), getTopProductsController);
// reportRouter.get("/low-stock", getSalesSummaryController);
// reportRouter.delete("/:id", deleteReportController);

export default reportRouter;