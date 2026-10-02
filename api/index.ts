import express, { type Express, type Request, type Response, type NextFunction } from "express";
import appRouter from "./app.routes.js";
import pageRouter from "./page.routes.js";
import { ValidationError } from "./middlewares/validate.middleware.js";
import { AppError, AuthError, ConflictError, NotFoundError } from "./utilities/globalErrorHandlers.js";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import path from "node:path";
import fs from "node:fs";
import morgan from "morgan";
import { corsOptions } from "./config/cors.js";
import cors from "cors";
import cookieParser from "cookie-parser";

const PORT: number = 8000;

const app: Express = express();

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));

app.options("/{*splat}", cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

const docsDir = path.join("api", "src", "docs");
const files = [
    "auth.swagger.yaml",
    "category.swagger.yaml",
    "reports.swagger.yaml",
    "supplier.swagger.yaml",
    "product.swagger.yaml",
    "customer.swagger.yaml",
    "order.swagger.yaml"
];
const specs = files.map((f) => YAML.parse(fs.readFileSync(path.join(docsDir, f), "utf8")));

const spec = {
    openapi: "3.0.3",
    info: { title: "Stock Desk API", version: "1.0.0" },
    tags: specs.flatMap((s) => s.tags ?? []),
    paths: Object.assign({}, ...specs.map((s) => s.paths ?? {})),
    components: {
        securitySchemes: Object.assign({}, ...specs.map((s) => s.components?.securitySchemes ?? {})),
        schemas: Object.assign({}, ...specs.map((s) => s.components?.schemas ?? {})),
    },
};

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec));
app.get("/api/health", async (req: Request, res: Response) => {
    res.status(200).json({
        message: "Hello Client!"
    });
});
app.use("/api", appRouter);
app.use("/", pageRouter);


app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {

    // console.error("GLOBAL ERROR:"); console.error(err); console.error("name:", err?.name); console.error("message:", err?.message); console.error("stack:", err?.stack);

    if (err instanceof ValidationError) {
        return res.status(400).json({ message: err.message, errors: err.errors });
    }

    if (err instanceof NotFoundError || err instanceof ConflictError || err instanceof AuthError) {
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
