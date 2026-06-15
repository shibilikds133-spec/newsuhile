import React from 'react';
import { formatINR, formatDate } from '../../utils/formatters';

export default function Voucher({ record }) {
  if (!record) return null;

  return (
    <div 
      className="receipt-landscape bg-white shadow-2xl relative border border-gray-200"
      style={{ width: '297mm', minHeight: '105mm', transformOrigin: 'top left' }}
    >
      {/* Sidebar for Voucher */}
      <div className="absolute left-0 top-0 bottom-0 w-10 md:w-12 bg-slate-800 flex flex-col items-center justify-start text-white overflow-hidden">
        {/* Logo at top of sidebar */}
        <div className="w-8 h-8 md:w-10 md:h-10 mt-2 bg-white rounded-full overflow-hidden flex-shrink-0 border border-slate-500 p-0.5">
          <img src="/image/logo.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        {/* Rotated text */}
        <div className="flex-1 flex items-center justify-center">
          <div className="rotate-[-90deg] whitespace-nowrap flex items-center gap-6 text-[9px] md:text-[10px] tracking-[0.15em] font-medium opacity-90 uppercase">
            <span>MAKHDOOMIYYA ACADEMY, ATTINGAL</span>
            <span className="opacity-50">|</span>
            <span>VOUCHER SLIP</span>
          </div>
        </div>
      </div>

      <div className="ml-10 md:ml-12 p-4 md:p-6 pb-2 h-full flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-2 border-slate-800 overflow-hidden p-0.5">
               <img src="/image/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tighter leading-none mb-0.5 uppercase">
                MAKHDOOMIYYA ACADEMY, ATTINGAL
              </h2>
              <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">
                UNDER QUADISIYYA ISLAMIC COMPLEX, THAZHUTHALA, KOLLAM
              </p>
              <div className="mt-1 inline-block bg-slate-800 text-white text-[10px] font-black px-2 py-0.5 uppercase tracking-tighter italic">VOUCHER</div>
            </div>
          </div>
          <div className="text-right space-y-0.5">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-[9px] font-bold text-gray-400 uppercase">No:</span>
              <span className="text-lg font-black text-slate-800 font-mono">{record.manualVoucherNo || record.voucherNo}</span>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <span className="text-[9px] font-bold text-gray-400 uppercase">Date:</span>
              <span className="text-md font-bold text-slate-800 border-b border-slate-200 min-w-[70px]">{formatDate(record.date)}</span>
            </div>
          </div>
        </div>

        <div className="flex-grow space-y-1.5 mt-1">
          <div className="flex items-end gap-3">
            <span className="text-[10px] font-bold text-slate-600 uppercase w-24">Pay to:</span>
            <div className="flex-grow border-b border-slate-300 pb-0.5 px-2 font-sans font-semibold text-md text-slate-800">
              {record.paidTo}
            </div>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-[10px] font-bold text-slate-600 uppercase w-24">Rupees in words:</span>
            <div className="flex-grow border-b border-slate-300 pb-0.5 px-2 font-sans font-semibold text-md text-slate-800">
              {record.amountInWords}
            </div>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-[10px] font-bold text-slate-600 uppercase w-24">Being:</span>
            <div className="flex-grow border-b border-slate-300 pb-0.5 px-2 font-sans font-semibold text-md text-slate-800">
              {record.being}
            </div>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-[10px] font-bold text-slate-600 uppercase w-24">Debit/Credit:</span>
            <div className="flex-grow border-b border-slate-300 pb-0.5 px-2 font-sans font-semibold text-md text-slate-800">
              {record.paymentMode}
            </div>
          </div>
        </div>

        <div className="mt-2 flex justify-between items-end">
          <div className="flex items-center gap-4">
            <div className="border-2 border-slate-800 px-6 py-2 flex items-center gap-2">
              <span className="text-2xl font-black text-slate-800">₹</span>
              <span className="text-2xl font-black text-slate-800 font-mono">
                {formatINR(record.amount).replace('₹', '').trim()}/-
              </span>
            </div>
          </div>

          <div className="flex gap-8">
            <div className="text-center">
              <div className="w-24 h-12 border border-slate-200 rounded-md mb-1 flex items-center justify-center font-bold">{record.approvedBy}</div>
              <p className="text-[8px] font-bold text-slate-500 uppercase">Approved by</p>
            </div>
            <div className="text-center">
              <div className="w-24 h-12 border border-slate-200 rounded-md mb-1 flex items-center justify-center font-bold text-sm">{record.drawnOn}</div>
              <p className="text-[8px] font-bold text-slate-500 uppercase">Drawn On</p>
            </div>
            <div className="text-center relative flex justify-center">
              {/* Stamp Image */}
              <div className="absolute -top-16 -left-8 w-24 h-24 pointer-events-none z-10 opacity-80">
                <img 
                  src="/image/stamp.png" 
                  alt="Stamp" 
                  className="w-full h-full object-contain"
                />
              </div>
              {/* Signature Image */}
              <div className="absolute -top-12 left-4 w-32 h-20 pointer-events-none z-20">
                <img 
                  src="/image/signechure.png" 
                  alt="Signature" 
                  className="w-full h-full object-contain rotate-[12deg] mix-blend-multiply"
                />
              </div>
              <div className="mt-4 border-t border-slate-800 pt-1 w-32 relative z-0">
                <p className="text-[8px] font-bold text-slate-800 uppercase">Receiver's signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
