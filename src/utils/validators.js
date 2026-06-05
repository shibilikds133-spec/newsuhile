export const validators = {
  income: ({ date, category, amount, payerName }) => {
    const errors = {};
    if (!date) errors.date = 'Date is required';
    if (!category) errors.category = 'Category is required';
    if (!amount || Number(amount) <= 0) errors.amount = 'Valid amount required';
    if (!payerName?.trim()) errors.payerName = 'Payer name is required';
    return errors;
  },
  expense: ({ date, category, amount, paidTo, being }) => {
    const errors = {};
    if (!date) errors.date = 'Date is required';
    if (!category) errors.category = 'Category is required';
    if (!amount || Number(amount) <= 0) errors.amount = 'Valid amount required';
    if (!paidTo?.trim()) errors.paidTo = 'Paid to is required';
    if (!being?.trim()) errors.being = 'Purpose (Being) is required';
    return errors;
  },
  refreshment: ({ date, item, quantity, amount }) => {
    const errors = {};
    if (!date) errors.date = 'Date is required';
    if (!item) errors.item = 'Item is required';
    if (!quantity || Number(quantity) < 1) errors.quantity = 'Quantity must be at least 1';
    if (!amount || Number(amount) <= 0) errors.amount = 'Valid amount required';
    return errors;
  }
};
