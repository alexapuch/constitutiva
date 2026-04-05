export const generateFolio = async (documentId: number | undefined, employeeName: string, commercialName?: string): Promise<string> => {
    const res = await fetch('/api/constancias/folio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: documentId ?? null, employee_name: employeeName }),
    });
    if (!res.ok) {
        console.error('[Folio] Error del servidor:', await res.text());
        // Fallback folio if server fails
        return `0000/26`;
    }
    const { folio } = await res.json();
    console.log('[Folio] Generado:', folio);
    return folio;
};

// Convert folio to URL-safe format: "0001/26" → "0001-26"
export const folioToSlug = (folio: string) => folio.replace('/', '-');
export const slugToFolio = (slug: string) => slug.replace('-', '/');
