const { v4: uuidv4 } = require("uuid");

const USE_GEMINI = (process.env.USE_GEMINI || "false") === "true";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";

let aiClient = null;
let geminiReady = false;

(function initGemini() {
  if (!USE_GEMINI || !GEMINI_API_KEY) {
    return;
  }

  try {
    let sdk;
    try {
      sdk = require("@google/genai");
    } catch (e) {
      try {
        sdk = require("@google/generative-ai");
      } catch (e2) {
        sdk = null;
      }
    }

    if (!sdk) {
      geminiReady = false;
      return;
    }

    const GoogleGenAI = sdk.GoogleGenAI || sdk.GoogleGenAI || sdk.default || sdk;

    try {
      aiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    } catch (err) {
      if (sdk && typeof sdk === "function") {
        aiClient = sdk({ apiKey: GEMINI_API_KEY });
      } else if (sdk && sdk.GoogleGenAI) {
        aiClient = new sdk.GoogleGenAI({ apiKey: GEMINI_API_KEY });
      } else {
        throw err;
      }
    }

    if (!aiClient || !aiClient.models || typeof aiClient.models.generateContent !== "function") {
      aiClient = null;
      geminiReady = false;
      return;
    }

    geminiReady = true;
  } catch (err) {
    geminiReady = false;
  }
})();

function extractJsonFromText(text) {
  if (!text || typeof text !== "string") return null;

  try {
    return JSON.parse(text);
  } catch (e) {}

  const codeFenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const maybeJson = codeFenceMatch ? codeFenceMatch[1].trim() : null;
  if (maybeJson) {
    try {
      return JSON.parse(maybeJson);
    } catch (e) {}
  }

  const braceMatch = text.match(/(\{[\s\S]*\})/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[1]);
    } catch (e) {}
  }

  return null;
}

