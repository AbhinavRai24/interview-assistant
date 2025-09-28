export function extractContactInfo(text) {
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
    const phoneMatch = text.match(/(\+?\d[\d\-\s()]{7,}\d)/);
    const nameMatch = text.split('\n').map(l => l.trim()).find(line => /^[A-Z][a-z]+(\s[A-Z][a-z]+)+$/.test(line));
    return {
        name: nameMatch || null,
        email: (emailMatch && emailMatch[0]) || null,
        phone: (phoneMatch && phoneMatch[0]) || null
    };
}