# 🤖 AI Interview Assistant

A full-stack web application designed to automate and streamline the
initial technical screening process for developer roles. This tool uses
generative AI to conduct a realistic, timed interview and provides a
comprehensive dashboard for recruiters to review candidate performance.

---

## ✨ Key Features

- 📄 **Smart Resume Parsing**: Automatically extracts candidate
  details (Name, Email, Phone) from PDF and DOCX resumes using robust
  heuristic-based logic.
- 🤖 **Dynamic AI Question Generation**: Generates a sequence of
  technical questions (2 Easy, 2 Medium, 2 Hard) tailored for a
  Full-Stack (React/Node.js) role using the Google Gemini API.
- ⏱️ **Timed & Automated Flow**: Each question has a specific timer
  (Easy: 20s, Medium: 60s, Hard: 120s), and the interview progresses
  automatically, submitting the answer when time runs out.
- 🧠 **AI-Powered Evaluation**: Candidate answers are evaluated in
  real-time by the AI to provide a score (0-5) and constructive
  feedback for each question.
- 📈 **Comprehensive Interviewer Dashboard**: A dashboard for
  recruiters to view all candidates, sort them by name or score, and
  search by contact details.
- 📋 **Detailed Interview Transcripts**: Clicking on a candidate
  reveals a detailed modal with their final summary, score, and a full
  transcript of questions, answers, and AI feedback.
- 🔄 **Persistent Sessions**: Candidate interview progress is saved
  locally in the browser. If a candidate accidentally closes the tab,
  they can seamlessly resume their interview.

---

## 🛠️ Tech Stack

### Frontend

- **React.js** -- A JavaScript library for building user interfaces.
- **Redux Toolkit** -- The recommended approach for writing Redux
  logic.
- **Redux Persist** -- For persisting and rehydrating a Redux store.
- **Ant Design** -- A UI design language and React UI library.
- **Axios** -- A promise-based HTTP client.

### Backend

- **Node.js** -- A JavaScript runtime built on Chrome's V8 engine.
- **Express.js** -- A minimal and flexible Node.js web application
  framework.
- **Google Gemini API** -- For dynamic question generation and
  evaluation.
- **Multer** -- Middleware for handling multipart/form-data.
- **pdf-parse** & **Mammoth** -- For parsing resumes.

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- npm (Node Package Manager)

### Installation & Setup

#### 1. Clone the repository

```bash
git clone https://github.com/AbhinavRai24/interview-assistant.git
cd interview-assistant
```

#### 2. Setup the Backend Server

```bash
cd server
npm install
```

Create a `.env` file inside the `server` directory and add your Google
Gemini API key:

```bash
# server/.env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
USE_GEMINI=true
PORT=4000
```

Start the server:

```bash
node index.js
```

Backend runs on: <http://localhost:4000>

#### 3. Setup the Frontend Client

Open a new terminal:

```bash
cd client
npm install
npm run dev
```

Frontend runs on: <http://localhost:5173>

---

## 🎯 Usage

### As an Interviewee

1.  Navigate to the **Interviewee (Chat)** tab.
2.  Upload your resume (PDF or DOCX). Contact details will be parsed
    automatically.
3.  If details are missing, fill them in via a modal.
4.  Click **Start Interview** to begin.
5.  Answer each question within the given time limit. The system
    auto-moves to the next one.
6.  After 6 questions, the interview ends with a final evaluation.

### As an Interviewer

1.  Navigate to the **Interviewer (Dashboard)** tab.
2.  View all candidates who have completed or started an interview.
3.  Use the search bar to filter candidates or click headers to sort.
4.  Click **View** to see detailed results: final score, AI-generated
    summary, and question-answer feedback.

---

### 💙 Made with love by [Abhinav Rai](https://github.com/AbhinavRai2004) 💙
