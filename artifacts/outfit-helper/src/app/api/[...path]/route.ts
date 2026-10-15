import { type NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  SignUpBody, LogInBody, ListProductsQueryParams, GetProductResponse, ListProductsResponse,
} from "@workspace/api-zod";
import { connectMongo } from "@/server/db";
import { ProductModel, UserModel } from "@/server/models";
import { cookieOptions, getSignedInUser, SESSION_COOKIE, toPublicUser, withSession } from "@/server/auth";
import { analyzeOutfit, InputError } from "@/server/stylist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Context = { params: Promise<{ path: string[] }> };
const jsonError = (error: string, status: number) => NextResponse.json({ error }, { status });

async function readBody(request: NextRequest) {
  if (Number(request.headers.get("content-length") || 0) > 4_400_000) {
    throw new InputError("Choose an outfit photo smaller than 3 MB.", 413);
  }
  const text = await request.text();
  if (Buffer.byteLength(text) > 4_400_000) throw new InputError("This request is too large.", 413);
  try { return JSON.parse(text) as unknown; } catch { throw new InputError("Send a valid JSON request."); }
}
function unavailable(error: unknown) {
  if (error instanceof InputError) return jsonError(error.message, error.status);
  if (error && typeof error === "object" && "code" in error && error.code === 11000) {
    return jsonError("An account with this email already exists.", 409);
  }
  console.error("Outfit Helper API request failed", error instanceof Error ? error.name : "Unknown error");
  return jsonError("This service is unavailable right now. Please try again later.", 503);
}
export async function GET(request: NextRequest, context: Context) {
  const { path } = await context.params;
  const route = path.join("/");
  try {
    if (route === "healthz") return NextResponse.json({ status: "ok" });
    if (route === "auth/me") {
      const user = await getSignedInUser(request);
      return user ? NextResponse.json(toPublicUser(user)) : jsonError("Sign in to view your account.", 401);
    }
    if (route === "products") {
      const parsed = ListProductsQueryParams.safeParse(Object.fromEntries(request.nextUrl.searchParams));
      if (!parsed.success) return jsonError("Choose clothing or shoes to filter the catalog.", 400);
      await connectMongo();
      const products = await ProductModel.find(parsed.data.category ? { category: parsed.data.category } : {})
        .sort({ createdAt: -1 }).exec();
      return NextResponse.json(ListProductsResponse.parse(products.map((p) => ({
        id: p.id, name: p.name, description: p.description, price: p.price,
        imageUrl: p.imageUrl, category: p.category, color: p.color, createdAt: p.createdAt,
      }))));
    }
    if (path.length === 2 && path[0] === "products") {
      if (!/^[a-f\d]{24}$/i.test(path[1]!)) return jsonError("Product not found.", 404);
      await connectMongo();
      const p = await ProductModel.findById(path[1]).exec();
      if (!p) return jsonError("Product not found.", 404);
      return NextResponse.json(GetProductResponse.parse({
        id: p.id, name: p.name, description: p.description, price: p.price,
        imageUrl: p.imageUrl, category: p.category, color: p.color, createdAt: p.createdAt,
      }));
    }
    return jsonError("API route not found.", 404);
  } catch (error) { return unavailable(error); }
}
export async function POST(request: NextRequest, context: Context) {
  const route = (await context.params).path.join("/");
  try {
    const origin = request.headers.get("origin");
    const permittedHosts = [request.nextUrl.host, request.headers.get("host"), request.headers.get("x-forwarded-host")];
    if (origin && !permittedHosts.includes(new URL(origin).host)) return jsonError("Request origin is not permitted.", 403);
    if (route === "auth/logout") {
      const response = new NextResponse(null, { status: 204 });
      response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
      return response;
    }
    if (route === "auth/signup") {
      const parsed = SignUpBody.safeParse(await readBody(request));
      if (!parsed.success) return jsonError("Enter your name, a valid email, and a password of at least 8 characters.", 400);
      if (!process.env.JWT_SECRET) return jsonError("Account access is not configured yet.", 503);
      await connectMongo();
      const email = parsed.data.email.trim().toLowerCase();
      if (await UserModel.exists({ email })) return jsonError("An account with this email already exists.", 409);
      const user = await UserModel.create({
        name: parsed.data.name.trim(), email, passwordHash: await bcrypt.hash(parsed.data.password, 12),
      });
      return withSession(user, 201);
    }
    if (route === "auth/login") {
      const parsed = LogInBody.safeParse(await readBody(request));
      if (!parsed.success) return jsonError("Enter a valid email and password.", 400);
      if (!process.env.JWT_SECRET) return jsonError("Account access is not configured yet.", 503);
      await connectMongo();
      const user = await UserModel.findOne({ email: parsed.data.email.trim().toLowerCase() }).select("+passwordHash").exec();
      if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return jsonError("Email or password is incorrect.", 401);
      return withSession(user);
    }
    if (route === "stylist/analyze") return NextResponse.json(await analyzeOutfit(await readBody(request)));
    return jsonError("API route not found.", 404);
  } catch (error) { return unavailable(error); }
}
