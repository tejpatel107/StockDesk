import express, { type Router, type Express, type Request, type Response } from "express";
import { login, signup } from "./auth.controller.js";
import { validateLoginRequest, validateSingUpRequest } from "../../middlewares/auth.middleware.js";

const authRouter : Router = express.Router();

authRouter.post("/login", validateLoginRequest, login);
authRouter.post("/signup", validateSingUpRequest, signup);

export default authRouter;