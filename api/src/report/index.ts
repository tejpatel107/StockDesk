import express, { type Router } from "express";
import { getLowStockController } from "./report.controller.js";
import { lowStockValidationSchema } from "../../validators/report.validation.js";
import { validate } from "../../middlewares/validate.middleware.js";

const reportRouter: Router = express.Router();

reportRouter.get("/low-stock", validate({ query: lowStockValidationSchema }), getLowStockController);
// reportRouter.get("/low-stock", getTopProductsController);
// reportRouter.get("/low-stock", getSalesSummaryController);
// reportRouter.delete("/:id", deleteReportController);

export default reportRouter;