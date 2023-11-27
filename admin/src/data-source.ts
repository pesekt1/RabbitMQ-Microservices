import { DataSource } from "typeorm";
import { Product } from "./entity/product";

export const AppDataSource = new DataSource({
  type: "mysql",
  url: process.env.MYSQL_DATABASE_URL,
  entities: [Product],
  synchronize: true,
  logging: true,
  // subscribers: [],
  // migrations: [],
});
