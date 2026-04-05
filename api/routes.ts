import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { customAlphabet } from 'nanoid';

const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hdpqihtbueodtermrqbm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("URGENTE: SUPABASE_SERVICE_ROLE_KEY no está configurada. Las operaciones a la BD fallarán.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || '');

// POST verify admin password
router.post('/auth/verify', (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'Becase26';
    
    if (password === adminPassword) {
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Contraseña incorrecta' });
    }
});

// GET all documents
router.get('/documents', async (req, res) => {
    const { activeOnly } = req.query;
    let query = supabase.from('document_info').select('*').order('id', { ascending: false });
    if (activeOnly === 'true') {
        query = query.eq('is_active', 1);
    }
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST create document
router.post('/documents', async (req, res) => {
    const { commercial_name, company_name, date, time_start, time_end, address, is_active, activity, usuarios, visitantes, sotanos, superiores } = req.body;
    const access_code = generateCode();
    const { data, error } = await supabase
        .from('document_info')
        .insert({ commercial_name, company_name, date, time_start, time_end, address, is_active: is_active ?? 1, activity, access_code, usuarios, visitantes, sotanos, superiores })
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id: data.id, access_code: data.access_code });
});

// GET document by access code
router.get('/documents/code/:code', async (req, res) => {
    const { data, error } = await supabase
        .from('document_info')
        .select('*')
        .eq('access_code', req.params.code)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return res.status(404).json({ error: 'Documento no encontrado o código inválido.' });
        }
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});

