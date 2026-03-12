export const getCompactDate = (dateStr?: string) => {
  if (dateStr) {
    const months: Record<string, string> = {
      'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
      'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
      'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    };
    const parts = dateStr.toLowerCase().split(' de ');
    if (parts.length === 3) {
      let day = parts[0].trim();
      if (day.length === 1) day = '0' + day;
      const month = months[parts[1].trim()] || '01';
      const year = parts[2].trim();
      return `${day}${month}${year}`;
    }
  }
  const d = new Date();
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}${month}${year}`;
};

export const generatePdfName = (type: string, companyName: string, dateStr?: string) => {
  const compactDate = getCompactDate(dateStr);
  const safeCompany = (companyName || '').toUpperCase().trim();
  const normalizedCompany = safeCompany.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return `${type} - ${normalizedCompany} - ${compactDate}`.replace(/[\/\\?%*:|"<>]/g, '-');
};
