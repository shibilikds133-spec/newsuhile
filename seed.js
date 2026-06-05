import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fxkjkdejpfdyqbqnosik.supabase.co';
const supabaseKey = 'sb_publishable_3t3r3-3IlAvKY4f57pQQIQ_o3EvooEm';
const supabase = createClient(supabaseUrl, supabaseKey);

const generateId = () => crypto.randomUUID();

async function seed() {
  try {
    console.log('Seeding Income...');
    const incomeRecords = Array.from({ length: 15 }).map((_, i) => ({
      id: generateId(),
      type: 'income',
      digitalReceiptNo: 1000 + i,
      manualReceiptNo: '',
      date: new Date().toISOString().split('T')[0],
      category: ['OPENING BALANCE', 'DONATION', 'MONTHLY SWALATH INCOME', 'ADMISSION', 'TIN COLLECTION'][i % 5],
      donationType: 'Donation',
      payerName: `Test Donor ${i + 1}`,
      contactNo: `987654321${i % 10}`,
      amount: (i + 1) * 1000 + 500,
      amountInWords: 'Automated Test Amount',
      address: `Test Address City ${i}`,
      created_at: new Date().toISOString()
    }));
    await supabase.from('income').insert(incomeRecords);
    console.log(`✅ Added ${incomeRecords.length} Income records.`);

    console.log('Seeding Expenses...');
    const expenseRecords = Array.from({ length: 15 }).map((_, i) => ({
      id: generateId(),
      type: 'expense',
      voucherNo: 5000 + i,
      date: new Date().toISOString().split('T')[0],
      category: ['SALARY', 'FOOD', 'TRANSPORTATION', 'WATER', 'REPAIR', 'CHARITY'][i % 6],
      paidTo: `Test Vendor ${i + 1}`,
      being: 'Test Operational Purpose',
      paymentMode: ['Cash', 'Bank Transfer'][i % 2],
      paymentStatus: i % 3 === 0 ? 'Unpaid' : 'Paid',
      approvedBy: 'System Admin',
      remarks: 'Seeded for testing',
      amount: (i + 1) * 350,
      amountInWords: 'Automated Test Amount',
      created_at: new Date().toISOString()
    }));
    await supabase.from('expenses').insert(expenseRecords);
    console.log(`✅ Added ${expenseRecords.length} Expense records.`);

    console.log('Seeding Refreshments...');
    const refRecords = Array.from({ length: 6 }).map((_, i) => ({
      id: generateId(),
      type: 'refreshment',
      date: new Date().toISOString().split('T')[0],
      item: ['Tea', 'Snacks', 'Meals'][i % 3],
      quantity: (i % 5) + 1,
      amount: ((i % 5) + 1) * 30,
      notes: 'Test Office Expenses',
      created_at: new Date().toISOString()
    }));
    await supabase.from('refreshments').insert(refRecords);
    console.log(`✅ Added ${refRecords.length} Refreshment records.`);

    console.log('🎉 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  }
}

seed();
