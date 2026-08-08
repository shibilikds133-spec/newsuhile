/**
 * Shared pure accounting helper.
 * Calculates financial summaries from any transaction array.
 * 
 * Business rules:
 * - Income: Received → count as actual income, Pending → do NOT count
 * - Expense: Paid → count as actual expense, Pending → do NOT count
 * - Refreshment: Paid → count as actual expense, Pending → do NOT count
 * 
 * Net Balance = Received Income - (Paid Expense + Paid Refreshment)
 */

/**
 * Determine if an Income transaction is considered Received.
 * Preserves historical compatibility: missing/null paymentStatus defaults to 'Received'.
 */
const isReceived = (t) =>
  (t.paymentStatus || 'Received') === 'Received';

/**
 * Determine if an Expense or Refreshment transaction is considered Paid.
 * Legacy values like 'Unpaid', 'Pending', undefined, null → not Paid.
 */
const isPaid = (t) =>
  t.paymentStatus === 'Paid';

/**
 * Calculate financial summary from an array of transactions.
 * Pure function — no side effects, no database writes.
 * 
 * @param {Array} transactions - Array of transaction objects (income, expense, refreshment)
 * @returns {Object} Financial summary
 */
export function calculateTransactionSummary(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      receivedIncome: 0,
      pendingIncome: 0,
      paidExpense: 0,
      pendingExpense: 0,
      paidRefreshment: 0,
      pendingRefreshment: 0,
      totalPaidExpense: 0,
      totalPendingPayable: 0,
      netBalance: 0,
    };
  }

  let receivedIncome = 0;
  let pendingIncome = 0;
  let paidExpense = 0;
  let pendingExpense = 0;
  let paidRefreshment = 0;
  let pendingRefreshment = 0;

  for (const t of transactions) {
    const amount = Number(t.amount || 0);

    if (t.type === 'income') {
      if (isReceived(t)) {
        receivedIncome += amount;
      } else {
        pendingIncome += amount;
      }
    } else if (t.type === 'expense') {
      if (isPaid(t)) {
        paidExpense += amount;
      } else {
        pendingExpense += amount;
      }
    } else if (t.type === 'refreshment') {
      if (isPaid(t)) {
        paidRefreshment += amount;
      } else {
        pendingRefreshment += amount;
      }
    }
  }

  const totalPaidExpense = paidExpense + paidRefreshment;
  const totalPendingPayable = pendingExpense + pendingRefreshment;
  const netBalance = receivedIncome - totalPaidExpense;

  return {
    receivedIncome,
    pendingIncome,
    paidExpense,
    pendingExpense,
    paidRefreshment,
    pendingRefreshment,
    totalPaidExpense,
    totalPendingPayable,
    netBalance,
  };
}
