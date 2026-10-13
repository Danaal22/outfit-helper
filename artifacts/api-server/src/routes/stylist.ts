import { Router, type IRouter } from "express";
import { AnalyzeOutfitBody, AnalyzeOutfitResponse } from "@workspace/api-zod";
import { ai } from "@workspace/integrations-gemini-ai";
import { connectMongo } from "../lib/db";
import { ProductModel } from "../models/Product";

const router: IRouter = Router();
const supportedImageType = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;
const maxImageBytes = 5 * 1024 * 1024;

router.post("/stylist/analyze", async (req, res): Promise<void> => {
  const parsed = AnalyzeOutfitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Upload an outfit photo to get styling ideas." });
    return;
  }

  const match = supportedImageType.exec(parsed.data.imageDataUrl);
  if (!match) {
    res.status(400).json({ error: "Use a JPG, PNG, or WebP outfit photo." });
    return;
  }

  const mimeType = `image/${match[1]}`;
  const imageBase64 = match[2]!;
  const imageBytes = Buffer.from(imageBase64, "base64");
  if (imageBytes.byteLength > maxImageBytes) {
    res.status(400).json({ error: "Choose an image smaller than 5 MB." });
    return;
  }

  await connectMongo();
  const catalog = await ProductModel.find({})
    .sort({ createdAt: -1 })
    .limit(30)
    .lean()
    .exec();
  const catalogForPrompt = catalog.map((product) => ({
    id: String(product._id),
    name: product.name,
    category: product.category,
    color: product.color ?? "",
    price: product.price,
  }));

  const preferences = [
    parsed.data.occasion ? `Occasion: ${parsed.data.occasion}.` : "",
    parsed.data.stylePreference ? `Style preference: ${parsed.data.stylePreference}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const prompt = `You are Outfit Helper, a kind, practical personal fashion stylist. Analyze only the garments and accessories visible in the user's photo; do not infer or judge the person's body, age, identity, or attractiveness. Explain what is already working, then create 3 distinct, wearable styling looks using the pictured pieces. Make each look meaningfully different (for example relaxed, polished, and bold), not just synonyms. Keep advice clear and specific. Recommend only real catalog product IDs from this list: ${JSON.stringify(catalogForPrompt)}. If no catalog product fits a missing item, leave its productId null. You may suggest accessories as missing items, but don't pretend they are sold here. Include 1-3 missing pieces per look only when genuinely useful. Return JSON only in this shape: {"summary":"...","looks":[{"title":"...","description":"...","recommendedProductIds":["catalog id"],"missingItems":[{"name":"...","reason":"...","category":"clothing|shoes|accessories","productId":"catalog id or null"}]}]}. ${preferences}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: imageBase64 } },
          ],
        },
      ],
      config: { responseMimeType: "application/json", maxOutputTokens: 8192 },
    });

    const responseText = response.text;
    if (!responseText) throw new Error("The stylist returned an empty response.");
    const generated = JSON.parse(responseText) as {
      summary?: unknown;
      looks?: Array<{
        title?: unknown;
        description?: unknown;
        recommendedProductIds?: unknown[];
        missingItems?: Array<{
          name?: unknown;
          reason?: unknown;
          category?: unknown;
          productId?: unknown;
        }>;
      }>;
    };
    const validProductIds = new Set(catalogForPrompt.map((product) => product.id));
    const cleaned = {
      summary: typeof generated.summary === "string" ? generated.summary : "",
      looks: (Array.isArray(generated.looks) ? generated.looks : []).slice(0, 3).map((look) => ({
        title: typeof look.title === "string" ? look.title : "A fresh way to wear it",
        description: typeof look.description === "string" ? look.description : "",
        recommendedProductIds: (Array.isArray(look.recommendedProductIds)
          ? look.recommendedProductIds
          : []
        ).filter(
          (id): id is string => typeof id === "string" && validProductIds.has(id),
        ),
        missingItems: (Array.isArray(look.missingItems) ? look.missingItems : [])
          .slice(0, 3)
          .map((item) => ({
            name: typeof item.name === "string" ? item.name : "A finishing piece",
            reason: typeof item.reason === "string" ? item.reason : "It would complete the look.",
            category:
              item.category === "shoes" || item.category === "accessories"
                ? item.category
                : "clothing",
            productId:
              typeof item.productId === "string" && validProductIds.has(item.productId)
                ? item.productId
                : null,
          })),
      })),
    };

    res.json(AnalyzeOutfitResponse.parse(cleaned));
  } catch (error) {
    req.log.error({ err: error }, "Outfit analysis failed");
    res.status(503).json({
      error: "The stylist could not analyze this photo right now. Try again in a moment.",
    });
  }
});

export default router;
