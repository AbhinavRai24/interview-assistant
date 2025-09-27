const { v4: uuidv4 } = require("uuid");

const USE_GEMINI = (process.env.USE_GEMINI || "false") === "true";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;


// --- Helper function to call Gemini and parse the JSON response ---
async function callGenerativeAI(prompt) {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      response_mime_type: "application/json", // Instructs the model to output JSON
      temperature: 0.7
    }
  };

  const res = await fetch(GEMINI_API_URL, {
    // This will now work correctly
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("Gemini API Error:", errorBody);
    throw new Error(`Gemini API failed with status ${res.status}`);
  }

  const json = await res.json();

  // Extract the JSON string from the model's response
  const responseText = json.candidates[0].content.parts[0].text;
  return JSON.parse(responseText); // Parse the clean JSON string
}

// --- Main function that routes to mock or real AI ---
async function callGemini(prompt, options = {}) {
  if (!USE_GEMINI || !GEMINI_API_KEY) {
    console.log("Using Mock AI Response for mode:", options.mode);
    return getMockResponse(options);
  }

  try {
    let generatedPrompt;
    switch (options.mode) {
      case "generate-question": {
        const { difficulty } = options;
        const timeLimit =
          difficulty === "easy" ? 20 : difficulty === "medium" ? 60 : 120;
        generatedPrompt = `You are an expert interviewer for a full stack (React/Node) developer role.
                    Generate one unique, ${difficulty}-level interview question.
                    Return the response as a single, minified JSON object with these exact keys: "id", "text", "difficulty", and "timeLimit".
                    - "id": a new unique UUID.
                    - "text": the question.
                    - "difficulty": "${difficulty}".
                    - "timeLimit": ${timeLimit}.`;
        return await callGenerativeAI(generatedPrompt);
      }

      case "evaluate": {
        const { question, answer } = options;
        generatedPrompt = `You are an expert interviewer evaluating a candidate's answer.
                    The question was: "${question.text}".
                    The candidate's answer was: "${
                      answer || "No answer provided."
                    }".
                    Evaluate the answer on a scale of 0 to 5. Be critical but fair. Provide brief, constructive feedback.
                    Return the response as a single, minified JSON object with these exact keys: "score" (an integer from 0 to 5) and "feedback" (a string, max 40 words).`;
        return await callGenerativeAI(generatedPrompt);
      }

      case "final-summary": {
        const { payload: questions } = options;
        const transcript = JSON.stringify(
          questions.map((q) => ({
            question: q.text,
            difficulty: q.difficulty,
            answer: q.answerText,
            score: q.score
          }))
        );

        generatedPrompt = `You are a hiring manager creating a final summary of a candidate's interview.
                    Here is the interview transcript: ${transcript}.
                    Based ONLY on this transcript:
                    1. Calculate a final percentage score. The max score for each question is 5.
                    2. Write a concise summary (max 80 words) of the candidate's performance, highlighting strengths and weaknesses.
                    Return the response as a single, minified JSON object with these exact keys: "finalScorePercent" (an integer from 0 to 100) and "summary" (your summary text).`;
        return await callGenerativeAI(generatedPrompt);
      }

      default:
        throw new Error("Invalid AI proxy mode");
    }
  } catch (error) {
    console.error("Error in callGemini:", error);
    // Fallback to mock response on API failure to prevent app crash
    return getMockResponse(options);
  }
}

// --- Your original mock logic, now in a separate function ---
function getMockResponse(options) {
  if (options.mode === "generate-question") {
    const difficulty = options.difficulty || "easy";
    const qid = uuidv4();
    const timeLimit =
      difficulty === "easy" ? 20 : difficulty === "medium" ? 60 : 120;
    const text = mockQuestionText(difficulty, options.index || 0);
    return { id: qid, difficulty, text, timeLimit };
  } else if (options.mode === "evaluate") {
    const score = Math.min(5, Math.max(0, Math.floor(Math.random() * 6)));
    const feedback = `Mock feedback (score ${score}). Mentioned key points: ...`;
    return { score, feedback };
  } else if (options.mode === "final-summary") {
    const qs = options.payload || [];
    const total = qs.reduce((s, q) => s + (q.score || 0), 0);
    const percent =
      qs.length > 0 ? Math.round((total / (qs.length * 5)) * 100) : 0;
    return {
      finalScorePercent: percent,
      summary: `Mock summary: candidate scored ${percent}%`
    };
  } else {
    return { text: "Mock response (no GEMINI)." };
  }
}

// --- Helper for mock questions ---
function mockQuestionText(difficulty, index) {
  const easy = [
    "What is a React component? Give an example.",
    "What is the difference between var, let and const in JavaScript?"
  ];
  const medium = [
    "Explain how React hooks work and create a small example using useEffect to fetch data.",
    "Design a simple REST API in Node.js to handle user creation; what endpoints and middleware do you use?"
  ];
  const hard = [
    "Given a React app that suffers from performance issues, how would you profile and improve it? Mention code-level changes.",
    "Design an authentication system for a multi-service app, including token strategy and refresh tokens."
  ];
  if (difficulty === "easy") return easy[index % easy.length];
  if (difficulty === "medium") return medium[index % medium.length];
  return hard[index % hard.length];
}

module.exports = { callGemini };
