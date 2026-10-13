import type { Request } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { GetCurrentUserResponse } from "@workspace/api-zod";
import { connectMongo } from "./db";
import { UserModel, type UserDocument } from "../models/User";

export const SESSION_COOKIE = "outfit_helper_session";

export function toPublicUser(user: UserDocument) {
  return GetCurrentUserResponse.parse({
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  });
}

export async function getSignedInUser(request: Request): Promise<UserDocument | null> {
  const token = request.cookies?.[SESSION_COOKIE];
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return null;

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    if (typeof payload.sub !== "string") return null;
    await connectMongo();
    return await UserModel.findById(payload.sub).exec();
  } catch {
    return null;
  }
}

export function signSession(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET must be set in Replit Secrets.");
  }
  return jwt.sign({}, secret, { subject: userId, expiresIn: "7d" });
}
