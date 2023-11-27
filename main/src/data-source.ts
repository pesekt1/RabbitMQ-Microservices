import { DataSource } from "typeorm";
import { Product } from "./entity/product";

export const AppDataSource = new DataSource({
  type: "mongodb",
  url: process.env.MONGO_URL,
  entities: [Product],
  synchronize: true,
  logging: true,
  // subscribers: [],
  // migrations: [],
});
