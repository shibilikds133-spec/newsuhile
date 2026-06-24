import fs from 'fs';
const rawPath = 'C:\\Users\\Others\\.gemini\\antigravity\\brain\\d1357883-ab1f-4902-83d9-4955ba32a932\\scratch\\raw.json';
const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf8'));

let inc = 0;
let exp = 0;
for (const r of rawData) {
  if (r.type === 'income') inc += Number(r.amount);
  if (r.type === 'expense') exp += Number(r.amount);
}
console.log('RAW JSON INC:', inc, 'EXP:', exp);
