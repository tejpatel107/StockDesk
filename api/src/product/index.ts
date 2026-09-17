import expres, { type Router } from "express";
import { getAllProducts } from "./product.controller.js";
import { authenticateJwtToken } from "../../middlewares/auth.middleware.js";

const productRouter : Router = expres.Router();

productRouter.get("/", authenticateJwtToken, getAllProducts);

export default productRouter;