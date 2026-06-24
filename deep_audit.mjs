import fs from 'fs';

const dataPath = 'C:\\Users\\Others\\.gemini\\antigravity\\brain\\d1357883-ab1f-4902-83d9-4955ba32a932\\scratch\\import_data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let hiddenProblems = [];
let suspiciousRows = [];
let catastrophicRisks = [];

// 1. Hidden Duplicate Scan
let seenCombinations = new Map();
let duplicateIds = new Set();
for (const r of data.records) {
  if (duplicateIds.has(r.id)) catastrophicRisks.push(`Absolute duplicate ID: ${r.id}`);
  duplicateIds.add(r.id);

  let party = r.type === 'income' ? r.payerName : r.paidTo;
  let comboKey = `${r.date}_${r.amount}_${r.category}_${party}`;
  if (seenCombinations.has(comboKey)) {
    suspiciousRows.push(`Near-duplicate detected on ${r.date}: ${r.category} for ${r.amount} to/from ${party} (IDs: ${r.id}, ${seenCombinations.get(comboKey)})`);
  } else {
    seenCombinations.set(comboKey, r.id);
  }
}

// 2. Silent Corruption Detection
let otherCategoryCount = 0;
for (const r of data.records) {
  if (r.category === 'OTHER INCOME' || r.category === 'OTHER EXPENSE') otherCategoryCount++;
  
  let remark = r.type === 'income' ? r.payerName.toLowerCase() : r.paidTo.toLowerCase();
  
  if (r.type === 'expense' && (remark.includes('donation') || remark.includes('admission'))) {
    hiddenProblems.push(`Expense record ${r.id} (${r.voucherNo}) has remark "${r.paidTo}" which sounds like income.`);
  }
  if (r.type === 'income' && (remark.includes('kseb') || remark.includes('fuel'))) {
    hiddenProblems.push(`Income record ${r.id} (${r.digitalReceiptNo}) has remark "${r.payerName}" which sounds like expense.`);
  }
}
if (otherCategoryCount > (data.records.length * 0.1)) { // More than 10%
  suspiciousRows.push(`Overuse of OTHER INCOME/EXPENSE detected: ${otherCategoryCount} records.`);
}

// 3. Financial Integrity Stress Test
let balanceErrors = [];
let previousBalance = 0; 
let first = true;
let totalIncome = 0;
let totalExpense = 0;

for (const r of data.records) {
  let expectedDiff = r.type === 'income' ? r.amount : -r.amount;
  if (first) {
    previousBalance = r._import.sourceBalance - expectedDiff; // implicit opening
    first = false;
  }
  
  let expectedNewBalance = previousBalance + expectedDiff;
  if (Math.abs(expectedNewBalance - r._import.sourceBalance) > 1) { // Allowing tiny floating errors, though integer
    balanceErrors.push(`Broken running balance at ${r.id}: expected ${expectedNewBalance}, source says ${r._import.sourceBalance}`);
  }
  previousBalance = r._import.sourceBalance;
  
  if (r.type === 'income') totalIncome += r.amount;
  if (r.type === 'expense') totalExpense += r.amount;
}
if (balanceErrors.length > 0) {
  catastrophicRisks.push(`Running balance mathematically broken in ${balanceErrors.length} places. First error: ${balanceErrors[0]}`);
}

// 4. Sequence Integrity
let rNums = data.records.filter(r => r.type === 'income').map(r => parseInt(r.digitalReceiptNo.replace('IMP-R-', '')));
let vNums = data.records.filter(r => r.type === 'expense').map(r => parseInt(r.voucherNo.replace('IMP-V-', '')));

rNums.sort((a,b)=>a-b);
vNums.sort((a,b)=>a-b);

for(let i=1; i<rNums.length; i++) {
  if (rNums[i] - rNums[i-1] !== 1) hiddenProblems.push(`Gap in digitalReceiptNo between ${rNums[i-1]} and ${rNums[i]}`);
}
for(let i=1; i<vNums.length; i++) {
  if (vNums[i] - vNums[i-1] !== 1) hiddenProblems.push(`Gap in voucherNo between ${vNums[i-1]} and ${vNums[i]}`);
}

// 5. Schema Stress Test
for (const r of data.records) {
  if (r.amount <= 0) catastrophicRisks.push(`Zero or negative amount at ${r.id}`);
  if (r.is_deleted !== false) hiddenProblems.push(`Record ${r.id} is_deleted is not strictly false`);
  if (r.synced !== false) hiddenProblems.push(`Record ${r.id} synced is not strictly false`);
  if (!r.created_at.endsWith('Z')) hiddenProblems.push(`Record ${r.id} created_at is not standard ISO Z time`);
}

// 6. Accounting Logic Validation
for (const r of data.records) {
  if (r.type === 'expense' && r.paymentStatus !== 'Paid') {
    catastrophicRisks.push(`Unpaid historical expense leakage at ${r.id}`);
  }
  let d = new Date(r.date);
  if (d > new Date()) catastrophicRisks.push(`Future date detected at ${r.id}`);
  if (d.getFullYear() < 2000) hiddenProblems.push(`Suspiciously old date detected at ${r.id}`);
}

// 7. Import Safety Simulation
// Since IDs are hardcoded (UUIDs from source or generated), re-importing the exact same JSON will attempt to insert same IDs.
// If Dexie `bulkPut` is used, it overwrites. If `bulkAdd`, it fails. 
// We assume it's bulkAdd/bulkPut. ID collision prevents duplicate generation.
// However, the import logic in engine.js might not handle `sync_status: pending` nicely if bulk imported.

// Generate Output
console.log(JSON.stringify({
  hiddenProblems,
  suspiciousRows,
  catastrophicRisks
}, null, 2));
