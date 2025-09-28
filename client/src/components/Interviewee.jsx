import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  Button,
  Input,
  List,
  Card,
  Row,
  Col,
  Progress,
  Modal,
  message,
  Form
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import {
  addCandidate,
  updateCandidate,
  addChatMessage,
  addQuestion,
  setCandidateStatus
} from "../slices/candidatesSlice";
import {
  uploadResume,
  generateQuestion,
  evaluateAnswer,
  finalSummary
} from "../api/api";
import { v4 as uuidv4 } from "uuid";

const { TextArea } = Input;

function formatTime(sec) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export default function Interviewee() {
  const dispatch = useDispatch();
  const candidates = useSelector((s) => s.candidates.list);
  const [uploading, setUploading] = useState(false);
  const [activeCandidateId, setActiveCandidateId] = useState(null);
  const [draftAnswer, setDraftAnswer] = useState("");
  const [remainingSec, setRemainingSec] = useState(null);
  const timerRef = useRef(null);
  const [showWelcome, setShowWelcome] = useState(false);

  const submittedQuestionsRef = useRef(new Set());
  const welcomeDismissedRef = useRef(
    (typeof window !== "undefined" &&
      window.localStorage.getItem("welcomeDismissed")) === "true"
  );

  useEffect(() => {
    const inProg = candidates.find((c) => c.status === "in_progress");
    if (inProg && !welcomeDismissedRef.current) {
      setShowWelcome(true);
      setActiveCandidateId(inProg.id);
    }
  }, []);

  useEffect(() => {
    if (!activeCandidateId) return;
    const c = candidates.find((x) => x.id === activeCandidateId);
    if (!c) return;
    const q = (c.questions && c.questions[c.currentQuestionIndex]) || null;
    if (q && c.status === "in_progress") {
      const startedAt = q.startedAt || Date.now();
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remain = Math.max(0, q.timeLimit - elapsed);
      setRemainingSec(remain);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const elapsed2 = Math.floor(
          (Date.now() - (q.startedAt || Date.now())) / 1000
        );
        const r = Math.max(0, q.timeLimit - elapsed2);
        setRemainingSec(r);
        if (r <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          try {
            const latestCandidate = candidates.find(
              (cc) => cc.id === activeCandidateId
            );
            const latestQ =
              latestCandidate &&
              latestCandidate.questions &&
              latestCandidate.questions[latestCandidate.currentQuestionIndex];
            if (
              latestQ &&
              !submittedQuestionsRef.current.has(latestQ.id) &&
              !latestQ.answeredAt
            ) {
              handleSubmitAnswer("");
            } else {
              // already submitted or answered; do nothing
            }
          } catch (err) {
            console.error("Auto-submit guard error:", err);
          }
        }
      }, 400);
    } else {
      setRemainingSec(null);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [activeCandidateId, candidates]);

  async function startNewInterview(parsed) {
    const id = uuidv4();
    const candidate = {
      id,
      name: parsed.name || null,
      email: parsed.email || null,
      phone: parsed.phone || null,
      resumeFilename: parsed.filename || null,
      resumePath: parsed.filepath || null,
      status: "not_started",
      startedAt: null,
      lastSeenAt: Date.now(),
      currentQuestionIndex: 0,
      questions: [],
      finalScore: null,
      summary: null,
      chatHistory: []
    };
    dispatch(addCandidate(candidate));
    setActiveCandidateId(id);

    if (!candidate.name || !candidate.email || !candidate.phone) {
      const missing = [];
      if (!candidate.name) missing.push("name");
      if (!candidate.email) missing.push("email");
      if (!candidate.phone) missing.push("phone");
      message.info(`Please provide missing fields: ${missing.join(", ")}`);
    }
  }

  async function handleUpload({ file }) {
    setUploading(true);
    try {
      const actualFile = file && file.originFileObj ? file.originFileObj : file;

      if (!actualFile) {
        throw new Error("No file provided for upload.");
      }

      const form = new FormData();
      form.append("resume", actualFile);

      const resp = await uploadResume(form);
      // resp: { id, filename, filepath, parsed: { name,email,phone,text } }
      await startNewInterview({
        ...resp.parsed,
        filename: resp.filename,
        filepath: resp.filepath
      });
      message.success(
        "Resume uploaded and parsed. Fill missing fields if any and start."
      );
    } catch (err) {
      console.error(
        "handleUpload error:",
        err && err.message ? err.message : err
      );

      if (err && err.message && err.message.toLowerCase().includes("network")) {
        message.error(
          "Network error: could not reach backend. Is server running?"
        );
      } else {
        message.error("Failed to upload resume. See console for details.");
      }
    } finally {
      setUploading(false);
    }
  }

  function getActiveCandidate() {
    return candidates.find((c) => c.id === activeCandidateId);
  }

  async function ensureFieldsCompleteAndStart() {
    const c = getActiveCandidate();
    if (!c) {
      message.error("No active candidate");
      return;
    }

    const missing = [];
    if (!c.name) missing.push("name");
    if (!c.email) missing.push("email");
    if (!c.phone) missing.push("phone");

    const startInterviewProcess = (candidateId) => {
      dispatch(
        updateCandidate({
          id: candidateId,
          changes: { status: "in_progress", startedAt: Date.now() }
        })
      );
      beginQuestionSequence(candidateId);
    };

    if (missing.length) {
      let formInstance; // To hold the form instance
      Modal.confirm({
        title: "Complete Your Information",
        icon: null,
        content: (
          <Form
            ref={(instance) => (formInstance = instance)}
            layout="vertical"
            initialValues={{ name: c.name, email: c.email, phone: c.phone }}
          >
            <p>
              Please provide the missing information to start the interview.
            </p>
            {missing.includes("name") && (
              <Form.Item
                label="Name"
                name="name"
                rules={[{ required: true, message: "Please input your name!" }]}
              >
                <Input />
              </Form.Item>
            )}
            {missing.includes("email") && (
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  {
                    required: true,
                    type: "email",
                    message: "Please input a valid email!"
                  }
                ]}
              >
                <Input />
              </Form.Item>
            )}
            {missing.includes("phone") && (
              <Form.Item
                label="Phone"
                name="phone"
                rules={[
                  { required: true, message: "Please input your phone number!" }
                ]}
              >
                <Input />
              </Form.Item>
            )}
          </Form>
        ),
        okText: "Start Interview",
        onOk: async () => {
          try {
            const values = await formInstance.validateFields();
            dispatch(updateCandidate({ id: c.id, changes: values }));
            startInterviewProcess(c.id);
          } catch (errorInfo) {
            console.log("Failed:", errorInfo);
            return Promise.reject();
          }
        }
      });
    } else {
      startInterviewProcess(c.id);
    }
  }

  async function beginQuestionSequence(candidateId) {
    const seq = [
      { difficulty: "easy" },
      { difficulty: "easy" },
      { difficulty: "medium" },
      { difficulty: "medium" },
      { difficulty: "hard" },
      { difficulty: "hard" }
    ];
    const idx = 0;
    const out = await generateQuestion(seq[idx].difficulty, idx);
    const question = {
      id: out.id || uuidv4(),
      text: out.text,
      difficulty: out.difficulty || seq[idx].difficulty,
      timeLimit:
        out.timeLimit ||
        (out.difficulty === "easy"
          ? 20
          : out.difficulty === "medium"
          ? 60
          : 120),
      startedAt: Date.now(),
      answeredAt: null,
      answerText: null,
      score: null,
      feedback: null
    };
    dispatch(addQuestion({ id: candidateId, question }));
    dispatch(
      addChatMessage({
        id: candidateId,
        message: { role: "ai", text: `Q1: ${question.text}`, ts: Date.now() }
      })
    );
    dispatch(setCandidateStatus({ id: candidateId, status: "in_progress" }));
  }

  async function handleSubmitAnswer(text) {
    const c = getActiveCandidate();
    if (!c) return;
    const qIndex = c.currentQuestionIndex;
    const question = c.questions[qIndex];
    if (!question) return;
    if (submittedQuestionsRef.current.has(question.id)) {
      console.log(
        "handleSubmitAnswer: already submitted for question",
        question.id
      );
      return;
    }
    submittedQuestionsRef.current.add(question.id);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const candidateMsgText = text || "[no answer]";

    const lastMsg =
      c.chatHistory && c.chatHistory.length
        ? c.chatHistory[c.chatHistory.length - 1]
        : null;
    if (
      !lastMsg ||
      lastMsg.role !== "candidate" ||
      lastMsg.text !== candidateMsgText
    ) {
      dispatch(
        addChatMessage({
          id: c.id,
          message: {
            role: "candidate",
            text: candidateMsgText,
            ts: Date.now()
          }
        })
      );
    } else {
      console.log("Skipping duplicate chat message append for candidate");
    }

    try {
      const evalResp = await evaluateAnswer(question, text || "");
      const updatedQuestions = c.questions.map((qq, i) => {
        if (i === qIndex) {
          return {
            ...qq,
            answerText: text || "",
            answeredAt: Date.now(),
            score: evalResp.score,
            feedback: evalResp.feedback
          };
        }
        return qq;
      });
      dispatch(
        updateCandidate({ id: c.id, changes: { questions: updatedQuestions } })
      );
    } catch (err) {
      console.error(err);
    }

    const updatedCandidate = candidates.find((cand) => cand.id === c.id);
    const questionsForSummary = updatedCandidate
      ? updatedCandidate.questions
      : c.questions;

    if (qIndex + 1 >= 6) {
      try {
        const summaryResp = await finalSummary(questionsForSummary);
        dispatch(
          updateCandidate({
            id: c.id,
            changes: {
              finalScore: summaryResp.finalScorePercent || null,
              summary: summaryResp.summary || null,
              status: "finished"
            }
          })
        );
        message.success("Interview finished — summary generated.");
      } catch (err) {
        console.error("finalSummary failed", err);
      } finally {
        setActiveCandidateId(null);
      }
    } else {
      const nextIdx = qIndex + 1;
      const difficulties = ["easy", "easy", "medium", "medium", "hard", "hard"];
      try {
        const out = await generateQuestion(difficulties[nextIdx], nextIdx);
        const newQ = {
          id: out.id || uuidv4(),
          text: out.text,
          difficulty: out.difficulty || difficulties[nextIdx],
          timeLimit:
            out.timeLimit ||
            (out.difficulty === "easy"
              ? 20
              : out.difficulty === "medium"
              ? 60
              : 120),
          startedAt: Date.now(),
          answeredAt: null,
          answerText: null,
          score: null,
          feedback: null
        };
        dispatch(addQuestion({ id: c.id, question: newQ }));
        dispatch(
          updateCandidate({
            id: c.id,
            changes: { currentQuestionIndex: nextIdx }
          })
        );
        dispatch(
          addChatMessage({
            id: c.id,
            message: {
              role: "ai",
              text: `Q${nextIdx + 1}: ${newQ.text}`,
              ts: Date.now()
            }
          })
        );
        setDraftAnswer("");
      } catch (err) {
        console.error("Failed to generate next question:", err);
      }
    }
  }

  return (
    <div>
      <Row gutter={16}>
        <Col span={8}>
          <Card title="Upload Resume (PDF/DOCX)">
            <Upload
              beforeUpload={() => false} // prevents auto-upload
              onChange={({ file }) => handleUpload({ file })}
              accept=".pdf,.doc,.docx"
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />} loading={uploading}>
                Upload Resume
              </Button>
            </Upload>

            <div style={{ marginTop: 16 }}>
              <Button
                type="primary"
                onClick={() => ensureFieldsCompleteAndStart()}
                disabled={
                  !activeCandidateId ||
                  (getActiveCandidate() &&
                    getActiveCandidate().status !== "not_started")
                }
              >
                Start Interview
              </Button>
            </div>
          </Card>

          <Card title="Active Candidate" style={{ marginTop: 12 }}>
            {activeCandidateId ? (
              (() => {
                const c = getActiveCandidate();
                return (
                  <div>
                    <p>
                      <strong>Name:</strong> {c.name || "—"}
                    </p>
                    <p>
                      <strong>Email:</strong> {c.email || "—"}
                    </p>
                    <p>
                      <strong>Phone:</strong> {c.phone || "—"}
                    </p>
                    <p>
                      <strong>Status:</strong> {c.status}
                    </p>
                    {remainingSec != null && (
                      <p>
                        <strong>Time left:</strong> {formatTime(remainingSec)}
                      </p>
                    )}
                    {remainingSec != null && (
                      <Progress
                        percent={Math.round(
                          (remainingSec /
                            (c.questions[c.currentQuestionIndex].timeLimit ||
                              1)) *
                            100
                        )}
                      />
                    )}
                  </div>
                );
              })()
            ) : (
              <div>No active candidate selected or interview finished.</div>
            )}
          </Card>
        </Col>

        <Col span={16}>
          <Card title="Chat">
            <div
              style={{
                height: 400,
                overflow: "auto",
                border: "1px solid #eee",
                padding: 12
              }}
            >
              {activeCandidateId ? (
                (() => {
                  const c = getActiveCandidate();
                  return (c.chatHistory || []).map((m, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <b>{m.role === "ai" ? "Interviewer" : "You"}:</b> {m.text}
                    </div>
                  ));
                })()
              ) : (
                <div style={{ color: "#999" }}>
                  Upload a resume and start an interview to see chat.
                </div>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              <TextArea
                rows={4}
                value={draftAnswer}
                onChange={(e) => setDraftAnswer(e.target.value)}
                placeholder="Type your answer here (or auto-submitted when time ends)."
                disabled={getActiveCandidate()?.status !== "in_progress"}
              />
              <div style={{ marginTop: 8, textAlign: "right" }}>
                <Button
                  type="primary"
                  onClick={() => handleSubmitAnswer(draftAnswer)}
                  disabled={getActiveCandidate()?.status !== "in_progress"}
                >
                  Submit Answer
                </Button>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Modal
        open={showWelcome}
        onCancel={() => {
          setShowWelcome(false);
          try {
            if (typeof window !== "undefined") {
              window.localStorage.setItem("welcomeDismissed", "true");
            }
          } catch (e) {
            /* ignore storage errors */
          }
          welcomeDismissedRef.current = true;
        }}
        title="Welcome back"
        footer={[
          <Button
            key="close"
            onClick={() => {
              setShowWelcome(false);
              try {
                if (typeof window !== "undefined") {
                  window.localStorage.setItem("welcomeDismissed", "true");
                }
              } catch (e) {}
              welcomeDismissedRef.current = true;
            }}
          >
            Close
          </Button>,
          <Button
            key="resume"
            type="primary"
            onClick={() => {
              
              setShowWelcome(false);
            }}
          >
            Resume
          </Button>
        ]}
      >
        <p>
          You have an unfinished interview. Click Resume to continue or Close to
          dismiss.
        </p>
      </Modal>
    </div>
  );
}
