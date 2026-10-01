import { ROLES } from "../../db/roles.js";

// src/config/system.ts
const required = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`Missing env var: ${name}`);
    return value;
};

export const SYSTEM_USER_ID = required("SYSTEM_USER_ID");
export const SYSTEM_CHANGE_LOG_ID = required("SYSTEM_CHANGE_LOG_ID");
export const SYSTEM_USER_EMAIL = "system@stockdesk.local";
export const SYSTEM_ROLE = ROLES.SYSTEM;