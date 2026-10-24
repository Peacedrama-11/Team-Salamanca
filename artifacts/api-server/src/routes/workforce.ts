import { Router, type IRouter } from "express";
import {
  GetMalaysiaLabourMarketResponse,
} from "@workspace/api-zod";
import { getMalaysiaLabourMarketData } from "../lib/dataGovMalaysia";

const router: IRouter = Router();

router.get("/workforce/labour-market", async (req, res): Promise<void> => {
  try {
    const data = await getMalaysiaLabourMarketData();
    res.json(GetMalaysiaLabourMarketResponse.parse(data));
  } catch (error) {
    req.log.warn({ err: error }, "Unable to retrieve official labour-market data");
    res.status(502).json({
      error: "Official Malaysia labour-force data is unavailable. Please retry.",
    });
  }
});

export default router;
