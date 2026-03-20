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

export default router;
