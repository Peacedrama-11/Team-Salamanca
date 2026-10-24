import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workforceRouter from "./workforce";
import jobsRouter from "./jobs";
import { createCvRouter } from "./cv";
import { jobSnapshot } from "../lib/job-collector";

const router: IRouter = Router();

router.use(healthRouter);
router.use(workforceRouter);
router.use(jobsRouter);
router.use(createCvRouter(jobSnapshot));

export default router;
