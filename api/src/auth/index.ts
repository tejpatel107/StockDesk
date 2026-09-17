import express, { type Router, type Express, type Request, type Response } from "express";
import { login, signup } from "./auth.controller.js";

const authRouter : Router = express.Router();

authRouter.post("/login", login);
authRouter.post("/signup",signup);

export default authRouter;