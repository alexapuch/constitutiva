export const savePdfVersion = async (pdfBlob: Blob, fileName: string, type: string, documentId?: number) => {
  try {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // strip data:... prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(pdfBlob);
    });

    const res = await fetch('/api/pdf-versions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, pdfBase64: base64, documentId, type })
    });

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = errText;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error) errMsg = parsed.error;
      } catch (e) {}
      console.error('Error saving PDF version:', errMsg);
      return { _error: errMsg };
    }

    return await res.json();
  } catch (err) {
    console.error('Error saving PDF version:', err);
    return null;
  }
};
