import mongoose, { Schema, type Model } from "mongoose";

interface UserFields {
  name: string; email: string; passwordHash: string; createdAt: Date;
}
interface ProductFields {
  name: string; description: string; price: number; imageUrl: string;
  category: "clothing" | "shoes"; color?: string; createdAt: Date;
}
interface OrderFields {
  userId: mongoose.Types.ObjectId;
  items: { productId: mongoose.Types.ObjectId; quantity: number; price: number }[];
  total: number; status: "pending" | "paid"; createdAt: Date;
}
const userSchema = new Schema<UserFields>({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  createdAt: { type: Date, required: true, default: Date.now },
});
const productSchema = new Schema<ProductFields>({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  imageUrl: { type: String, required: true },
  category: { type: String, enum: ["clothing", "shoes"], required: true },
  color: String,
  createdAt: { type: Date, required: true, default: Date.now },
});
const orderSchema = new Schema<OrderFields>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  }],
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["pending", "paid"], required: true, default: "pending" },
  createdAt: { type: Date, required: true, default: Date.now },
});
// Keep model names unchanged so existing MongoDB collections remain compatible.
export const UserModel: Model<UserFields> = (mongoose.models.User as Model<UserFields> | undefined) ?? mongoose.model<UserFields>("User", userSchema);
export const ProductModel: Model<ProductFields> = (mongoose.models.Product as Model<ProductFields> | undefined) ?? mongoose.model<ProductFields>("Product", productSchema);
export const OrderModel: Model<OrderFields> = (mongoose.models.Order as Model<OrderFields> | undefined) ?? mongoose.model<OrderFields>("Order", orderSchema);
