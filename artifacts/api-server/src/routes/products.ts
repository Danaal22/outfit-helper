import { Router, type IRouter } from "express";
import {
  GetProductParams,
  GetProductResponse,
  ListProductsQueryParams,
  ListProductsResponse,
} from "@workspace/api-zod";
import { connectMongo } from "../lib/db";
import { ProductModel, type ProductDocument } from "../models/Product";

const router: IRouter = Router();

function toProduct(product: ProductDocument) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    imageUrl: product.imageUrl,
    category: product.category,
    ...(product.color ? { color: product.color } : {}),
    createdAt: product.createdAt,
  };
}

router.get("/products", async (req, res): Promise<void> => {
  const query = ListProductsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Choose clothing or shoes to filter the catalog." });
    return;
  }

  await connectMongo();
  const products = await ProductModel.find(
    query.data.category ? { category: query.data.category } : {},
  )
    .sort({ createdAt: -1 })
    .lean<ProductDocument[]>()
    .exec();

  res.json(
    ListProductsResponse.parse(
      products.map((product) =>
        GetProductResponse.parse({
          id: String(product._id),
          name: product.name,
          description: product.description,
          price: product.price,
          imageUrl: product.imageUrl,
          category: product.category,
          ...(product.color ? { color: product.color } : {}),
          createdAt: product.createdAt,
        }),
      ),
    ),
  );
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "That product link is not valid." });
    return;
  }

  await connectMongo();
  if (!/^[a-f\d]{24}$/i.test(params.data.id)) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  const product = await ProductModel.findById(params.data.id).exec();
  if (!product) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  res.json(GetProductResponse.parse(toProduct(product)));
});

export default router;
