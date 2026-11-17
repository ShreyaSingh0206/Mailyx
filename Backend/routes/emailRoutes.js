import express from "express";
import { protect, authorize } from "../Middleware/authMiddleware.js";
import { isId } from "../utils/scope.js";
import {
  listEmails, listMyEmails, getCounts, getEmail,
  analyzeOne, analyzePendingNow,
  updateClassification, saveDraft, generateDraft, sendReply, askAI,
  markHandled, requestTakeover, addNote,
} from "../controllers/emailController.js";

const router = express.Router();

router.use(protect);

// reject malformed ids early (also stops CastErrors)
router.param("id", (req, res, next, id) =>
  isId(id) ? next() : res.status(400).json({ success: false, message: "Invalid id" })
);

const assistantOnly = authorize("assistant");
const clientOnly = authorize("client");

// ---- static routes first, so "/:id" never swallows them
router.get("/counts", getCounts);                                   // both roles
router.get("/mine", clientOnly, listMyEmails);                      // client dashboard
router.post("/analyze-pending", assistantOnly, analyzePendingNow);  // assistant
router.get("/", assistantOnly, listEmails);                         // assistant inbox

// ---- single email
router.get("/:id", getEmail);                                       // both (scoped, trimmed for clients)
router.post("/:id/analyze", assistantOnly, analyzeOne);
router.patch("/:id/classification", assistantOnly, updateClassification);
router.put("/:id/draft", saveDraft);                                // both (clients: only emails they must answer)
router.post("/:id/draft/generate", generateDraft);                  // both (same rule)
router.post("/:id/send", sendReply);                                // both (same rule)
router.post("/:id/ask", assistantOnly, askAI);

router.patch("/:id/handled", markHandled);                          // both
router.post("/:id/takeover", clientOnly, requestTakeover);          // client
router.post("/:id/notes", addNote);                                 // both

export default router;