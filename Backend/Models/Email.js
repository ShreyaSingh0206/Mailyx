import mongoose from "mongoose";

const person = new mongoose.Schema({ name: String, email: String }, { _id: false });

const emailSchema = new mongoose.Schema(
  {
    assistant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    threadId: { type: String, index: true },
    from: person,
    to: [person],
    subject: { type: String, required: true },
    body: { type: String, required: true },
    receivedAt: { type: Date, default: Date.now, index: true },
    isRead: { type: Boolean, default: false },

    // AI output
    aiStatus: { type: String, enum: ["pending", "done", "failed"], default: "pending" },
    aiProvider: String, // "gemini" | "grok" | "seed"
    aiProcessedAt: Date,
    summary: String,
    aiReasoning: String, // why the AI chose this classification
    actionItems: [
      {
        text: String,
        dueDate: Date,
        done: { type: Boolean, default: false },
      },
    ],

    // Classification (the assistant can override it)
    classification: {
      type: String,
      enum: ["assistant_reply", "client_reply", "no_reply"],
      index: true,
    },
    aiClassification: String, // original AI answer, kept after a correction
    classificationSource: { type: String, enum: ["ai", "assistant", "client"], default: "ai" },
    labels: [{ type: String, enum: ["important", "meeting", "waiting", "follow_up"] }],

    // Reply draft
    draft: {
      subject: String,
      body: String,
      source: { type: String, enum: ["ai", "assistant", "client"] },
      updatedAt: Date,
    },

    // Workflow
    status: { type: String, enum: ["open", "handled", "replied"], default: "open", index: true },
    handledAt: Date,
    handledByRole: { type: String, enum: ["assistant", "client"] }, // who closed it
    repliedByRole: { type: String, enum: ["assistant", "client"] }, // who sent the reply
    repliedAt: Date,
    takeoverRequested: { type: Boolean, default: false },
    notes: [
      {
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: String,
        text: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Ground truth from the seed script, used later to measure AI accuracy.
    // Hidden from normal queries.
    seedExpected: { type: String, select: false },
  },
  { timestamps: true }
);

emailSchema.index({ subject: "text", body: "text", summary: "text" });

export default mongoose.model("Email", emailSchema);