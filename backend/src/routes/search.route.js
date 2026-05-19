import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { unifiedSearch } from "../controllers/search.controller.js";

const router = express.Router();

router.get("/", protectRoute, unifiedSearch);

export default router;
