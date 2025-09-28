import axios from "axios";
const API = axios.create({
  baseURL: "http://localhost:4000/api",
  timeout: 30000
});

export async function uploadResume(formData) {
  const resp = await API.post("/upload-resume", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return resp.data;
}

export async function generateQuestion(difficulty, index) {
  const resp = await API.post("/generate-question", { difficulty, index });
  return resp.data;
}

export async function evaluateAnswer(question, answer) {
  const resp = await API.post("/evaluate", { question, answer });
  return resp.data;
}

export async function finalSummary(questions) {
  const resp = await API.post("/final-summary", { questions });
  return resp.data;
}
