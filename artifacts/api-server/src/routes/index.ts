import { Router, type IRouter } from "express";
import authRouter from "./auth";
import healthRouter from "./health";
import productsRouter from "./products";
import stylistRouter from "./stylist";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(authRouter);
router.use(stylistRouter);

export default router;
