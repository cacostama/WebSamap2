import "dotenv/config";
import knex from "knex";
import config from "../knexfile.js";

export const db = knex(config[process.env.NODE_ENV === "production" ? "production" : "development"]);
