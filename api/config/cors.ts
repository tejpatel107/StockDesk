import type { CorsOptions } from "cors";

const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim());

export const corsOptions: CorsOptions = {
    origin(origin, callback) {
        // Allow non-browser clients (curl, Postman, server-to-server) that send no Origin
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // needed if you use cookies; harmless with Bearer tokens
    maxAge: 86400,     // cache preflight for 24h
};