// Run from the bughunt project folder:  node fix-encoding.js
const fs = require('fs');
const path = require('path');

const files = ['client/js/app.js', 'client/js/admin.js', 'client/index.html'];

const CP1252_HIGH = [0x20ac, 0x81, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x8d, 0x017d, 0x8f,
  0x90, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x9d, 0x017e, 0x0178];
const cp1252Reverse = new Map(CP1252_HIGH.map((cp, i) => [String.fromCodePoint(cp), 0x80 + i]));

function repairMojibake(text) {
  if (!/[\u00c2\u00c3\u00e2\u00f0][\u0080-\u00ff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013-\u203a\u20ac\u2122]/.test(text)) return text;
  const bytes = [];
  for (const ch of text) {
    const c = ch.codePointAt(0);
    if (c < 0x100) bytes.push(c);
    else if (cp1252Reverse.has(ch)) bytes.push(cp1252Reverse.get(ch));
    else return text;
  }
  const fixed = Buffer.from(bytes).toString('utf8');
  return fixed.includes('\ufffd') ? text : fixed;
}

function toAscii(text, isHtml) {
  let out = '';
  for (const ch of text) {
    const c = ch.codePointAt(0);
    if (c < 128) out += ch;
    else if (isHtml) out += '&#' + c + ';';
    else if (c > 0xffff) { const h = Math.floor((c - 0x10000) / 0x400) + 0xd800, l = ((c - 0x10000) % 0x400) + 0xdc00; out += '\\u' + h.toString(16) + '\\u' + l.toString(16); }
    else out += '\\u' + c.toString(16).padStart(4, '0');
  }
  return out;
}

for (const rel of files) {
  const file = path.resolve(process.cwd(), rel);
  if (!fs.existsSync(file)) { console.log('skipped (not found):', rel); continue; }
  let text = fs.readFileSync(file, 'utf8').replace(/^\ufeff/, '');
  const repaired = repairMojibake(text);
  const wasCorrupt = repaired !== text;
  text = repaired;
  const before = [...text].filter((ch) => ch.codePointAt(0) > 127).length;
  fs.writeFileSync(file, toAscii(text, rel.endsWith('.html')), 'utf8');
  console.log(`${rel}: ${wasCorrupt ? 'repaired corrupted symbols, ' : ''}${before} special characters converted to ASCII escapes`);
}
console.log('Done. Restart the server and press Ctrl+F5 in the browser.');