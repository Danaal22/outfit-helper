import mongoose from "mongoose";

const globalMongo = globalThis as typeof globalThis & {
  outfitHelperMongo?: { promise: Promise<typeof mongoose> | null };
};
const cache = (globalMongo.outfitHelperMongo ??= { promise: null });

export async function connectMongo() {
  if (mongoose.connection.readyState === 1) return mongoose;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MongoDB is not configured.");
  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      maxPoolSize: 10, serverSelectionTimeoutMS: 10000,
    }).catch((error) => { cache.promise = null; throw error; });
  }
  return cache.promise;
}
