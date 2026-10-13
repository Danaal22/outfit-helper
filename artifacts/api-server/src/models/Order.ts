import mongoose, { Schema, type HydratedDocument } from "mongoose";

export interface OrderItemFields {
  productId: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
}

export interface OrderFields {
  userId: mongoose.Types.ObjectId;
  items: OrderItemFields[];
  total: number;
  status: "pending" | "paid";
  createdAt: Date;
}

export type OrderDocument = HydratedDocument<OrderFields>;

const orderSchema = new Schema<OrderFields>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  items: [
    {
      productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true, min: 0 },
    },
  ],
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["pending", "paid"], required: true, default: "pending" },
  createdAt: { type: Date, required: true, default: Date.now },
});

export const OrderModel =
  mongoose.models.Order || mongoose.model<OrderFields>("Order", orderSchema);
