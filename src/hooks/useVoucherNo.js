import { useState, useEffect } from 'react';
import db from '../utils/db';

export function useVoucherNo() {
  const [voucherNo, setVoucherNo] = useState(() => {
    const stored = localStorage.getItem('dawa_voucher_seq');
    return stored ? parseInt(stored, 10) : 101;
  });

  // Sync from LOCAL Dexie DB to ensure sequence isn't behind.
  // Using the local DB means this works perfectly offline.
  useEffect(() => {
    const syncMax = async () => {
      try {
        const allExpenses = await db.expenses.toArray();
        const dbMax = Math.max(0, ...allExpenses.map(r => r.voucherNo || 0));

        if (dbMax >= voucherNo) {
          const next = dbMax + 1;
          setVoucherNo(next);
          localStorage.setItem('dawa_voucher_seq', next);
        }
      } catch (error) {
        console.error('[useVoucherNo] Sequence sync error:', error);
      }
    };
    syncMax();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const incrementVoucherNo = () => {
    const next = voucherNo + 1;
    setVoucherNo(next);
    localStorage.setItem('dawa_voucher_seq', next);
    return voucherNo; // return the current one before increment
  };

  return { nextVoucherNo: voucherNo, incrementVoucherNo };
}
