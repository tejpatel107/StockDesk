import express, { type Router, type Express, type Request, type Response } from "express";
import authRouter from "./src/auth/index.js";
import productRouter from "./src/product/index.js";

const PORT: number = 8000;

const app: Express = express();

app.use(express.json());

app.get("/health", async (req: Request, res: Response) => {
    res.status(200).json({
        message: "Hello Client!"
    });
});

app.use("/auth",authRouter);
app.use("/products",productRouter);

app.listen(PORT, () => {
    console.log(`server is listening on PORT: ${PORT}`);
});