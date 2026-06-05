import jsPDF from 'jspdf';



// Helper to load images asynchronously
const loadImage = (src) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
};

// Formatter Helpers
const formatINRVal = (amount) => {
  const num = Number(amount || 0);
  return num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

const formatDateVal = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? dateString : date.toLocaleDateString('en-GB');
};

export const exportTablePDF = async (elementId, filename) => {
  // Keeping fallback for simple table snapshot exports
  const element = document.getElementById(elementId);
  if (!element) return;
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(element, { scale: 2 });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  if (window.electronAPI && window.electronAPI.downloadFile) {
    const arrayBuffer = pdf.output('arraybuffer');
    await window.electronAPI.downloadFile(arrayBuffer, filename);
  } else {
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  }
};

export const exportDocumentPDF = async (elementId, filename) => {
  // Keeping fallback for simple snapshot document exports
  const element = document.getElementById(elementId);
  if (!element) return;
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(element, { scale: 2 });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  if (window.electronAPI && window.electronAPI.downloadFile) {
    const arrayBuffer = pdf.output('arraybuffer');
    await window.electronAPI.downloadFile(arrayBuffer, filename);
  } else {
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  }
};

// ✅ High-Quality Vector A5 Receipt PDF Generator
export const exportReceiptAsPDF = async (record, fileName = 'receipt') => {
  if (!record) return;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a5', // 210 x 148 mm
  });

  // Load assets
  const logoImg = await loadImage('./image/logo.png');
  const stampImg = await loadImage('./image/stamp.png');
  const signImg = await loadImage('./image/signechure.png');

  // 1. Teal Sidebar (X = 0, Width = 12mm)
  doc.setFillColor(13, 148, 136); // Teal-600
  doc.rect(0, 0, 12, 148, 'F');

  // Sidebar Logo
  if (logoImg) {
    doc.setFillColor(255, 255, 255);
    doc.ellipse(6, 7, 3.5, 3.5, 'F');
    doc.addImage(logoImg, 'PNG', 3.5, 4.5, 5, 5, undefined, 'FAST');
  }

  // Sidebar rotated spine text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text(
    'MARKAZ NAGAR, KIZHUVILAM, TVM   |   +91 9446448786   |   MAKHDOOMIYYA.IN',
    6,
    140,
    { angle: 270, align: 'left' }
  );

  // 2. Header
  // Logo
  doc.setDrawColor(13, 148, 136);
  doc.setLineWidth(0.4);
  doc.circle(24, 15, 6, 'S');
  if (logoImg) {
    doc.addImage(logoImg, 'PNG', 19.5, 10.5, 9, 9, undefined, 'FAST');
  }

  // Academy details
  doc.setTextColor(19, 78, 74); // Teal-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('MAKHDOOMIYYA ACADEMY, ATTINGAL', 33, 13);

  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFontSize(5.5);
  doc.text('UNDER QUADISIYYA ISLAMIC COMPLEX, THAZHUTHALA, KOLLAM', 33, 17);

  // 3. Receipt Metadata (Right align)
  const receiptNo = record.manualReceiptNo || record.digitalReceiptNo || '';
  const dateStr = formatDateVal(record.date);

  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.text('NO:', 152, 12);
  doc.text('DATE:', 152, 18);

  doc.setTextColor(30, 41, 59); // Slate-800
  doc.setFontSize(11);
  doc.setFont('courier', 'bold');
  doc.text(String(receiptNo), 164, 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(dateStr, 164, 18);

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(164, 19.5, 198, 19.5); // line under date

  // 4. Content Fields
  doc.setDrawColor(180, 180, 180);

  // Payer Name
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.setFontSize(7);
  doc.text('RECEIVED WITH THANKS FROM:', 20, 34);
  doc.line(68, 35, 198, 35);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9.5);
  doc.text(record.payerName || '', 70, 33.5);

  // Address & Contact
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7);
  doc.text('ADDRESS:', 20, 48);
  doc.line(36, 49, 135, 49);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.text(record.address || '', 38, 47.5);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7);
  doc.text('CONTACT NO:', 139, 48);
  doc.line(160, 49, 198, 49);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.text(record.contactNo || '', 162, 47.5);

  // Amount In Words
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7);
  doc.text('AMOUNT IN WORDS:', 20, 62);
  doc.line(50, 63, 198, 63);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.text(record.amountInWords || '', 52, 61.5);

  // 5. Footer Layout
  // Amount Received Box
  doc.setDrawColor(19, 78, 74);
  doc.setLineWidth(0.4);
  doc.rect(20, 85, 55, 22); // outer border
  doc.setFillColor(19, 78, 74);
  doc.rect(20, 85, 55, 6, 'F'); // header filled block
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(5.5);
  doc.text('AMOUNT RECEIVED', 47.5, 89.2, { align: 'center' });

  // Draw Currency
  doc.setTextColor(19, 78, 74);
  doc.setFontSize(11);
  doc.setFont('courier', 'bold');
  doc.text(`Rs. ${formatINRVal(record.amount)}/-`, 47.5, 98, { align: 'center' });

  // Stamp and Signature Layering
  if (stampImg) {
    doc.addImage(stampImg, 'PNG', 135, 78, 22, 22, undefined, 'FAST');
  }
  if (signImg) {
    doc.addImage(signImg, 'PNG', 150, 78, 26, 18, undefined, 'FAST');
  }

  // Receiver Signature line
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.3);
  doc.line(145, 101, 195, 101);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text("RECEIVER'S SIGNATURE", 170, 104.5, { align: 'center' });

  // Save the document
  if (window.electronAPI && window.electronAPI.downloadFile) {
    const arrayBuffer = doc.output('arraybuffer');
    await window.electronAPI.downloadFile(arrayBuffer, `${fileName}.pdf`);
  } else {
    doc.save(`${fileName}.pdf`);
  }
};

