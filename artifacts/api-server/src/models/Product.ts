import mongoose, { Schema, type HydratedDocument } from "mongoose";

export type ProductCategory = "clothing" | "shoes";

export interface ProductFields {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: ProductCategory;
  color?: string;
  createdAt: Date;
}

export type ProductDocument = HydratedDocument<ProductFields>;

const productSchema = new Schema<ProductFields>({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  imageUrl: { type: String, required: true },
  category: { type: String, enum: ["clothing", "shoes"], required: true },
  color: { type: String },
  createdAt: { type: Date, required: true, default: Date.now },
});

export const ProductModel =
  mongoose.models.Product || mongoose.model<ProductFields>("Product", productSchema);
