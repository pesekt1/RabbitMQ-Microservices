import mongoose from "mongoose";

// Connect to MongoDB

const MONGO_URI = "mongodb://mongodb:27017/yt_node_main";
mongoose.connect(MONGO_URI, {
  //mongoose.connect(process.env.MONGO_URI, {
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
  try {
    await Product.deleteMany(); // Clear existing data
    await Product.insertMany([
      {
        admin_id: 1,
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
mongoose.connection.once("open", () => {
  seedProducts();
});
