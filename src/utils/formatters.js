export const formatINR = (amount) => {
  const value = Number(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
};

// DD/MM/YYYY
export const formatDate = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('en-IN');
};

// Today's date as YYYY-MM-DD for date input default
export const todayISO = () => new Date().toISOString().split('T')[0];