// ✅ High-Quality Vector A5 Voucher PDF Generator
export const exportVoucherAsPDF = async (record, fileName = 'voucher') => {
  if (!record) return;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a5', // 210 x 148 mm
  });

  // Load assets
  const logoImg = await loadImage('./image/logo.png');
  const stampImg = await loadImage('./image/stamp.png');
  const signImg = await loadImage('./image/signechure.png');

  // 1. Slate Sidebar (X = 0, Width = 12mm)
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 12, 148, 'F');

  // Sidebar Logo
  if (logoImg) {
    doc.setFillColor(255, 255, 255);
    doc.ellipse(6, 7, 3.5, 3.5, 'F');
    doc.addImage(logoImg, 'PNG', 3.5, 4.5, 5, 5, undefined, 'FAST');
  }

  // Sidebar rotated spine text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text(
    'MAKHDOOMIYYA ACADEMY, ATTINGAL   |   VOUCHER SLIP',
    6,
    140,
    { angle: 270, align: 'left' }
  );

  // 2. Header
  // Logo
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.4);
  doc.circle(24, 15, 6, 'S');
  if (logoImg) {
    doc.addImage(logoImg, 'PNG', 19.5, 10.5, 9, 9, undefined, 'FAST');
  }

  // Academy details
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('MAKHDOOMIYYA ACADEMY, ATTINGAL', 33, 13);

  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFontSize(5.5);
  doc.text('UNDER QUADISIYYA ISLAMIC COMPLEX, THAZHUTHALA, KOLLAM', 33, 17);

  // VOUCHER Badge
  doc.setFillColor(30, 41, 59);
  doc.rect(33, 20, 18, 4.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(5.5);
  doc.text('VOUCHER', 42, 23.2, { align: 'center' });

  // 3. Voucher Metadata
  const voucherNo = record.manualVoucherNo || record.voucherNo || '';
  const dateStr = formatDateVal(record.date);

  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.text('NO:', 152, 12);
  doc.text('DATE:', 152, 18);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('courier', 'bold');
  doc.text(String(voucherNo), 164, 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(dateStr, 164, 18);

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(164, 19.5, 198, 19.5);

  // 4. Content Fields
  doc.setDrawColor(180, 180, 180);

  // Pay To
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7);
  doc.text('PAY TO:', 20, 36);
  doc.line(33, 37, 198, 37);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9.5);
  doc.text(record.paidTo || '', 35, 35.5);

  // Rupees In Words
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7);
  doc.text('RUPEES IN WORDS:', 20, 50);
  doc.line(49, 51, 198, 51);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.text(record.amountInWords || '', 51, 49.5);

  // Being
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7);
  doc.text('BEING (PURPOSE):', 20, 64);
  doc.line(47, 65, 198, 65);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.text(record.being || '', 49, 63.5);

  // Debit/Credit
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7);
  doc.text('DEBIT/CREDIT:', 20, 78);
  doc.line(44, 79, 198, 79);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.text(record.paymentMode || '', 46, 77.5);

  // 5. Footer Layout
  // Amount Box
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.4);
  doc.rect(20, 93, 55, 15);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('courier', 'bold');
  doc.text(`Rs. ${formatINRVal(record.amount)}/-`, 47.5, 102.5, { align: 'center' });

  // Approved By Box
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.rect(85, 93, 24, 11);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(record.approvedBy || '', 97, 100.2, { align: 'center' });
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(5.5);
  doc.text('APPROVED BY', 97, 107.2, { align: 'center' });

  // Drawn On Box
  doc.rect(115, 93, 24, 11);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(7.5);
  doc.text(record.drawnOn || '', 127, 100.2, { align: 'center' });
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(5.5);
  doc.text('DRAWN ON', 127, 107.2, { align: 'center' });

  // Stamp and Signature
  if (stampImg) {
    doc.addImage(stampImg, 'PNG', 145, 83, 20, 20, undefined, 'FAST');
  }
  if (signImg) {
    doc.addImage(signImg, 'PNG', 158, 83, 24, 16, undefined, 'FAST');
  }

  // Receiver Signature line
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.3);
  doc.line(150, 104, 195, 104);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(5.5);
  doc.text("RECEIVER'S SIGNATURE", 172.5, 107.5, { align: 'center' });

  // Save the document
  if (window.electronAPI && window.electronAPI.downloadFile) {
    const arrayBuffer = doc.output('arraybuffer');
    await window.electronAPI.downloadFile(arrayBuffer, `${fileName}.pdf`);
  } else {
    doc.save(`${fileName}.pdf`);
  }
};

// Keep experimental backup interface for compatibility, pointing to our new vector generator
export const exportReceiptAsPDFExperimental = exportReceiptAsPDF;
