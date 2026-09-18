import express, { type Router } from "express";
import { getProducts } from "./product.controller.js";
import { authenticateJwtToken } from "../../middlewares/auth.middleware.js";

const productRouter : Router = express.Router();

productRouter.get("/", authenticateJwtToken, getProducts);

export default productRouter;