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
        const dbMax = Math.max(0, ...allIncome.map(r => {
          if (r.seqNo) return r.seqNo;
          if (typeof r.digitalReceiptNo === 'number') return r.digitalReceiptNo;
          // Fallback if string but no seqNo (shouldn't happen with new logic, but safe)
          return 0;
        }));

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
    const currentSeq = receiptNo;
    const nextSeq = receiptNo + 1;
    
    setReceiptNo(nextSeq);
    localStorage.setItem('dawa_receipt_seq', nextSeq);
    
    // Generate formatted receipt number based on current date
    const now = new Date();
    const d = now.getDate(); // e.g., 15
    const m = now.getMonth() + 1; // e.g., 6
    const y = String(now.getFullYear()).slice(-2); // e.g., 26
    const formatted = `${currentSeq}${d}${m}${y}`;

    return { seqNo: currentSeq, digitalReceiptNo: formatted };
  };

  return { nextReceiptNo: receiptNo, incrementReceiptNo };
}
