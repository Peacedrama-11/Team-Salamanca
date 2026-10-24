import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workforceRouter from "./workforce";
import jobsRouter from "./jobs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(workforceRouter);
router.use(jobsRouter);

export default router;
