import { useState, useEffect } from 'react';
import db from '../utils/db';

export function useReceiptNo() {
  const [receiptNo, setReceiptNo] = useState(() => {
    const stored = localStorage.getItem('dawa_receipt_seq');
    return stored ? parseInt(stored, 10) : 1;
  });

  // Sync from LOCAL Dexie DB to ensure sequence isn't behind.
  // Using the local DB means this works perfectly offline.
  useEffect(() => {
    const syncMax = async () => {
      try {
        const allIncome = await db.income.toArray();
        const dbMax = Math.max(0, ...allIncome.map(r => r.digitalReceiptNo || 0));

        if (dbMax >= receiptNo) {
          const next = dbMax + 1;
          setReceiptNo(next);
          localStorage.setItem('dawa_receipt_seq', next);
        }
      } catch (error) {
        console.error('[useReceiptNo] Sequence sync error:', error);
      }
    };
    syncMax();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const incrementReceiptNo = () => {
    const next = receiptNo + 1;
    setReceiptNo(next);
    localStorage.setItem('dawa_receipt_seq', next);
    return receiptNo; // return the current one before increment
  };

  return { nextReceiptNo: receiptNo, incrementReceiptNo };
}
