import mongoose from "mongoose";

// Connect to MongoDB
console.log("Connecting to MongoDB at", process.env.MONGO_URL);
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Product schema
const productSchema = new mongoose.Schema({
  admin_id: Number,
  title: String,
  image: String,
  likes: Number,
});

const Product = mongoose.model("Product", productSchema, "product");

// Seed product collection
const seedProducts = async () => {
  console.log("Seeding.");
  try {
    await Product.deleteMany(); // Clear existing data

    await Product.insertMany([
      {
        title: "Product 1",
        image: "https://picsum.photos/id/1/200/300",
        likes: 0,
      },
      // Add more products as needed
    ]);
    console.log("Product collection seeded successfully.");
  } catch (error) {
    console.error("Error seeding product collection:", error);
  }
};

// Start seeding when the MongoDB connection is established
mongoose.connection.once("open", async () => {
  await seedProducts();
  // Close the connection after seeding
  mongoose.connection.close();

  console.log("MongoDB connection closed.");

  // Exit the process when the seeding is complete
  process.exit(0);
});
