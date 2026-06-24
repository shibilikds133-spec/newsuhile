import fs from 'fs';
import path from 'path';
import { amountToWords } from './src/utils/amountToWords.js';

const rawPath = 'C:\\Users\\Others\\.gemini\\antigravity\\brain\\d1357883-ab1f-4902-83d9-4955ba32a932\\scratch\\raw.json';
const outPath = 'C:\\Users\\Others\\.gemini\\antigravity\\brain\\d1357883-ab1f-4902-83d9-4955ba32a932\\scratch\\import_data.json';

let rawData = JSON.parse(fs.readFileSync(rawPath, 'utf8'));

// SORT BY DATE FIRST TO FIX CHRONOLOGY BUG
rawData.sort((a, b) => {
  const tA = new Date(a.date).getTime();
  const tB = new Date(b.date).getTime();
  return tA - tB; // Stable sort handles same-day records correctly
});

const INCOME_CATEGORIES = ['OPENING BALANCE', 'DONATION', 'ORGANIZER', 'ADMISSION', 'MONTHLY SWALATH INCOME', 'TIN COLLECTION', 'OTHER INCOME'];
const EXPENSE_CATEGORIES = ['FOOD', 'SALARY', 'TRANSPORTATION', 'VEHICLE EXPENSE', 'STATIONARY', 'TRAVELLING', 'MONTHLY SWALATH EXPENSE', 'REPAIR', 'DTP & PRINT', 'CONSTRUCTION', 'KSEB', 'STE', 'CHARITY', 'RECHARGE & NET', 'OFF CAMPUS', 'GENERAL', 'WATER', 'NEWS PAPER', 'OTHER EXPENSE'];

let seqNo = 1;
let vSeq = 1;

let totalIncome = 0;
let totalExpense = 0;
let totalRefreshment = 0;

let incomeCount = 0;
let expenseCount = 0;
let refreshmentCount = 0;

const records = [];

function normalizeCategory(cat, remark) {
  if (cat === 'GENARAL') return 'GENERAL';
  if (cat === 'NEWSPAPER') return 'NEWS PAPER';
  if (cat === 'RENT') return 'OTHER EXPENSE'; // Not in EXPENSE_CATEGORIES
  
  // OCR incorrectly tagged 'KICHOOS FRESH' as TIN COLLECTION, but it's an expense
  if (cat === 'TIN COLLECTION' && remark && remark.includes('KICHOOS FRESH')) {
    return 'FOOD';
  }
  return cat;
}

for (const raw of rawData) {
  let isIncome = raw.type === 'income';
  let cat = normalizeCategory(raw.sourceCategory, raw.remark);
  
  const createdAt = raw.date + 'T00:00:00.000Z';

  if (isIncome) {
    const isDonation = cat === 'DONATION';
    const amount = Number(raw.amount);
    totalIncome += amount;
    incomeCount++;
    
    // Safety fallback
    const finalCat = INCOME_CATEGORIES.includes(cat) ? cat : 'OTHER INCOME';
    
    records.push({
      id: raw.id,
      type: 'income',
      date: raw.date,
      category: finalCat,
      donationType: isDonation ? 'Donation' : finalCat,
      payerName: raw.remark || 'Unknown Payer',
      address: '',
      contactNo: '',
      amount: amount,
      amountInWords: amountToWords(amount),
      manualReceiptNo: '',
      digitalReceiptNo: 'IMP-R-' + String(seqNo).padStart(4, '0'),
      seqNo: seqNo++,
      paymentMode: 'Cash',
      created_at: createdAt,
      synced: false,
      sync_status: 'pending',
      is_deleted: false,
      _import: {
        sourceRow: raw.id,
        sourceRemark: raw.remark,
        sourceBalance: raw.balance,
        sourceCategory: raw.sourceCategory,
        isOpeningBalance: false,
        citation: raw.citation
      }
    });
  } else {
    const amount = Number(raw.amount);
    totalExpense += amount;
    expenseCount++;
    
    // Safety fallback
    const finalCat = EXPENSE_CATEGORIES.includes(cat) ? cat : 'OTHER EXPENSE';
    
    records.push({
      id: raw.id,
      type: 'expense',
      date: raw.date,
      category: finalCat,
      paidTo: raw.remark || 'Unknown Payee',
      being: raw.remark || 'Unknown Purpose',
      approvedBy: '',
      remarks: '',
      amount: amount,
      amountInWords: amountToWords(amount),
      paymentMode: 'Cash',
      paymentStatus: 'Paid',
      voucherNo: 'IMP-V-' + String(vSeq++).padStart(4, '0'),
      manualVoucherNo: '',
      created_at: createdAt,
      synced: false,
      sync_status: 'pending',
      is_deleted: false,
      _import: {
        sourceRow: raw.id,
        sourceRemark: raw.remark,
        sourceBalance: raw.balance,
        sourceCategory: raw.sourceCategory,
        isOpeningBalance: false,
        citation: raw.citation
      }
    });
  }
}

const importMeta = {
  version: '1.0',
  sourcePDF: 'converted_from_raw',
  importedAt: new Date().toISOString(),
  importedBy: 'bulk-import-agent-v2-sorted',
  totalRecords: records.length,
  breakdown: {
    income: incomeCount,
    expense: expenseCount,
    refreshment: refreshmentCount
  },
  openingBalance: 0,
  closingBalance: rawData[rawData.length - 1].balance,
  isDryRun: false
};

const finalJson = {
  importMeta,
  records
};

fs.writeFileSync(outPath, JSON.stringify(finalJson, null, 2), 'utf8');
console.log('Conversion successful. Sorted JSON written to ' + outPath);
