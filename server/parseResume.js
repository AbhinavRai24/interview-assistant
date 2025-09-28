const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

async function parseResume(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let text = '';

  if (ext === '.pdf') {
    // Lazy require of pdf-parse and defensive handling so we don't crash
    let pdfParse;
    try {
      pdfParse = require('pdf-parse');
      // handle packages that use default export
      pdfParse = pdfParse && (pdfParse.default || pdfParse);
    } catch (e) {
      console.warn('pdf-parse require failed; falling back to safe empty text.', e && e.message);
      pdfParse = null;
    }

    if (pdfParse) {
      try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        text = data && data.text ? data.text : '';
      } catch (err) {
        // If parsing fails, do not crash server — return safe fallback
        console.error('pdf-parse failed to parse file:', err && err.message ? err.message : err);
        text = '';
      }
    } else {
      // pdf-parse not available — safe fallback (empty)
      text = '';
    }
  } else if (ext === '.docx') {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      text = result && result.value ? result.value : '';
    } catch (err) {
      console.error('mammoth failed to parse docx:', err && err.message ? err.message : err);
      text = '';
    }
  } else {
    try {
      text = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      console.error('Failed to read uploaded file as text:', err && err.message ? err.message : err);
      text = '';
    }
  }

  // safe regex matches (case-insensitive email/phone)
  let emailMatch = null;
  let phoneMatch = null;
  try {
    emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
    phoneMatch = text.match(/(\+?\d[\d\-\s()]{7,}\d)/);
  } catch (e) {
    emailMatch = null;
    phoneMatch = null;
  }

  const nameMatch = text
    .split('\n')
    .map((l) => l.trim())
    .find((line) => /^[A-Z][a-z]+(\s[A-Z][a-z]+)+$/.test(line));

  const email = emailMatch ? emailMatch[0] : null;
  const phone = phoneMatch ? phoneMatch[0].replace(/\s+/g, ' ').trim() : null;
  const name = nameMatch || null;

  return { text, name, email, phone };
}

module.exports = { parseResume };
