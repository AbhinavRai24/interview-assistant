require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { parseResume } = require('./parseResume');
const { callGemini } = require('./aiProxy');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 5000;
const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, UPLOAD_DIR); },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
});
const upload = multer({ storage });


app.post('/api/upload-resume', upload.single('resume'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No file uploaded' });
        const parsed = await parseResume(file.path);
        res.json({ id: uuidv4(), filename: file.originalname, filepath: `/uploads/${path.basename(file.path)}`, parsed });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: String(err) });
    }
});

app.post('/api/generate-question', async (req, res) => {
    try {
        const { difficulty, index } = req.body;
        // Pass relevant options for generating a prompt
        const out = await callGemini(null, { mode: 'generate-question', difficulty, index });
        res.json(out);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to generate question" });
    }
});

app.post('/api/evaluate', async (req, res) => {
    try {
        const { question, answer } = req.body;
        // Pass question and answer for evaluation
        const out = await callGemini(null, { mode: 'evaluate', question, answer });
        res.json(out);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to evaluate answer" });
    }
});

app.post('/api/final-summary', async (req, res) => {
    try {
        const { questions } = req.body;
        // Pass all questions for the final summary
        const out = await callGemini(null, { mode: 'final-summary', payload: questions });
        res.json(out);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to generate summary" });
    }
});

app.listen(PORT, () => console.log(`Server listening on ${PORT}`));