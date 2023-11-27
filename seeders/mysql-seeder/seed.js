// Import necessary modules
import { Sequelize, DataTypes } from "sequelize";
import dotenv from "dotenv";
import products from "./products.js";

// Load environment variables from .env
dotenv.config();

// Create Sequelize instance
const sequelize = new Sequelize(process.env.MYSQL_DATABASE_URL, {
  dialect: "mysql",
  logging: true, // Set to true to log SQL queries
});

// Define the Product model
const Product = sequelize.define(
  "product",
  {
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    image: {
      type: DataTypes.STRING, // You might want to use BLOB for images
      allowNull: true,
    },
    likes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "product", // Explicitly define table name
    timestamps: false, // Disable timestamps
  }
);

// Synchronize the model with the database
(async () => {
  try {
    await sequelize.sync({ force: true }); // Drop and recreate tables

    // Seed the database with one product
    await Product.bulkCreate(products);

    console.log("Seed data inserted successfully.");
  } catch (error) {
    console.error("Error syncing table:", error);
  } finally {
    sequelize.close();
  }
})();
