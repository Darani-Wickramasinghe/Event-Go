import { saveCsv } from './saveCsv';

function csvCell(value) {
  const text = String(value);
  // Spreadsheet apps can interpret user-entered event titles as formulas.
  const safe = /^[\s\uFEFF]*[=+\-@]|^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function exportAttendanceCsv(event, { reserved, checkedIn, cancelled, attendanceRate }) {
  const rows = [
    ['Event', 'Date', 'Confirmed places', 'Checked in', 'No-shows', 'Cancelled places', 'Attendance rate'],
    [event.title, event.startDate, reserved, checkedIn, reserved - checkedIn, cancelled,
      attendanceRate === null ? '' : `${attendanceRate}%`],
  ];
  const csv = '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
  const name = event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'event';
  return saveCsv(`${name}-${event.startDate}-summary.csv`, csv);
}
