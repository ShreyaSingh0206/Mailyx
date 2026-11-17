import express from "express";
import { protect, authorize } from "../Middleware/authMiddleware.js";
import { listClients, linkClient, syncClient } from "../controllers/clientController.js";

const router = express.Router();

router.use(protect, authorize("assistant"));

router.get("/", listClients);
router.post("/link", linkClient);
router.post("/:id/sync", syncClient);

export default router;