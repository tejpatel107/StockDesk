import express, { type Router } from "express";
import { getCategoriesController, addNewCategoryController, deleteCategoryController, updateCategoryController } from "./category.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { addCategoryValidationSchema, categoryIdParamValidationSchema, updateCategoryValidationSchema } from "../../validators/category.validation.js";
import { authorizeUser } from "../../middlewares/auth.middleware.js";
import { ROLES } from "../../../db/roles.js";

const categoryRouter : Router = express.Router();

categoryRouter.get("/", getCategoriesController);
categoryRouter.post("/", authorizeUser(ROLES.ADMIN), validate({ body : addCategoryValidationSchema }) ,addNewCategoryController);
categoryRouter.delete("/:id", authorizeUser(ROLES.ADMIN) ,validate({ params : categoryIdParamValidationSchema }) ,deleteCategoryController);
categoryRouter.patch("/:id", authorizeUser(ROLES.ADMIN),validate({ params : categoryIdParamValidationSchema, body : updateCategoryValidationSchema }), updateCategoryController);

export default categoryRouter;