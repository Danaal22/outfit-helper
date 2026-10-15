import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: ["@workspace/api-client-react", "@workspace/api-zod"],
  outputFileTracingRoot: path.resolve(root, "../.."),
  allowedDevOrigins: ["localhost", "127.0.0.1", "*.replit.dev", "*.replit.app"],
  serverExternalPackages: ["mongoose", "bcryptjs", "jsonwebtoken", "@google/genai"],
};

export default config;
