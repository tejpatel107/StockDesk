import express, { type Router } from "express";
import { loginController, signupCustomerController, signupStaffController } from "./auth.controller.js";
import { loginValidation, signUpStaffValidation, signUpCustomerValidation } from "../../validators/user.validation.js";
import { validate } from "../../middlewares/validate.middleware.js";

const authRouter : Router = express.Router();

authRouter.post("/login", validate({ body : loginValidation }), loginController);
authRouter.post("/signup/staff", validate({ body : signUpStaffValidation }), signupStaffController);
authRouter.post("/signup/customer", validate({ body : signUpCustomerValidation }), signupCustomerController);

export default authRouter;