import express, { type Express, type Request, type Response } from "express";

const PORT: number = 8000;

const app: Express = express();

app.use(express.json());

app.get("/health", async (req: Request, res: Response) => {
    res.status(200).json({
        message: "Hello Client!"
    });
});

app.listen(PORT, () => {
    console.log(`server is listening on PORT: ${PORT}`);
});