async function callGenerativeAI(promptText, { model = GEMINI_MODEL, temperature = 0.7 } = {}, maxRetries = 4) {
  if (!aiClient) throw new Error("Gemini client not initialized");

  let attempt = 0;
  let lastErr = null;

  const requestPayload = {
    model,
    contents: promptText
  };

  while (attempt <= maxRetries) {
    try {
      const resp = await aiClient.models.generateContent(requestPayload);

      let rawText = null;
      if (!resp) rawText = "";
      else if (typeof resp.text === "function") {
        rawText = resp.text();
      } else if (typeof resp.text === "string") {
        rawText = resp.text;
      } else if (resp.response && typeof resp.response.text === "function") {
        rawText = resp.response.text();
      } else if (resp.output && Array.isArray(resp.output) && resp.output[0] && resp.output[0].content) {
        rawText = resp.output[0].content;
        if (typeof rawText === "object" && rawText.text) rawText = rawText.text;
      } else {
        rawText = JSON.stringify(resp);
      }

      const parsed = extractJsonFromText(rawText);
      if (parsed !== null) return parsed;

      return rawText;
    } catch (err) {
      lastErr = err;
      attempt += 1;

      const msg = String(err && (err.message || err));
      const isTransient = /(429|503|UNAVAILABLE|quota|rate limit|overload)/i.test(msg);

      if (attempt > maxRetries || !isTransient) break;

      const backoffMs = Math.min(60000, Math.pow(2, attempt) * 1000 + Math.round(Math.random() * 300));
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }

  const e = new Error(`Gemini API failed after ${maxRetries} retries: ${lastErr && (lastErr.message || lastErr)}`);
  e.cause = lastErr;
  throw e;
}

function mockQuestionText(difficulty, index) {
  const easy = [
    "What is a React component? Give an example.",
    "What is the difference between var, let and const in JavaScript?"
  ];
  const medium = [
    "Explain how React hooks work with an example using useEffect.",
    "Design a simple REST API in Node.js for user creation."
  ];
  const hard = [
    "How do you profile and improve performance in a React app?",
    "Design an authentication system with refresh tokens across services."
  ];
  if (difficulty === "easy") return easy[index % easy.length];
  if (difficulty === "medium") return medium[index % medium.length];
  return hard[index % hard.length];
}

function getMockResponse(options) {
  if (options.mode === "generate-question") {
    const difficulty = options.difficulty || "easy";
    const qid = uuidv4();
    const timeLimit = difficulty === "easy" ? 20 : difficulty === "medium" ? 60 : 120;
    const text = mockQuestionText(difficulty, options.index || 0);
    return { id: qid, difficulty, text, timeLimit };
  } else if (options.mode === "evaluate") {
    const score = Math.floor(Math.random() * 6);
    return { score, feedback: `Mock feedback (score ${score}).` };
  } else if (options.mode === "final-summary") {
    const qs = options.payload || [];
    const total = qs.reduce((s, q) => s + (q.score || 0), 0);
    const percent = qs.length > 0 ? Math.round((total / (qs.length * 5)) * 100) : 0;
    return { finalScorePercent: percent, summary: `Mock summary: ${percent}%` };
  }
  return { text: "Mock response (no GEMINI)." };
}

async function callGemini(prompt, options = {}) {
  if (!USE_GEMINI || !GEMINI_API_KEY || !geminiReady) {
    return getMockResponse(options);
  }

  try {
    switch (options.mode) {
      case "generate-question": {
        const { difficulty } = options;
        const timeLimit = difficulty === "easy" ? 20 : difficulty === "medium" ? 60 : 120;
        const generatedPrompt = `You are an expert interviewer for a Full Stack (React + Node) developer role.
                                  Generate one unique ${difficulty} question (do not include the answer).
                                  Return a single JSON object with keys exactly: "id", "text", "difficulty", "timeLimit".
                                  "id": a uuid, "text": the question text, "difficulty": "${difficulty}", "timeLimit": ${timeLimit}.
                                  Respond WITHIN a JSON object only (no extra commentary).`;

        const out = await callGenerativeAI(generatedPrompt, { model: GEMINI_MODEL, temperature: 0.7 });
        if (typeof out === "string") {
          const parsed = extractJsonFromText(out);
          if (parsed) return parsed;
          return { id: uuidv4(), difficulty, text: String(out), timeLimit };
        }
        return out;
      }

      case "evaluate": {
        const { question, answer } = options;
        const generatedPrompt = `You are an experienced interviewer grading candidate answers on the basis of actual answer of the question.
                                  Question: ${question.text}
                                  Candidate answer: ${answer || "[no answer]"}
                                  Return a single JSON object (exact keys): "score" (integer 0-5) and "feedback" (short string, <= 40 words).
                                  Respond ONLY with the JSON object.`;

        const out = await callGenerativeAI(generatedPrompt, { model: GEMINI_MODEL, temperature: 0.5 });
        if (typeof out === "object" && out !== null) return out;
        const parsed = extractJsonFromText(String(out));
        if (parsed) return parsed;
        return { score: 2, feedback: String(out).slice(0, 200) };
      }

      case "final-summary": {
        const { payload: questions } = options;
        const transcript = questions.map((q) => ({
          question: q.text,
          difficulty: q.difficulty,
          answer: q.answerText || "",
          score: q.score || 0
        }));

        const generatedPrompt = `You are a hiring manager summarizing an interview for a Full Stack (React/Node) role.
Given the following list (JSON): ${JSON.stringify(transcript)}.
1) Compute a final percentage score (0-100) where each question is scored 0-5.
2) Produce a concise summary (<=80 words) highlighting strengths and weaknesses.
Return a single JSON object with exact keys: "finalScorePercent" (integer) and "summary" (string).
Respond ONLY with the JSON object.`;

        const out = await callGenerativeAI(generatedPrompt, { model: GEMINI_MODEL, temperature: 0.4 });
        if (typeof out === "object" && out !== null) return out;
        const parsed = extractJsonFromText(String(out));
        if (parsed) return parsed;
        const total = (questions || []).reduce((s, q) => s + (q.score || 0), 0);
        const percent = questions && questions.length ? Math.round((total / (questions.length * 5)) * 100) : 0;
        return { finalScorePercent: percent, summary: String(out).slice(0, 400) };
      }

      default:
        throw new Error("Invalid AI proxy mode");
    }
  } catch (error) {
    return getMockResponse(options);
  }
}

module.exports = { callGemini };
