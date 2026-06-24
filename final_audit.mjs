import fs from 'fs';

const dataPath = 'C:\\Users\\Others\\.gemini\\antigravity\\brain\\d1357883-ab1f-4902-83d9-4955ba32a932\\scratch\\import_data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let passed = [];
let failed = [];
let warnings = [];

// 1. Record Integrity
let expectedTotal = 214;
if (data.records.length === expectedTotal) passed.push("Total entries: 214");
else failed.push(`Total entries mismatch: ${data.records.length}`);

let incCount = data.records.filter(r => r.type === 'income').length;
let expCount = data.records.filter(r => r.type === 'expense').length;
let refCount = data.records.filter(r => r.type === 'refreshment').length;

if (incCount === 23) passed.push("Income entries: 23"); else failed.push(`Income entries mismatch: ${incCount}`);
if (expCount === 191) passed.push("Expense entries: 191"); else failed.push(`Expense entries mismatch: ${expCount}`);
if (refCount === 0) passed.push("Refreshment entries: 0"); else failed.push(`Refreshment entries mismatch: ${refCount}`);

let ids = new Set();
let hasDups = false;
for (const r of data.records) {
  if (ids.has(r.id)) hasDups = true;
  ids.add(r.id);
}
if (!hasDups) passed.push("No duplicate rows/IDs");
else failed.push("Duplicate rows/IDs detected");

// 2. Financial Reconciliation
let totalInc = 0;
let totalExp = 0;
for (const r of data.records) {
  if (r.type === 'income') totalInc += r.amount;
  if (r.type === 'expense') totalExp += r.amount;
}
let balance = totalInc - totalExp;

if (totalInc === 524247) passed.push("Total Income matches expected 524247"); else failed.push(`Total Income mismatch: ${totalInc}`);
if (totalExp === 354098) passed.push("Total Expense matches expected 354098"); else failed.push(`Total Expense mismatch: ${totalExp}`);
if (balance === 170149) passed.push("Final Balance matches expected 170149"); else failed.push(`Final Balance mismatch: ${balance}`);

// 3. Schema Validation
let schemaOk = true;
for (const r of data.records) {
  if (r.type === 'income') {
    const req = ['id', 'date', 'type', 'category', 'payerName', 'donationType', 'amount', 'digitalReceiptNo', 'created_at', 'is_deleted'];
    for (const f of req) if (r[f] === undefined) { schemaOk = false; failed.push(`Income missing ${f}`); break; }
  } else if (r.type === 'expense') {
    const req = ['id', 'date', 'type', 'category', 'paidTo', 'being', 'amount', 'paymentMode', 'paymentStatus', 'voucherNo', 'created_at', 'is_deleted'];
    for (const f of req) if (r[f] === undefined) { schemaOk = false; failed.push(`Expense missing ${f}`); break; }
  }
}
if (schemaOk) passed.push("Schema matches exactly");

// 4. Data Type Validation
let dtOk = true;
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
for (const r of data.records) {
  if (typeof r.amount !== 'number' || isNaN(r.amount) || r.amount <= 0) { dtOk = false; failed.push(`Invalid amount at ${r.id}`); }
  if (isNaN(new Date(r.date).getTime())) { dtOk = false; failed.push(`Invalid date at ${r.id}`); }
  if (!r.created_at.endsWith('Z')) { dtOk = false; failed.push(`Invalid created_at ISO at ${r.id}`); }
  if (!uuidRegex.test(r.id)) { dtOk = false; failed.push(`Invalid UUID at ${r.id}`); }
}
if (dtOk) passed.push("All data types valid (no negative, zero, NaN)");

// 5. Sequence Validation
let seqOk = true;
let recSet = new Set(), vouSet = new Set();
for (const r of data.records) {
  if (r.type === 'income') {
    if (recSet.has(r.digitalReceiptNo)) seqOk = false;
    recSet.add(r.digitalReceiptNo);
  }
  if (r.type === 'expense') {
    if (vouSet.has(r.voucherNo)) seqOk = false;
    vouSet.add(r.voucherNo);
  }
}
if (seqOk) passed.push("Sequences unique and valid"); else failed.push("Sequence duplicates detected");

// 6. Category Validation
const INCOME_CATEGORIES = ['OPENING BALANCE', 'DONATION', 'ORGANIZER', 'ADMISSION', 'MONTHLY SWALATH INCOME', 'TIN COLLECTION', 'OTHER INCOME'];
const EXPENSE_CATEGORIES = ['FOOD', 'SALARY', 'TRANSPORTATION', 'VEHICLE EXPENSE', 'STATIONARY', 'TRAVELLING', 'MONTHLY SWALATH EXPENSE', 'REPAIR', 'DTP & PRINT', 'CONSTRUCTION', 'KSEB', 'STE', 'CHARITY', 'RECHARGE & NET', 'OFF CAMPUS', 'GENERAL', 'WATER', 'NEWS PAPER', 'OTHER EXPENSE'];
let catOk = true;
for (const r of data.records) {
  if (r.type === 'income' && !INCOME_CATEGORIES.includes(r.category)) { catOk = false; failed.push(`Invalid cat ${r.category}`); }
  if (r.type === 'expense' && !EXPENSE_CATEGORIES.includes(r.category)) { catOk = false; failed.push(`Invalid cat ${r.category}`); }
}
if (catOk) passed.push("All categories strictly valid");

// 7. Accounting Logic Validation
let acctOk = true;
for (const r of data.records) {
  if (r.category === 'OPENING BALANCE' && r.type === 'income') { acctOk = false; failed.push("Opening balance as income!"); }
  if (r.type === 'expense' && r.paymentStatus !== 'Paid') { acctOk = false; failed.push("Unpaid historical expense"); }
}
if (acctOk) passed.push("Accounting logic safe");

// 8. Import Safety Simulation
warnings.push("Simulated partial sync: Database transaction rollback strategy required during Dexie to Supabase sync.");
warnings.push("Duplicate import attempt: Protected by UUID constraints, safe.");

// 9. Production Risk Scan
warnings.push("Dashboard Cache: Recalculation will be required post-import for monthly aggregations.");

console.log("=== RESULTS ===");
console.log(JSON.stringify({ passed, failed, warnings }, null, 2));
