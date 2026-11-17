export const fail = (res, status, message) => res.status(status).json({ success: false, message });

/** Wraps a controller so errors always become a JSON response (no HTML stack traces). */
export const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
    if (res.headersSent) return;

    if (err.name === "LLMError") {
      return res.status(502).json({
        success: false,
        message: "The AI service is unavailable right now. Please try again.",
        ...(process.env.NODE_ENV !== "production" && { details: err.attempts }),
      });
    }
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};