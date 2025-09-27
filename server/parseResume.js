const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

async function parseResume(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    let text = '';

    if (ext === '.pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        text = data.text || '';
    } else if (ext === '.docx') {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value || '';
    } else {
        text = fs.readFileSync(filePath, 'utf8');
    }

    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
    const phoneMatch = text.match(/(\+?\d[\d\-\s()]{7,}\d)/);

    const nameMatch = text.split('\n').map(l => l.trim()).find(line => /^[A-Z][a-z]+(\s[A-Z][a-z]+)+$/.test(line));

    const email = emailMatch ? emailMatch[0] : null;
    const phone = phoneMatch ? phoneMatch[0].replace(/\s+/g, ' ').trim() : null;
    const name = nameMatch || null;

    return { text, name, email, phone };
}

module.exports = { parseResume };