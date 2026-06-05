import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const exportToExcel = async (data, columns, filename) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');

  // Define columns
  worksheet.columns = columns.map(col => ({
    header: col.label,
    key: col.key,
    width: 20
  }));

  // Style the header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data rows
  worksheet.addRows(data);

  // Generate buffer and save file
  const buffer = await workbook.xlsx.writeBuffer();
  if (window.electronAPI && window.electronAPI.downloadFile) {
    await window.electronAPI.downloadFile(buffer, filename);
  } else {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);
  }
};
