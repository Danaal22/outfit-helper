import mongoose from "mongoose";
import { connectMongo } from "../lib/db";
import { ProductModel } from "../models/Product";

const products = [
  {
    name: "The Everyday Trench",
    description: "A light layer that gives a simple outfit a more finished shape.",
    price: 118,
    imageUrl:
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=1000&q=85",
    category: "clothing",
    color: "sand",
  },
  {
    name: "Soft Knit Crew",
    description: "A relaxed knit that works tucked, layered, or worn on its own.",
    price: 76,
    imageUrl:
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=1000&q=85",
    category: "clothing",
    color: "cream",
  },
  {
    name: "Straight-Leg Denim",
    description: "An easy, versatile everyday fit with a clean straight leg.",
    price: 92,
    imageUrl:
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1000&q=85",
    category: "clothing",
    color: "indigo",
  },
  {
    name: "Relaxed White Shirt",
    description: "A crisp layer that pairs easily with denim, tailoring, or knits.",
    price: 68,
    imageUrl:
      "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=1000&q=85",
    category: "clothing",
    color: "white",
  },
  {
    name: "Everyday Leather Sneaker",
    description: "A clean low-top sneaker for comfortable, casual outfits.",
    price: 110,
    imageUrl:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=85",
    category: "shoes",
    color: "red",
  },
  {
    name: "City Loafer",
    description: "A polished slip-on shoe that makes casual looks feel considered.",
    price: 135,
    imageUrl:
      "https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=1000&q=85",
    category: "shoes",
    color: "black",
  },
];

async function seedProducts(): Promise<void> {
  await connectMongo();
  const count = await ProductModel.countDocuments();
  if (count === 0) {
    await ProductModel.insertMany(products);
    console.info(`Added ${products.length} sample products to the catalog.`);
  } else {
    console.info("Catalog already has products; no sample products were added.");
  }
  await mongoose.disconnect();
}

seedProducts().catch(async (error: unknown) => {
  console.error("Product seeding failed:", error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
