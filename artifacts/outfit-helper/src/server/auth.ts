import jwt, { type JwtPayload } from "jsonwebtoken";
import { type NextRequest, NextResponse } from "next/server";
import { GetCurrentUserResponse } from "@workspace/api-zod";
import { connectMongo } from "./db";
import { UserModel } from "./models";

export const SESSION_COOKIE = "outfit_helper_session";
export const cookieOptions = {
  httpOnly: true, secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const, path: "/", maxAge: 7 * 24 * 60 * 60,
};
export function toPublicUser(user: { id: string; name: string; email: string; createdAt: Date }) {
  return GetCurrentUserResponse.parse({
    id: user.id, name: user.name, email: user.email, createdAt: user.createdAt,
  });
}
export function withSession(user: Parameters<typeof toPublicUser>[0], status = 200) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Session authentication is not configured.");
  const token = jwt.sign({}, secret, { subject: user.id, expiresIn: "7d" });
  const response = NextResponse.json(toPublicUser(user), { status });
  response.cookies.set(SESSION_COOKIE, token, cookieOptions);
  return response;
}
export async function getSignedInUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Session authentication is not configured.");
  let payload: JwtPayload;
  try { payload = jwt.verify(token, secret) as JwtPayload; } catch { return null; }
  if (typeof payload.sub !== "string" || !/^[a-f\d]{24}$/i.test(payload.sub)) return null;
  await connectMongo();
  return UserModel.findById(payload.sub).exec();
}
