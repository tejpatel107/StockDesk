import express, { type Router, type Express, type Request, type Response } from "express";
import appRouter from "./app.routes.js";

const PORT: number = 8000;

const app: Express = express();

app.use(express.json());
app.use("/api", appRouter);
app.get("api/health", async (req: Request, res: Response) => {
    res.status(200).json({
        message: "Hello Client!"
    });
});


app.listen(PORT, () => {
    console.log(`server is listening on PORT: ${PORT}`);
});