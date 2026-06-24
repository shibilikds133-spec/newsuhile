import React, { useRef, useState } from 'react';
import { formatINR, formatDate, todayISO } from '../../utils/formatters';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { exportToExcel } from '../../utils/exportExcel';
import PrintLayout from './PrintLayout';

export default function SmartPrintPreview({ isOpen, onClose, data, filters }) {
  const printRef = useRef(null);
  const [showDetailed, setShowDetailed] = useState(false);

  const summaryData = React.useMemo(() => {
    if (!data) return [];
    const summary = {};
    data.forEach(t => {
      const cat = t.category || t.item || 'Other';
      if (!summary[cat]) summary[cat] = { in: 0, out: 0 };
      if (t.type === 'income') summary[cat].in += t.amount;
      else summary[cat].out += t.amount;
    });
    return Object.entries(summary).map(([category, vals]) => ({
      category,
      ...vals,
      balance: vals.in - vals.out
    }));
  }, [data]);

  if (!isOpen || !data) return null;

  const totalIncome = data
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalExpense = data
    .filter(t => t.type === 'expense' || t.type === 'refreshment')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const paidExpense = data
    .filter(t => (t.type === 'expense' && t.paymentStatus === 'Paid') || t.type === 'refreshment')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const unpaidExpense = data
    .filter(t => t.type === 'expense' && t.paymentStatus === 'Unpaid')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const netBalance = totalIncome - paidExpense;

  const getShortName = (name) => {
    if (!name) return '-';
    const mapping = {
      'OPENING BALANCE': 'O.B', 'DONATION': 'DNATN', 'ORGANIZER': 'ORG',
      'ADMISSION': 'ADM', 'MONTHLY SWALATH INCOME': 'MS-INC', 'TIN COLLECTION': 'TIN',
      'OTHER INCOME': 'OTH-I', 'MONTHLY SWALATH EXPENSE': 'MS-EXP',
      'VEHICLE EXPENSE': 'VEHCL', 'REPAIR': 'REPR', 'DTP & PRINT': 'DTP',
      'CONSTRUCTION': 'CONST', 'TRANSPORTATION': 'TRANS', 'STATIONARY': 'STAT',
      'TRAVELLING': 'TRAVL', 'RECHARGE & NET': 'RCHRG', 'OFF CAMPUS': 'OFF-C',
      'NEWS PAPER': 'N.PEPR', 'OTHER EXPENSE': 'OTH-E', 'MAINTENANCE': 'MAINT',
      'ELECTRICITY': 'ELEC', 'CHARITY': 'CHRT', 'KSEB': 'KSEB', 'WATER': 'WTR',
      'SNACKS': 'SNCKS', 'MEALS': 'MLS', 'TEA': 'TEA', 'STE': 'STE',
      'GENERAL': 'GENRL', 'SALARY': 'SAL', 'FOOD': 'FOOD',
    };
    return mapping[name.toUpperCase()] || name;
  };

  const pdfINR = (amount) => {
    const num = Number(amount || 0);
    const formatted = num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    return formatted;
  };

  const handleDownloadPDF = async () => {
    toast.loading('Generating PDF...', { id: 'smart-pdf' });
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pW = doc.internal.pageSize.getWidth();
      const pH = doc.internal.pageSize.getHeight();
      const mL = 15, mR = 15, mT = 15;
      const contentW = pW - mL - mR;
      let y = mT;

      const getImage = (path) => new Promise((res) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = () => res(null);
        img.src = path;
      });

      const logoImg = await getImage('/image/logo.png');
      const signImg = await getImage('/image/signechure.png');
      const stampImg = await getImage('/image/stamp.png');

      const newPage = () => {
        addPageFooter();
        doc.addPage();
        y = mT;
        addPageHeader();
      };
      
      const checkY = (needed = 8) => { if (y + needed > pH - 25) newPage(); };

      const addPageHeader = () => {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(150, 150, 150);
        doc.text('FINANCIAL REPORT — CONTINUED', pW / 2, mT - 5, { align: 'center' });
        y = mT;
      };

      const addPageFooter = () => {
        const curPage = doc.getCurrentPageInfo().pageNumber;
        doc.setDrawColor(240, 240, 240);
        doc.line(mL, pH - 15, pW - mR, pH - 15);
        doc.setFontSize(7);
        doc.setTextColor(180, 180, 180);
        doc.text('Makhdoomiyya Accounts System — Automated Report', mL, pH - 10);
        doc.text(`Page ${curPage}`, pW - mR, pH - 10, { align: 'right' });
      };

      // Header - Based on image
      doc.setFillColor(240, 247, 255); // Light blue
      doc.rect(0, 0, pW, 30, 'F');
      
      // Building Icon
      doc.setFillColor(37, 99, 235); // blue-600
      doc.roundedRect(mL, mT - 5, 12, 12, 1.5, 1.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text('M', mL + 6, mT + 3, { align: 'center' });

      doc.setTextColor(30, 58, 138); // blue-900
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text("Makhdoomiyya's Business Report", mL + 16, mT);
      
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139); // slate-500
      const meta = `Generated On - ${formatDate(todayISO())} | Generated by - Makhdoomiyya (+919496413786)`;
      doc.text(meta.toUpperCase(), mL + 16, mT + 5);
      
      y = 38;

      // Report Info
      doc.setTextColor(30, 41, 59); // slate-800
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      const title = filters?.fromDate ? `${new Date(filters.fromDate).toLocaleString('default', { month: 'long' }).toUpperCase()} ${new Date(filters.fromDate).getFullYear()} SUMMARY` : 'FINANCIAL STATEMENT';
      doc.text(title, mL, y);
      y += 8;

      doc.setDrawColor(226, 232, 240); // slate-200
      doc.rect(mL, y, contentW, 10);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Duration: ${filters?.fromDate ? formatDate(filters.fromDate) : 'Start'} - ${filters?.toDate ? formatDate(filters.toDate) : 'End'}`, mL + 5, y + 6.5);
      y += 18;

      doc.text(`Total No. of entries: ${data.length}`, mL, y);
      y += 8;

      // Table Header (Summary)
      if (!showDetailed) {
        const cols = [
          { label: 'Category', w: 55, align: 'left' },
          { label: 'Cash In', w: 40, align: 'right' },
          { label: 'Cash Out', w: 40, align: 'right' },
          { label: 'Balance', w: 45, align: 'right' },
        ];
        
        doc.setFillColor(248, 250, 252);
        doc.rect(mL, y, contentW, 7, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(mL, y, contentW, 7, 'S');
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(7.5);
        let curX = mL;
        cols.forEach(col => {
          if (col.align === 'right') {
            doc.text(col.label, curX + col.w - 3, y + 4.5, { align: 'right' });
          } else {
            doc.text(col.label, curX + 3, y + 4.5);
          }
          curX += col.w;
        });
        y += 7;

        // Rows (Summary)
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        summaryData.forEach((row) => {
          checkY(7);
          doc.setDrawColor(241, 245, 249);
          doc.line(mL, y + 7, mL + contentW, y + 7);
          
          let cx = mL;
          doc.setTextColor(30, 41, 59);
          doc.text(row.category.toUpperCase(), cx + 3, y + 4.5);
          cx += cols[0].w;
          
          doc.setTextColor(22, 163, 74); // Green
          doc.text(pdfINR(row.in), cx + cols[1].w - 3, y + 4.5, { align: 'right' });
          cx += cols[1].w;
          
          doc.setTextColor(220, 38, 38); // Red
          doc.text(pdfINR(row.out), cx + cols[2].w - 3, y + 4.5, { align: 'right' });
          cx += cols[2].w;
          
          doc.setTextColor(30, 41, 59);
          doc.setFont('helvetica', 'bold');
          doc.text(pdfINR(row.balance), cx + cols[3].w - 3, y + 4.5, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          
          y += 7;
        });

        // Totals (Summary)
        checkY(9);
        doc.setFillColor(248, 250, 252);
        doc.rect(mL, y, contentW, 9, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(mL, y, contentW, 9, 'S');
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text('TOTAL SUMMARY', mL + 3, y + 6);
        doc.setTextColor(22, 163, 74);
        doc.text(pdfINR(totalIncome), mL + cols[0].w + cols[1].w - 3, y + 6, { align: 'right' });
        doc.setTextColor(220, 38, 38);
        doc.text(pdfINR(totalExpense), mL + cols[0].w + cols[1].w + cols[2].w - 3, y + 6, { align: 'right' });
        doc.setTextColor(30, 58, 138);
        doc.text(pdfINR(totalIncome - totalExpense), mL + contentW - 3, y + 6, { align: 'right' });
        y += 12;
      }

      // DETAILED TRANSACTION LOG (If enabled)
      if (showDetailed) {
        checkY(20);
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('DETAILED TRANSACTION LOG', mL, y);
        y += 8;

        const detailCols = [
          { label: 'Date', w: 16 },
          { label: 'Type', w: 13 },
          { label: 'Category', w: 30 },
          { label: 'Description', w: 100 },
          { label: 'Amount', w: 21, align: 'right' },
        ];

        doc.setFillColor(71, 85, 105); // slate-600
        doc.rect(mL, y, contentW, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        let dx = mL;
        detailCols.forEach(col => {
          if (col.align === 'right') doc.text(col.label, dx + col.w - 2, y + 5, { align: 'right' });
          else doc.text(col.label, dx + 2, y + 5);
          dx += col.w;
        });
        y += 7;

        doc.setFont('helvetica', 'normal');
        data.forEach((t, idx) => {
          checkY(6);
          if (idx % 2 === 0) {
            doc.setFillColor(249, 250, 251);
            doc.rect(mL, y, contentW, 6, 'F');
          }
          doc.setTextColor(30, 41, 59);
          let cx = mL;
          doc.text(formatDate(t.date), cx + 2, y + 4.5);
          cx += detailCols[0].w;
          
          doc.setFont('helvetica', 'bold');
          if (t.type === 'income') {
            doc.setTextColor(22, 163, 74);
          } else {
            doc.setTextColor(220, 38, 38);
          }
          doc.text(t.type.toUpperCase(), cx + 2, y + 4.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
          cx += detailCols[1].w;

          doc.text((t.category || t.item || '').substring(0, 16), cx + 2, y + 4.5);
          cx += detailCols[2].w;

          doc.text((t.payerName || t.paidTo || t.notes || '-').substring(0, 60), cx + 2, y + 4.5);
          cx += detailCols[3].w;

          doc.setFont('helvetica', 'bold');
          doc.text(pdfINR(t.amount), pW - mR - 2, y + 4.5, { align: 'right' });
          y += 6;
        });
      }

      // Final Footer
      checkY(30);
      y += 15;
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.5);
      doc.line(pW - mR - 40, y, pW - mR, y);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('SEAL & SIGNATURE', pW - mR - 20, y + 5, { align: 'center' });

      addPageFooter();

      if (window.electronAPI && window.electronAPI.downloadFile) {
        const arrayBuffer = doc.output('arraybuffer');
        await window.electronAPI.downloadFile(arrayBuffer, `MKD-Report-${todayISO()}.pdf`);
        toast.success('Report Saved', { id: 'smart-pdf' });
      } else {
        doc.save(`MKD-Report-${todayISO()}.pdf`);
        toast.success('Report Generated', { id: 'smart-pdf' });
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF', { id: 'smart-pdf' });
    }
  };

  const handleExportExcel = () => {
    const columns = [
      { key: 'date', label: 'Date' },
      { key: 'type', label: 'Type' },
      { key: 'category', label: 'Category' },
      { key: 'description', label: 'Description' },
      { key: 'amount', label: 'Amount' },
      { key: 'paymentStatus', label: 'Status' },
    ];
    const preparedData = data.map(t => ({
      ...t,
      category: t.category || t.item,
      description: t.payerName || t.paidTo || t.notes || '-',
    }));
    exportToExcel(preparedData, columns, `MKD-Report-${todayISO()}.xlsx`);
    toast.success('Excel Downloaded!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 exclude-from-print">
      <div className="absolute inset-0 bg-black/70 exclude-from-print" onClick={onClose} />

      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden z-10 flex flex-col exclude-from-print">
        {/* Action Bar */}
        <div className="no-print flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-3 border-b bg-gray-50 shrink-0 gap-3">
          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <h3 className="text-sm font-bold text-gray-800 tracking-tight">Report Preview</h3>
            
            {/* Toggle Detailed View */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={showDetailed}
                  onChange={(e) => setShowDetailed(e.target.checked)}
                />
                <div className="w-8 h-4 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-full"></div>
              </div>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Detailed</span>
            </label>
          </div>

          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button onClick={onClose} className="flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-bold border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 whitespace-nowrap">
              Close
            </button>
            <button onClick={handleExportExcel} className="flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-bold border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 whitespace-nowrap">
              📊 Excel
            </button>
            <button onClick={handleDownloadPDF} className="flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm whitespace-nowrap">
              ⬇ Download
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-auto bg-slate-100 p-2 sm:p-4 report-preview-scroll scrollbar-thin">
          <div className="min-w-fit flex justify-start sm:justify-center">
            <div ref={printRef} className="mx-auto print-content shadow-2xl bg-white origin-top" style={{ width: '210mm' }}>
            <PrintLayout 
              title={filters?.fromDate ? `${new Date(filters.fromDate).toLocaleString('default', { month: 'long' }).toUpperCase()} ${new Date(filters.fromDate).getFullYear()} (Category-wise summary)` : 'Financial Summary'} 
              dateRange={filters?.fromDate ? `${formatDate(filters.fromDate)} - ${formatDate(filters.toDate)}` : 'Full Period'}
              totalEntries={data.length}
            >
              {/* Summary Table */}
              {!showDetailed && (
                <div className="rounded border border-slate-200 overflow-hidden shadow-sm mb-6">
                  <table className="w-full text-[13px] border-collapse bg-white">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                        <th className="text-left px-4 py-2">Category</th>
                        <th className="text-right px-4 py-2">Cash In</th>
                        <th className="text-right px-4 py-2">Cash Out</th>
                        <th className="text-right px-4 py-2">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-1.5 font-bold text-slate-700 text-[11px] uppercase tracking-tight">{row.category}</td>
                          <td className="px-4 py-1.5 text-right font-bold text-green-600 font-mono">
                            {row.in > 0 ? formatINR(row.in).replace('₹', '').trim() : '0'}
                          </td>
                          <td className="px-4 py-1.5 text-right font-bold text-red-600 font-mono">
                            {row.out > 0 ? formatINR(row.out).replace('₹', '').trim() : '0'}
                          </td>
                          <td className="px-4 py-1.5 text-right font-black text-slate-900 font-mono">
                            {formatINR(row.balance).replace('₹', '').trim()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-black border-t-2 border-slate-200">
                        <td className="px-4 py-2.5 text-slate-800 text-[11px] uppercase tracking-tighter">TOTAL SUMMARY</td>
                        <td className="px-4 py-2.5 text-right text-green-700 font-mono">{formatINR(totalIncome).replace('₹', '').trim()}</td>
                        <td className="px-4 py-2.5 text-right text-red-700 font-mono">{formatINR(totalExpense).replace('₹', '').trim()}</td>
                        <td className="px-4 py-2.5 text-right text-blue-900 text-base font-mono">{formatINR(totalIncome - totalExpense).replace('₹', '').trim()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              
              {/* Detailed Transaction Log */}
              {showDetailed && (
                <div className="mt-8">
                  <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] mb-3 pb-1 border-b-2 border-slate-800 inline-block">
                    Detailed Transaction Log
                  </h3>
                  <div className="rounded border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-[10px] border-collapse bg-white">
                      <thead>
                        <tr className="bg-slate-800 text-white font-bold uppercase tracking-wider">
                          <th className="text-left px-3 py-1.5">Date</th>
                          <th className="text-left px-3 py-1.5">Type</th>
                          <th className="text-left px-3 py-1.5">Category</th>
                          <th className="text-left px-3 py-1.5">Description</th>
                          <th className="text-right px-3 py-1.5">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((t, idx) => (
                          <tr key={idx} className="border-b border-slate-100 last:border-0">
                            <td className="px-3 py-1 text-slate-500 font-medium">{formatDate(t.date)}</td>
                            <td className={`px-3 py-1 font-bold uppercase text-[9px] ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{t.type}</td>
                            <td className="px-3 py-1 font-bold text-slate-700">{t.category || t.item}</td>
                            <td className="px-3 py-1 text-slate-600 italic">{(t.payerName || t.paidTo || t.notes || '-').substring(0, 60)}</td>
                            <td className={`px-3 py-1 text-right font-bold ${t.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                              {formatINR(t.amount).replace('₹', '').trim()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </PrintLayout>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
