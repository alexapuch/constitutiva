import { supabase } from './supabaseClient';

export const generateFolio = async (documentId: number | undefined, employeeName: string): Promise<string> => {
    const year = new Date().getFullYear().toString().slice(-2);

    // Count existing constancias this year to get next sequential number
    const { count } = await supabase
        .from('constancias')
        .select('*', { count: 'exact', head: true })
        .like('folio', `%/${year}`);

    const nextNum = ((count ?? 0) + 1).toString().padStart(4, '0');
    const folio = `${nextNum}/${year}`;

    // Insert record
    const { error: insertError } = await supabase.from('constancias').insert({
        document_id: documentId ?? null,
        employee_name: employeeName,
        folio,
    });

    if (insertError) {
        console.error('[Folio] Error al insertar:', insertError);
    } else {
        console.log('[Folio] Insertado correctamente:', folio);
    }

    return folio;
};

// Convert folio to URL-safe format: "0001/26" → "0001-26"
export const folioToSlug = (folio: string) => folio.replace('/', '-');
export const slugToFolio = (slug: string) => slug.replace('-', '/');
