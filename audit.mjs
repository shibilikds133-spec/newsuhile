import fs from 'fs';

const dataPath = 'C:\\Users\\Others\\.gemini\\antigravity\\brain\\d1357883-ab1f-4902-83d9-4955ba32a932\\scratch\\import_data.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const INCOME_CATEGORIES = ['OPENING BALANCE', 'DONATION', 'ORGANIZER', 'ADMISSION', 'MONTHLY SWALATH INCOME', 'TIN COLLECTION', 'OTHER INCOME'];
const EXPENSE_CATEGORIES = ['FOOD', 'SALARY', 'TRANSPORTATION', 'VEHICLE EXPENSE', 'STATIONARY', 'TRAVELLING', 'MONTHLY SWALATH EXPENSE', 'REPAIR', 'DTP & PRINT', 'CONSTRUCTION', 'KSEB', 'STE', 'CHARITY', 'RECHARGE & NET', 'OFF CAMPUS', 'GENERAL', 'WATER', 'NEWS PAPER', 'OTHER EXPENSE'];

let passed = [];
let failed = [];
let warnings = [];

// 1. Record Count Validation
let expectedTotal = 214;
if (data.records.length === expectedTotal) {
  passed.push("Total record count matches expected (214).");
} else {
  failed.push(`Total record count mismatch. Expected ${expectedTotal}, got ${data.records.length}`);
}
if (data.importMeta.breakdown.income + data.importMeta.breakdown.expense + data.importMeta.breakdown.refreshment === data.importMeta.totalRecords) {
  passed.push("Breakdown sum matches total records.");
} else {
  failed.push("Breakdown sum does not match total records.");
}

// 2. Financial Validation
let totalIncome = 0;
let totalExpense = 0;
for (const r of data.records) {
  if (r.type === 'income') totalIncome += r.amount;
  if (r.type === 'expense') totalExpense += r.amount;
}
let calculatedBalance = totalIncome - totalExpense;
// Note: Final balance from PDF in raw JSON was 170149
let expectedBalance = 170149;
if (calculatedBalance === expectedBalance) {
  passed.push(`Financial calculation matches expected closing balance (${expectedBalance}).`);
} else {
  failed.push(`Financial mismatch! Income (${totalIncome}) - Expense (${totalExpense}) = ${calculatedBalance}, Expected = ${expectedBalance}`);
}

// 3. Duplicate Detection
let ids = new Set();
let sourceRows = new Set();
let digitalReceiptNos = new Set();
let voucherNos = new Set();
let hasDups = false;

for (const r of data.records) {
  if (ids.has(r.id)) { failed.push(`Duplicate ID found: ${r.id}`); hasDups = true; }
  ids.add(r.id);
  
  if (r.type === 'income') {
    if (digitalReceiptNos.has(r.digitalReceiptNo)) { failed.push(`Duplicate digitalReceiptNo: ${r.digitalReceiptNo}`); hasDups = true; }
    digitalReceiptNos.add(r.digitalReceiptNo);
  }
  if (r.type === 'expense') {
    if (voucherNos.has(r.voucherNo)) { failed.push(`Duplicate voucherNo: ${r.voucherNo}`); hasDups = true; }
    voucherNos.add(r.voucherNo);
  }
}
if (!hasDups) passed.push("No duplicates detected in generated IDs or receipt/voucher numbers.");

// 4. Receipt/Voucher Collision Check
warnings.push("digitalReceiptNo starts from R-0001 and voucherNo from V-0001. This will likely COLLIDE with existing production records unless the DB counter is completely empty.");

// 5. Required Field Validation
let missingFields = false;
for (const r of data.records) {
  if (r.type === 'income') {
    const required = ['id', 'date', 'type', 'category', 'payerName', 'donationType', 'amount', 'digitalReceiptNo', 'created_at', 'is_deleted'];
    for (const f of required) {
      if (r[f] === undefined || r[f] === null) { failed.push(`Income record ${r.id} missing field: ${f}`); missingFields = true; }
    }
  } else if (r.type === 'expense') {
    const required = ['id', 'date', 'type', 'category', 'paidTo', 'being', 'amount', 'paymentMode', 'paymentStatus', 'voucherNo', 'created_at', 'is_deleted'];
    for (const f of required) {
      if (r[f] === undefined || r[f] === null) { failed.push(`Expense record ${r.id} missing field: ${f}`); missingFields = true; }
    }
  }
}
if (!missingFields) passed.push("All required fields are present and not null.");

// 6. Category Validation
let invalidCategories = new Set();
for (const r of data.records) {
  if (r.type === 'income' && !INCOME_CATEGORIES.includes(r.category)) {
    invalidCategories.add(r.category);
  }
  if (r.type === 'expense' && !EXPENSE_CATEGORIES.includes(r.category)) {
    invalidCategories.add(r.category);
  }
}
if (invalidCategories.size > 0) {
  failed.push(`Raw category leakage detected! Unmapped categories: ${Array.from(invalidCategories).join(', ')}`);
} else {
  passed.push("All categories are strictly mapped to allowed constants.");
}

// 7. Opening Balance
let hasOpening = false;
for (const r of data.records) {
  if (r.category === 'OPENING BALANCE') hasOpening = true;
}
if (hasOpening) {
  failed.push("OPENING BALANCE was found as a record in the dataset. This violates Rule 1.");
} else {
  passed.push("No OPENING BALANCE row leakage in records.");
}

// 8. Data Type Validation
let invalidTypes = false;
for (const r of data.records) {
  if (typeof r.amount !== 'number') { failed.push(`Record ${r.id} amount is not numeric.`); invalidTypes = true; }
  if (isNaN(Date.parse(r.created_at))) { failed.push(`Record ${r.id} created_at is invalid ISO.`); invalidTypes = true; }
  if (r.type === 'expense' && r.paymentStatus !== 'Paid') { failed.push(`Record ${r.id} has paymentStatus != 'Paid'.`); invalidTypes = true; }
}
if (!invalidTypes) passed.push("All data types and constraints are valid.");

// 9. Sync Safety Check
warnings.push("Importing these records will trigger an immediate massive sync (214 records) because sync_status='pending', which may hit Supabase rate limits.");

console.log("=== RESULTS ===");
console.log(JSON.stringify({ passed, failed, warnings }, null, 2));
