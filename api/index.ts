import express, { type Router, type Express, type Request, type Response, type NextFunction } from "express";
import appRouter from "./app.routes.js";
import { ValidationError } from "./middlewares/validate.middleware.js";
import { AppError, AuthError, ConflictError, NotFoundError } from "./utilities/globalErrorHandlers.js";
import morgan from "morgan";

const PORT: number = 8000;

const app: Express = express();

app.use(express.json());

app.use(morgan('dev'));

app.use("/api", appRouter);
app.get("api/health", async (req: Request, res: Response) => {
    res.status(200).json({
        message: "Hello Client!"
    });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {

    if (err instanceof ValidationError) {
        return res.status(400).json({ message: err.message, errors: err.errors });
    }

    if (err instanceof NotFoundError || ConflictError || AuthError) {
        return res.status(err.statusCode).json({ success: err.success, message: err.message });
    }

    if (err instanceof AppError) {
        return res.status(500).json({ success: err.success, message: err.message });
    }

    res.status(500).json({ message: "Internal server error" });
});


app.listen(PORT, () => {
    console.log(`server is listening on PORT: ${PORT}`);
});