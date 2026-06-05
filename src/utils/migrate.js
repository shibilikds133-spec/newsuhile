import db from './db';
import { newId } from './uuid';

export async function migrateLocalStorageToDexie() {
  const isMigrated = localStorage.getItem('dawa_migrated_to_dexie');
  
  if (isMigrated === 'true') {
    return; // Already migrated
  }

  try {
    const rawIncome = localStorage.getItem('dawa_income');
    const rawExpense = localStorage.getItem('dawa_expense');
    const rawRefreshment = localStorage.getItem('dawa_refreshment');

    const incomes = rawIncome ? JSON.parse(rawIncome) : [];
    const expenses = rawExpense ? JSON.parse(rawExpense) : [];
    const refreshments = rawRefreshment ? JSON.parse(rawRefreshment) : [];

    // Map records to ensure they have an ID and 'synced' flag
    const mapRecords = (records, type) => records.map(r => ({
      ...r,
      id: r.id || newId(),
      type,
      synced: r.synced !== undefined ? r.synced : false // default to false so it syncs
    }));

    await db.transaction('rw', db.income, db.expenses, db.refreshments, async () => {
      if (incomes.length > 0) {
        await db.income.bulkPut(mapRecords(incomes, 'income'));
      }
      if (expenses.length > 0) {
        await db.expenses.bulkPut(mapRecords(expenses, 'expense'));
      }
      if (refreshments.length > 0) {
        await db.refreshments.bulkPut(mapRecords(refreshments, 'refreshment'));
      }
    });

    // Mark as migrated
    localStorage.setItem('dawa_migrated_to_dexie', 'true');
    console.log('Successfully migrated LocalStorage to Dexie IndexedDB');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}
