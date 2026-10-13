import mongoose, { Schema, type HydratedDocument } from "mongoose";

export interface UserFields {
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export type UserDocument = HydratedDocument<UserFields>;

const userSchema = new Schema<UserFields>({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  passwordHash: { type: String, required: true, select: false },
  createdAt: { type: Date, required: true, default: Date.now },
});

export const UserModel =
  mongoose.models.User || mongoose.model<UserFields>("User", userSchema);