// PUT update document
router.put('/documents/:id', async (req, res) => {
    const { commercial_name, company_name, date, time_start, time_end, address, is_active, activity, usuarios, visitantes, sotanos, superiores } = req.body;
    const { error } = await supabase
        .from('document_info')
        .update({ commercial_name, company_name, date, time_start, time_end, address, is_active, activity, usuarios, visitantes, sotanos, superiores })
        .eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// PATCH regenerate access code for a document
router.patch('/documents/:id/regenerate-code', async (req, res) => {
    const access_code = generateCode();
    const { data, error } = await supabase
        .from('document_info')
        .update({ access_code })
        .eq('id', req.params.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ access_code: data.access_code });
});

// DELETE document
router.delete('/documents/:id', async (req, res) => {
    const { error } = await supabase.from('document_info').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// GET employees of a document
router.get('/documents/:id/employees', async (req, res) => {
    const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('document_id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST add employee to document
router.post('/documents/:id/employees', async (req, res) => {
    const { name, role, brigade, signature } = req.body;
    const docId = Number(req.params.id);

    const { data, error } = await supabase
        .from('employees')
        .insert({ document_id: docId, name, role, brigade, signature })
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });

    // Send WhatsApp notification before responding so Vercel doesn't kill the function early
    try {
        const { data: docData } = await supabase
            .from('document_info')
            .select('commercial_name')
            .eq('id', docId)
            .single();
        const actaName = docData?.commercial_name || 'Sin nombre';
        const msg = encodeURIComponent(`🔔 Nueva firma en Acta: ${actaName}\n👤 Firmó: ${name}\n📋 Cargo: ${role || 'N/A'}`);
        await fetch(`https://api.callmebot.com/whatsapp.php?phone=+5219848790569&text=${msg}&apikey=2048530`);
    } catch { /* ignore notification errors */ }

    res.json({ id: data.id });
});

// DELETE employee
router.delete('/employees/:id', async (req, res) => {
    const { error } = await supabase.from('employees').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// --- QUOTES ENDPOINTS ---

// GET all quotes, ordered by latest
router.get('/quotes', async (req, res) => {
    const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST create quote
router.post('/quotes', async (req, res) => {
    const { client_name, company_name, date, admin_name, admin_registration, admin_email, admin_phone, items, subtotal, iva, total } = req.body;
    const { data, error } = await supabase
        .from('quotes')
        .insert({ client_name, company_name, date, admin_name, admin_registration, admin_email, admin_phone, items, subtotal, iva, total })
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// PUT update quote
router.put('/quotes/:id', async (req, res) => {
    const { client_name, company_name, date, admin_name, admin_registration, admin_email, admin_phone, items, subtotal, iva, total } = req.body;
    const { data, error } = await supabase
        .from('quotes')
        .update({ client_name, company_name, date, admin_name, admin_registration, admin_email, admin_phone, items, subtotal, iva, total, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// DELETE quote
router.delete('/quotes/:id', async (req, res) => {
    const { error } = await supabase.from('quotes').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// --- PDF Versioning (Supabase Storage only, no extra table needed) ---
const PDF_BUCKET = 'pdf-versions';

router.post('/pdf-versions', async (req, res) => {
    const { fileName, pdfBase64, documentId, type } = req.body;
    if (!fileName || !pdfBase64) return res.status(400).json({ error: 'fileName and pdfBase64 required' });

    let buffer: Buffer;
    try {
        buffer = Buffer.from(pdfBase64, 'base64');
    } catch (error: any) {
        console.error('Buffer creation failed:', error);
        return res.status(400).json({ error: 'Base64 parsing failed: ' + error.message });
    }

    const timestamp = new Date().getTime(); // Use epoch to avoid ISO string character issues
    const folder = documentId ? String(documentId) : 'manual';
    
    // Remove invalid characters for Supabase Storage keys
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const safeType = (type || 'pdf').replace(/[^a-zA-Z0-9.\-_]/g, '_');
    
    const safeName = `${timestamp}_${safeType}_${cleanFileName}`;
    const storagePath = `${folder}/${safeName}`;

    const { error: uploadError } = await supabase.storage
        .from(PDF_BUCKET)
        .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false });

    if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return res.status(500).json({ error: 'Upload failed: ' + uploadError.message });
    }

    const { data: urlData } = supabase.storage.from(PDF_BUCKET).getPublicUrl(storagePath);

    // Insert into pdf_history table to trigger Realtime
    await supabase.from('pdf_history').insert({
        name: safeName,
        file_path: storagePath,
        public_url: urlData.publicUrl,
        type: type || 'PDF'
    });

    res.json({ fileName: safeName, storagePath, publicUrl: urlData.publicUrl, folder });
});

router.get('/pdf-versions', async (req, res) => {
    const { folder } = req.query;
    const results: any[] = [];

    if (folder) {
        const { data, error } = await supabase.storage.from(PDF_BUCKET).list(String(folder), { limit: 50, sortBy: { column: 'created_at', order: 'desc' } });
        if (error) return res.status(500).json({ error: error.message });
        for (const file of data || []) {
            const { data: urlData } = supabase.storage.from(PDF_BUCKET).getPublicUrl(`${folder}/${file.name}`);
            results.push({ ...file, folder, publicUrl: urlData.publicUrl });
        }
    } else {
        const { data: folders, error } = await supabase.storage.from(PDF_BUCKET).list('', { limit: 100 });
        if (error) return res.status(500).json({ error: error.message });
        for (const f of folders || []) {
            if (!f.name) continue;
            const { data: files } = await supabase.storage.from(PDF_BUCKET).list(f.name, { limit: 20, sortBy: { column: 'created_at', order: 'desc' } });
            for (const file of files || []) {
                const { data: urlData } = supabase.storage.from(PDF_BUCKET).getPublicUrl(`${f.name}/${file.name}`);
                results.push({ ...file, folder: f.name, publicUrl: urlData.publicUrl });
            }
        }
        results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    res.json(results.slice(0, 50));
});

router.delete('/pdf-versions', async (req, res) => {
    const { path } = req.body;
    if (!path) return res.status(400).json({ error: 'path required' });
    const { error } = await supabase.storage.from(PDF_BUCKET).remove([path]);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// --- PDF History API (table-based) ---
router.get('/pdf-history', async (req, res) => {
    const { data, error } = await supabase
        .from('pdf_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

router.delete('/pdf-history-clear', async (req, res) => {
    const { error } = await supabase.from('pdf_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// POST crear folio para constancia
router.post('/constancias/folio', async (req, res) => {
    const { document_id, employee_name, commercial_name } = req.body;
    const year = new Date().getFullYear().toString().slice(-2);
    const { count } = await supabase
        .from('constancias')
        .select('*', { count: 'exact', head: true })
        .like('folio', `%/${year}`);
    const nextNum = ((count ?? 0) + 1).toString().padStart(4, '0');
    const folio = `${nextNum}/${year}`;
    const { error } = await supabase.from('constancias').insert({
        document_id: document_id ?? null,
        employee_name,
        commercial_name: commercial_name ?? null,
        folio,
    });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ folio });
});

// GET verificar constancia - server-side HTML (bypasses React bundle cache issues)
router.get('/verificar/:folio', async (req, res) => {
    const folio = req.params.folio.replace('-', '/');
    const { data, error } = await supabase
        .from('constancias')
        .select('folio, employee_name, created_at, document_id, commercial_name')
        .eq('folio', folio)
        .maybeSingle();

    let bodyHtml = '';

    if (error || !data) {
        bodyHtml = `
            <div style="text-align:center;padding:60px 20px">
                <div style="font-size:64px">❌</div>
                <h1 style="color:#1f2937;margin:16px 0 8px">Documento no encontrado</h1>
                <p style="color:#6b7280">Este documento no existe o no es válido.</p>
            </div>`;
    } else {
        const fecha = new Date(data.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
        // Check if expired (more than 1 year since created_at)
        const createdAt = new Date(data.created_at);
        const expiresAt = new Date(createdAt);
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        const isExpired = new Date() > expiresAt;
        const fechaVencimiento = expiresAt.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
        // Get company name: from constancias.commercial_name or from document_info
        let empresa = data.commercial_name || '—';
        if (!data.commercial_name && data.document_id) {
            const { data: doc } = await supabase.from('document_info').select('commercial_name').eq('id', data.document_id).single();
            if (doc) empresa = doc.commercial_name;
        }

        const headerHtml = isExpired ? `
                        <div style="background:#ef4444;width:64px;height:64px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                        </div>
                        <h1 style="color:#dc2626;margin:0 0 4px;font-size:22px;font-family:sans-serif">Constancia Vencida</h1>
                        <p style="color:#9ca3af;margin:0;font-size:14px;font-family:sans-serif">Este documento venció el ${fechaVencimiento}</p>` : `
                        <div style="background:#22c55e;width:64px;height:64px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                        </div>
                        <h1 style="color:#16a34a;margin:0 0 4px;font-size:22px;font-family:sans-serif">Constancia Válida</h1>
                        <p style="color:#9ca3af;margin:0;font-size:14px;font-family:sans-serif">Documento verificado exitosamente</p>`;

        bodyHtml = `
            <div style="max-width:480px;margin:0 auto;padding:40px 16px">
                <div style="background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);padding:32px;margin-bottom:24px">
                    <div style="text-align:center;margin-bottom:24px">
                        ${headerHtml}
                    </div>
                    <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 20px"/>
                    <div style="font-family:sans-serif;display:flex;flex-direction:column;gap:16px">
                        <div><p style="margin:0 0 2px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Folio</p><p style="margin:0;font-weight:700;font-size:18px;color:#111827">${data.folio}</p></div>
                        <div><p style="margin:0 0 2px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Acredita a</p><p style="margin:0;font-weight:600;color:#111827">${data.employee_name}</p></div>
                        <div><p style="margin:0 0 2px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Empresa</p><p style="margin:0;font-weight:600;color:#111827">${empresa}</p></div>
                        <div><p style="margin:0 0 2px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Fecha de Emisión</p><p style="margin:0;font-weight:600;color:#111827">${fecha}</p></div>
                    </div>
                </div>
                <div style="background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);padding:32px;border-left:4px solid ${isExpired ? '#ef4444' : '#facc15'};font-family:sans-serif">
                    <h2 style="margin:0 0 8px;font-size:15px;color:#111827">${isExpired ? '🚨 Esta constancia ha vencido. ¡Renuévala ahora!' : '⚠️ ¿Esta constancia está próxima a vencer o necesitas capacitar a nuevo personal?'}</h2>
                    <p style="margin:0 0 20px;font-size:14px;color:#6b7280">Renueva tus documentos y cumple con la normatividad. Contáctanos para más información.</p>
                    <a href="https://wa.me/529848764743" style="display:flex;align-items:center;justify-content:center;gap:8px;background:#22c55e;color:#fff;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.555 4.122 1.528 5.855L.057 23.386a.75.75 0 00.926.926l5.53-1.471A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.716 9.716 0 01-4.95-1.357l-.355-.21-3.676.977.978-3.588-.229-.368A9.718 9.718 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
                        Contactar por WhatsApp
                    </a>
                </div>
            </div>`;
    }

    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Verificar Constancia - SEPRISA</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#f9fafb;min-height:100vh;display:flex;align-items:center;justify-content:center}</style>
</head>
<body>${bodyHtml}</body>
</html>`);
});

export default router;
