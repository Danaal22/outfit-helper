import mongoose from "mongoose";

type MongoCache = {
  promise: Promise<typeof mongoose> | null;
};

const globalWithMongo = globalThis as typeof globalThis & {
  outfitHelperMongo?: MongoCache;
};

const cache = (globalWithMongo.outfitHelperMongo ??= { promise: null });

export async function connectMongo(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI must be set in Replit Secrets.");
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, { maxPoolSize: 10 }).catch((error) => {
      cache.promise = null;
      throw error;
    });
  }

  return cache.promise;
}
