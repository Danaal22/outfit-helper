import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import {
  LogInBody,
  LogInResponse,
  SignUpBody,
  SignUpResponse,
} from "@workspace/api-zod";
import { connectMongo } from "../lib/db";
import { getSignedInUser, SESSION_COOKIE, signSession, toPublicUser } from "../lib/auth";
import { UserModel } from "../models/User";

const router: IRouter = Router();
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = SignUpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter your name, a valid email, and a password of at least 8 characters." });
    return;
  }

  await connectMongo();
  const email = parsed.data.email.trim().toLowerCase();
  if (await UserModel.exists({ email })) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const user = await UserModel.create({
    name: parsed.data.name.trim(),
    email,
    passwordHash: await bcrypt.hash(parsed.data.password, 12),
  });
  res.cookie(SESSION_COOKIE, signSession(user.id), cookieOptions);
  res.status(201).json(SignUpResponse.parse(toPublicUser(user)));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LogInBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid email and password." });
    return;
  }

  await connectMongo();
  const user = await UserModel.findOne({
    email: parsed.data.email.trim().toLowerCase(),
  })
    .select("+passwordHash")
    .exec();
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "Email or password is incorrect." });
    return;
  }

  res.cookie(SESSION_COOKIE, signSession(user.id), cookieOptions);
  res.json(LogInResponse.parse(toPublicUser(user)));
});

router.post("/auth/logout", (_req, res): void => {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", path: "/" });
  res.status(204).end();
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const user = await getSignedInUser(req);
  if (!user) {
    res.status(401).json({ error: "Sign in to view your account." });
    return;
  }
  res.json(toPublicUser(user));
});

export default router;
