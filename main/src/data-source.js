"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
var typeorm_1 = require("typeorm");
var product_1 = require("./entity/product");
exports.AppDataSource = new typeorm_1.DataSource({
    type: "mongodb",
    url: process.env.MONGO_URL,
    entities: [product_1.Product],
    synchronize: true,
    logging: true,
    // subscribers: [],
    // migrations: [],
});
