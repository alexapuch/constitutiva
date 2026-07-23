import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { customAlphabet } from 'nanoid';
import { GoogleGenAI, Type } from '@google/genai';


const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hdpqihtbueodtermrqbm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("URGENTE: Ni SUPABASE_SERVICE_ROLE_KEY ni SUPABASE_KEY están configuradas. Las operaciones a la BD fallarán.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || '');


// Background cleanup function for deleted docs > 15 days
let lastCleanupTime = 0;
const CLEANUP_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours

const cleanupDeletedDocs = async () => {
    const now = Date.now();
    if (now - lastCleanupTime < CLEANUP_INTERVAL) {
        return;
    }
    lastCleanupTime = now;

    try {
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        
        const { data: expiredDocs } = await supabase
            .from('document_info')
            .select('id')
            .eq('is_active', -1)
            .lt('deleted_at', fifteenDaysAgo.toISOString());
            
        if (expiredDocs && expiredDocs.length > 0) {
            for (const doc of expiredDocs) {
                const id = doc.id;
                const { data: files } = await supabase.storage.from('pdf-versions').list(String(id));
                if (files && files.length > 0) {
                    const paths = files.map((f: any) => `${id}/${f.name}`);
                    await supabase.storage.from('pdf-versions').remove(paths);
                }
                await supabase.from('pdf_history').delete().like('file_path', `${id}/%`);
                await supabase.from('constancias').delete().eq('document_id', id);
                await supabase.from('document_info').delete().eq('id', id);
            }
        }
    } catch (e) {
        console.error("Cleanup error:", e);
    }
};

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
    res.json(data);
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
    
    let updateData: any = { commercial_name, company_name, date, time_start, time_end, address, is_active, activity, usuarios, visitantes, sotanos, superiores };
    
    // Clear deleted_at if we are restoring it from recycle bin
    if (is_active === 1 || is_active === 0) {
        updateData.deleted_at = null;
    }

    const { error } = await supabase
        .from('document_info')
        .update(updateData)
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

// DELETE document (soft or hard)
router.delete('/documents/:id', async (req, res) => {
    cleanupDeletedDocs(); // Trigger cleanup in the background when documents are deleted
    const id = req.params.id;
    const { permanent } = req.query;

    if (permanent === 'true') {
        // 1. Delete all files in Storage folder for this document
        const { data: files } = await supabase.storage.from('pdf-versions').list(id);
        if (files && files.length > 0) {
            const paths = files.map((f: any) => `${id}/${f.name}`);
            await supabase.storage.from('pdf-versions').remove(paths);
        }

        // 2. Delete pdf_history records for this document
        await supabase.from('pdf_history').delete().like('file_path', `${id}/%`);

        // 3. Delete constancias linked to this document
        await supabase.from('constancias').delete().eq('document_id', id);

        // 4. Delete the document itself (employees cascade via FK)
        const { error } = await supabase.from('document_info').delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });

        res.json({ success: true, permanent: true });
    } else {
        // Soft delete
        const { error } = await supabase
            .from('document_info')
            .update({ is_active: -1, deleted_at: new Date().toISOString() })
            .eq('id', id);
        if (error) return res.status(500).json({ error: error.message });

        res.json({ success: true, permanent: false });
    }
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

// PATCH update employee name
router.patch('/employees/:id', async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
    const { error } = await supabase.from('employees').update({ name: name.trim().toUpperCase() }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
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
    const { error: histError } = await supabase.from('pdf_history').insert({
        name: safeName,
        file_path: storagePath,
        public_url: urlData.publicUrl,
        type: type || 'PDF'
    });

    if (histError) {
        // If pdf_history insert fails, remove the orphaned Storage file to avoid ghost files
        await supabase.storage.from(PDF_BUCKET).remove([storagePath]);
        console.error('pdf_history insert failed, rolled back Storage file:', histError);
        return res.status(500).json({ error: 'Failed to record PDF history: ' + histError.message });
    }

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
    // 1. Get file paths tracked in pdf_history
    const { data: records } = await supabase.from('pdf_history').select('file_path');

    // 2. Delete tracked Storage files
    if (records && records.length > 0) {
        const paths = records.map((r: any) => r.file_path).filter(Boolean);
        if (paths.length > 0) {
            await supabase.storage.from('pdf-versions').remove(paths);
        }
    }

    // 3. Also delete any orphaned files in the 'manual' folder that aren't in pdf_history
    const { data: manualFiles } = await supabase.storage.from('pdf-versions').list('manual');
    if (manualFiles && manualFiles.length > 0) {
        const orphanPaths = manualFiles.map((f: any) => `manual/${f.name}`);
        await supabase.storage.from('pdf-versions').remove(orphanPaths);
    }

    // 4. Delete all pdf_history records
    const { error } = await supabase.from('pdf_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// POST crear folios en lote para múltiples constancias (evita rate-limiting con listas grandes)
router.post('/constancias/folios-batch', async (req, res) => {
    const { employees } = req.body; // [{document_id, employee_name, commercial_name, address, date}]
    if (!Array.isArray(employees) || employees.length === 0) {
        return res.status(400).json({ error: 'employees array required' });
    }

    // Buscamos constancias existentes para este document_id o commercial_name
    const documentId = employees[0].document_id;
    let existingConstancias: any[] = [];
    if (documentId) {
        const { data } = await supabase.from('constancias').select('*').eq('document_id', documentId);
        if (data) existingConstancias = data;
    } else {
        const commercialName = employees[0].commercial_name;
        if (commercialName) {
            const { data } = await supabase.from('constancias').select('*').ilike('commercial_name', commercialName);
            if (data) existingConstancias = data;
        }
    }

    const year = new Date().getFullYear().toString().slice(-2);

    // Use max folio number so deleting rows never causes duplicates
    const { data: maxData, error: countError } = await supabase
        .from('constancias')
        .select('folio')
        .like('folio', `%/${year}`)
        .order('folio', { ascending: false })
        .limit(1);
    if (countError) return res.status(500).json({ error: countError.message });
    const maxNum = maxData && maxData.length > 0 ? (parseInt(maxData[0].folio.split('/')[0], 10) || 0) : 0;

    let next = maxNum + 1;
    const folios: string[] = [];
    const rows: any[] = [];

    for (const emp of employees) {
        let existing = existingConstancias.find(c => {
            const sameName = c.employee_name.trim().toUpperCase() === emp.employee_name.trim().toUpperCase();
            const sameDoc = c.document_id && emp.document_id && String(c.document_id) === String(emp.document_id);
            const sameComm = c.commercial_name && emp.commercial_name && c.commercial_name.trim().toUpperCase() === emp.commercial_name.trim().toUpperCase();
            return sameName && (sameDoc || sameComm);
        });

        if (existing) {
            folios.push(existing.folio);
        } else {
            const folio = `${String(next).padStart(4, '0')}/${year}`;
            folios.push(folio);
            const newRow = {
                document_id: emp.document_id ?? null,
                employee_name: emp.employee_name,
                commercial_name: emp.commercial_name ?? null,
                address: emp.address ?? null,
                date: emp.date ?? null,
                folio,
            };
            rows.push(newRow);
            existingConstancias.push(newRow); // Evitar duplicados dentro del mismo lote
            next++;
        }
    }

    // Un solo insert masivo para los nuevos
    if (rows.length > 0) {
        const { error } = await supabase.from('constancias').insert(rows);
        if (error) return res.status(500).json({ error: error.message });
    }

    res.json({ folios });
});

// POST crear folio para constancia (individual — usado para constancias de 1 persona)
router.post('/constancias/folio', async (req, res) => {
    const { document_id, employee_name, commercial_name, address, date } = req.body;
    
    let query = supabase.from('constancias').select('folio').ilike('employee_name', employee_name);
    if (document_id) {
        query = query.eq('document_id', document_id);
    } else if (commercial_name) {
        query = query.ilike('commercial_name', commercial_name);
    }
    const { data: existingData } = await query.limit(1);

    if (existingData && existingData.length > 0 && existingData[0].folio) {
        return res.json({ folio: existingData[0].folio });
    }

    const year = new Date().getFullYear().toString().slice(-2);
    const { data: maxData } = await supabase
        .from('constancias')
        .select('folio')
        .like('folio', `%/${year}`)
        .order('folio', { ascending: false })
        .limit(1);
    const maxNum = maxData && maxData.length > 0 ? (parseInt(maxData[0].folio.split('/')[0], 10) || 0) : 0;
    const folio = `${String(maxNum + 1).padStart(4, '0')}/${year}`;
    const { error } = await supabase.from('constancias').insert({
        document_id: document_id ?? null,
        employee_name,
        commercial_name: commercial_name ?? null,
        address: address ?? null,
        date: date ?? null,
        folio,
    });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ folio });
});

// DELETE constancias by folio list
router.delete('/constancias', async (req, res) => {
    const { folios } = req.body;
    if (!Array.isArray(folios) || folios.length === 0) {
        return res.status(400).json({ error: 'folios array required' });
    }
    const { error } = await supabase.from('constancias').delete().in('folio', folios);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ deleted: folios.length });
});

// GET all constancias
router.get('/constancias', async (req, res) => {
    const { data, error } = await supabase
        .from('constancias')
        .select('folio, employee_name, commercial_name, address, date, created_at, document_id')
        .order('created_at', { ascending: false })
        .limit(500); // Limit to 500 to avoid huge payloads, could add pagination if needed

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// GET verificar constancia - JSON (used by React)
router.get('/constancias/folio/:folio', async (req, res) => {
    const folio = req.params.folio.replace('-', '/');
    const { data, error } = await supabase
        .from('constancias')
        .select('folio, employee_name, created_at, commercial_name')
        .eq('folio', folio)
        .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Documento no encontrado' });

    res.json(data);
});

// GET verificar constancia - server-side HTML (bypasses React bundle cache issues)
// PUT update constancia
router.put('/constancias/folio/:folio', async (req, res) => {
    const folio = req.params.folio.replace('-', '/');
    const { employee_name, commercial_name, address, date } = req.body;
    
    const { data, error } = await supabase
        .from('constancias')
        .update({ employee_name, commercial_name, address, date })
        .eq('folio', folio)
        .select()
        .single();
        
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// PUT update multiple constancias in batch
router.put('/constancias/batch', async (req, res) => {
    const { folios, commercial_name, address, date } = req.body;
    
    if (!Array.isArray(folios) || folios.length === 0) {
        return res.status(400).json({ error: 'folios array required' });
    }
    
    const updateData: any = {};
    if (commercial_name !== undefined) updateData.commercial_name = commercial_name;
    if (address !== undefined) updateData.address = address;
    if (date !== undefined) updateData.date = date;

    const { error } = await supabase
        .from('constancias')
        .update(updateData)
        .in('folio', folios);
        
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, updated: folios.length });
});

router.get('/v/:folio', (req, res) => {
    res.redirect(`/api/verificar/${req.params.folio}`);
});

router.get('/verificar/:folio', async (req, res) => {
    const folio = req.params.folio.replace('-', '/');

    // Preview / test QR codes — no database lookup needed
    if (folio.toUpperCase().startsWith('PREV/')) {
        const bodyHtml = `
            <div style="max-width:480px;margin:0 auto;padding:40px 16px">
                <div style="background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);padding:32px;margin-bottom:24px;border-top:4px solid #2563eb">
                    <div style="text-align:center;margin-bottom:24px">
                        <div style="font-size:56px;margin-bottom:12px">✨</div>
                        <h1 style="color:#1e3a5f;margin:0 0 4px;font-size:22px;font-family:sans-serif">Vista Previa de Código QR</h1>
                        <p style="color:#9ca3af;margin:0;font-size:14px;font-family:sans-serif">Este es un código QR de prueba</p>
                    </div>
                    <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 20px"/>
                    <div style="font-family:sans-serif;display:flex;flex-direction:column;gap:16px">
                        <div><p style="margin:0 0 2px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Folio Temporal</p><p style="margin:0;font-weight:700;font-size:18px;color:#111827">${folio.toUpperCase()}</p></div>
                        <div><p style="margin:0 0 2px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Acredita a</p><p style="margin:0;font-weight:600;color:#111827">JUAN PÉREZ (EJEMPLO)</p></div>
                        <div><p style="margin:0 0 2px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Empresa</p><p style="margin:0;font-weight:600;color:#111827">EMPRESA DE PRUEBA S.A. DE C.V.</p></div>
                        <div><p style="margin:0 0 2px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Estatus del QR</p><p style="margin:0;font-weight:700;color:#2563eb">VISTA PREVIA / TEST</p></div>
                    </div>
                    <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;padding:16px 0 0;border-top:1px solid #f3f4f6;text-align:center;line-height:1.6;font-family:sans-serif">
                        Este código QR se genera automáticamente al ver el borrador del documento. Una vez que se emita de manera oficial, se registrará en el sistema y se mostrará la verificación de validez.
                    </p>
                </div>
                <div style="background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);padding:32px;border-left:4px solid #2563eb;font-family:sans-serif">
                    <h2 style="margin:0 0 8px;font-size:15px;color:#111827">¿Necesitas ayuda con tus constancias?</h2>
                    <p style="margin:0 0 20px;font-size:14px;color:#6b7280">Si requieres soporte sobre el generador de documentos o tienes alguna duda técnica, contáctanos.</p>
                    <a href="https://wa.me/529848764743" style="display:flex;align-items:center;justify-content:center;gap:8px;background:#2563eb;color:#fff;padding:14px 24px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px">
                        Contactar Soporte
                    </a>
                </div>
            </div>`;

        return res.send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Vista Previa - SEPRISA</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#f9fafb;min-height:100vh;display:flex;align-items:center;justify-content:center}</style>
</head>
<body>${bodyHtml}</body>
</html>`);
    }

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

router.get('/maps-key', (req, res) => {
    res.json({ key: process.env.GOOGLE_MAPS_PLATFORM_KEY || "" });
});

// Helper function to call Gemini with automatic retries for transient/quota errors
async function callGeminiWithRetry(fn: () => Promise<any>, maxRetries = 3, delayMs = 2000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            console.warn(`Gemini call attempt ${attempt} failed: ${error.message || error}`);
            if (attempt === maxRetries) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        }
    }
}

router.post('/analyze-risks', async (req, res) => {
    try {
        const { places } = req.body;
        
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "No Gemini API Key found in environment variables." });
        }

        if (!places || !Array.isArray(places) || places.length === 0) {
            return res.status(400).json({ error: "No places provided." });
        }

        const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
                headers: {
                    "User-Agent": "aistudio-build",
                },
            },
        });

        const placesData = places.map((p: any) => `- ${p.name} (Tipo: ${p.types?.join(', ')})`).join('\n');

        const response = await callGeminiWithRetry(() => ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: `I have the following real establishments located near the user's coordinates:
${placesData}

For each establishment, please provide:
1. A risk level ("Alto", "Medio", or "Bajo").
2. A realistic civil protection risk description based on the nature of the establishment (e.g. for a restaurant, "Posible incendio por el uso de gas...", for a bank, "Riesgo de asaltos...", for a cinema, "Alta concentración de personas en horarios pico...").
3. Make sure to return them in the exact same order and use the identical name provided.

Return ONLY a JSON array.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: "Exact Name of the establishment as provided" },
                            riskLevel: { type: Type.STRING, description: "Alto, Medio, or Bajo" },
                            riskDescription: { type: Type.STRING, description: "Detailed civil protection risk description" },
                        },
                        required: ["name", "riskLevel", "riskDescription"],
                    },
                },
            },
        }));

        let results = [];
        try {
            if (response && response.text) {
                let textCleaned = response.text.trim();
                if (textCleaned.startsWith('```')) {
                    textCleaned = textCleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
                }
                results = JSON.parse(textCleaned);
            }
        } catch (e) {
            console.error("Failed to parse JSON", e);
            return res.status(500).json({ error: "Invalid JSON response from AI." });
        }

        // Merge results with input places
        const mergedResults = places.map((p: any) => {
            const riskData = results.find((r: any) => r.name === p.name) || { riskLevel: 'Bajo', riskDescription: 'Sin riesgo aparente.' };
            return {
                ...p,
                riskLevel: riskData.riskLevel,
                riskDescription: riskData.riskDescription
            };
        });

        res.json({ results: mergedResults });
    } catch (error: any) {
        console.error("Failed to analyze risks:", error);
        res.status(500).json({ error: `Failed to fetch risk data. ${error.message || ''}` });
    }
});

router.post('/generate-fire-risk-data', async (req, res) => {
    try {
        const { company_name, commercial_name, address, activity, m2, usuarios, visitantes } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ error: "No Gemini API Key found in environment variables." });
        }

        const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
                headers: {
                    "User-Agent": "aistudio-build",
                },
            },
        });

        const promptText = `Analyze this business to estimate inventory data for fire risk analysis (civil protection):
Business Name (Razón Social): ${company_name || "N/A"}
Commercial Name: ${commercial_name || "N/A"}
Address: ${address || ""}
Business Activity / Giro: ${activity || "N/A"}
Square Meters (m²): ${m2 || 50}
Provided Fixed Population: ${usuarios || "N/A"}
Provided Floating Population: ${visitantes || "N/A"}

Please perform the following:
1. Return the clean, normalized address string as "direccion".
2. Estimate the building age (e.g. "5", "10", "N.D.").
3. Estimate the Fixed Population (poblacionFija) and Floating Population (poblacionFlotante) if they were not provided (use the provided ones if they are numbers > 0, otherwise estimate logically based on giro and m²).
4. Estimate logical inventories (in Liters or Kilograms) based on the business type (activity/giro) and size (m²). For example:
   - Gases Inflamables: A restaurant with cocina/food prep should have gas (e.g., 50 to 120 liters), an office or boutique should have 0.
   - Liquidos Inflamables / Combustibles: Usually 0 or small quantities (e.g. 5-10L) unless it's a workshop/paint shop.
   - Solidos Combustibles (furniture, paper, wood, inventory, clothes): Estimate based on m² (e.g. a small restaurant might have 800 to 1500 kg of tables, chairs, kitchen storage; an office might have 500 kg; a clothing boutique might have 1500 kg).
   - Materiales Piroforicos: Almost always 0.

Return ONLY a JSON object matching the requested schema.`;

        const response = await callGeminiWithRetry(() => ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: promptText,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        direccion: { type: Type.STRING, description: "Clean, normalized full address" },
                        antiguedad: { type: Type.STRING, description: "Estimated age of the building in years (e.g., '5', '10', 'N.D.')" },
                        poblacionFija: { type: Type.INTEGER, description: "Estimated fixed population (employees/staff)" },
                        poblacionFlotante: { type: Type.INTEGER, description: "Estimated floating population (customers/visitors)" },
                        gasesInflamables: { type: Type.INTEGER, description: "Estimated LP gas or flammable gas inventory in liters" },
                        liquidosInflamables: { type: Type.INTEGER, description: "Estimated flammable liquids in liters" },
                        liquidosCombustibles: { type: Type.INTEGER, description: "Estimated combustible liquids in liters" },
                        solidosCombustibles: { type: Type.INTEGER, description: "Estimated solid combustibles in kg" },
                        materialesPiroforicos: { type: Type.INTEGER, description: "Estimated pyrophoric or explosive materials in kg" }
                    },
                    required: [
                        "direccion", "antiguedad", "poblacionFija", "poblacionFlotante", "gasesInflamables",
                        "liquidosInflamables", "liquidosCombustibles", "solidosCombustibles", "materialesPiroforicos"
                    ]
                }
            }
        }));

        if (response.text) {
            let textCleaned = response.text.trim();
            if (textCleaned.startsWith('```')) {
                textCleaned = textCleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
            }
            const resultData = JSON.parse(textCleaned);
            return res.json(resultData);
        } else {
            throw new Error("Empty response from Gemini.");
        }
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message || "Failed to generate risk data." });
    }
});

router.post('/generate-risk-section', async (req, res) => {
    try {
        const { company_name, commercial_name, address, activity, m2, usuarios, visitantes, section } = req.body;
        console.log(`[IA] Iniciando generación de sección: ${section} para ${commercial_name || company_name}`);
        console.log(`[IA] 🤖 Generando sección "${section}" para: "${commercial_name || company_name}" (${activity || 'Sin giro'})`);
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            console.error("[IA ERROR] ❌ No se encontró GEMINI_API_KEY.");
            return res.status(500).json({ error: "No Gemini API Key found." });
        }

        const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
                headers: {
                    "User-Agent": "aistudio-build",
                },
            },
        });

        let promptText = `Analyze this business:
Business Name: ${company_name || "N/A"}
Commercial Name: ${commercial_name || "N/A"}
Address: ${address || ""}
Business Activity / Giro: ${activity || "N/A"}
Square Meters (m²): ${m2 || 50}
Fixed Population: ${usuarios || "N/A"}
Floating Population: ${visitantes || "N/A"}\n\n`;

        let responseSchema: any = {};

        if (section === 'generales') {
            promptText += `Estimate general info and croquis signals. Generate a JSON object matching this structure:
{
  "direccion": "street name and number",
  "antiguedad": "building age in years (e.g. '5', '10', 'N.D.')",
  "poblacionFija": number of employees,
  "poblacionFlotante": number of customers/visitors,
  "croquis": {
    "norteGeografico": boolean,
    "riesgosInternos": boolean,
    "zonasAltoRiesgo": boolean,
    "equiposEmergencia": boolean,
    "rutasEvacuacion": boolean,
    "zonaConteo": boolean
  }
}`;
            responseSchema = {
                type: Type.OBJECT,
                properties: {
                    direccion: { type: Type.STRING },
                    antiguedad: { type: Type.STRING },
                    poblacionFija: { type: Type.INTEGER },
                    poblacionFlotante: { type: Type.INTEGER },
                    croquis: {
                        type: Type.OBJECT,
                        properties: {
                            norteGeografico: { type: Type.BOOLEAN },
                            riesgosInternos: { type: Type.BOOLEAN },
                            zonasAltoRiesgo: { type: Type.BOOLEAN },
                            equiposEmergencia: { type: Type.BOOLEAN },
                            rutasEvacuacion: { type: Type.BOOLEAN },
                            zonaConteo: { type: Type.BOOLEAN }
                        },
                        required: ["norteGeografico", "riesgosInternos", "zonasAltoRiesgo", "equiposEmergencia", "rutasEvacuacion", "zonaConteo"]
                    }
                },
                required: ["direccion", "antiguedad", "poblacionFija", "poblacionFlotante", "croquis"]
            };
        } else if (section === 'estructural') {
            promptText += `Estimate structural risks and stairs. Generate a JSON object matching this structure:
{
  "estructural": {
    "inclinacion": boolean,
    "separacion": boolean,
    "deformacion": boolean,
    "grietasMuros": boolean,
    "hundimiento": boolean,
    "grietasPiso": boolean,
    "filtracion": boolean,
    "danosEscaleras": boolean
  },
  "escalerasServicio": {
    "homogeneas": boolean,
    "barandal": boolean,
    "pasamanos": boolean,
    "cinta": boolean,
    "iluminacion": boolean,
    "estado": "BUENO | REGULAR | MALO"
  },
  "escalerasEmergencia": {
    "homogeneas": boolean,
    "barandal": boolean,
    "pasamanos": boolean,
    "cinta": boolean,
    "iluminacion": boolean,
    "estado": "BUENO | REGULAR | MALO"
  }
}`;
            const stairSchema = {
                type: Type.OBJECT,
                properties: {
                    homogeneas: { type: Type.BOOLEAN },
                    barandal: { type: Type.BOOLEAN },
                    pasamanos: { type: Type.BOOLEAN },
                    cinta: { type: Type.BOOLEAN },
                    iluminacion: { type: Type.BOOLEAN },
                    estado: { type: Type.STRING }
                },
                required: ["homogeneas", "barandal", "pasamanos", "cinta", "iluminacion", "estado"]
            };
            responseSchema = {
                type: Type.OBJECT,
                properties: {
                    estructural: {
                        type: Type.OBJECT,
                        properties: {
                            inclinacion: { type: Type.BOOLEAN },
                            separacion: { type: Type.BOOLEAN },
                            deformacion: { type: Type.BOOLEAN },
                            grietasMuros: { type: Type.BOOLEAN },
                            hundimiento: { type: Type.BOOLEAN },
                            grietasPiso: { type: Type.BOOLEAN },
                            filtracion: { type: Type.BOOLEAN },
                            danosEscaleras: { type: Type.BOOLEAN }
                        },
                        required: ["inclinacion", "separacion", "deformacion", "grietasMuros", "hundimiento", "grietasPiso", "filtracion", "danosEscaleras"]
                    },
                    escalerasServicio: stairSchema,
                    escalerasEmergencia: stairSchema
                },
                required: ["estructural", "escalerasServicio", "escalerasEmergencia"]
            };
        } else if (section === 'instalaciones') {
            promptText += `Estimate installations (hidro, gas, electrical, specials) for this specific business type.

CRITICAL RULES FOR GAS INSTALLATIONS:
- If the business is an OFFICE, LAW FIRM (despacho/bufete), CONSULTING, ACCOUNTING, STORE (tienda), SHOE STORE (zapatería), CLOTHING STORE, or any business that typically does NOT cook food or use gas appliances, then ALL gas fields (tanqueEstacionario, tanqueMovil, calentadorAgua, dictamenTecnico) MUST be false, capacidad must be "N/A", fugas must be false, and estado "N/A".
- Only restaurants, hotels, laundries, bakeries, food establishments, or industrial businesses should have gas installations set to true.

CRITICAL RULES FOR ELECTRICAL INSTALLATIONS:
- ALL businesses ALWAYS have electrical installations. Set ALL electrical fields to true (subestacion, tableros, cableado, contactos, interruptores, lamparas, dictamenTecnico).
- lamparasEmergencia should be true for most businesses.
- plantaEmergencia and transformador depend on the size (large businesses have them).
- estado should be "BUENO" for most normal businesses.

Generate a JSON object matching this structure:
{
  "hidrosanitaria": {
    "cisterna": boolean,
    "tinaco": boolean,
    "danosTuberia": boolean,
    "danosLlaves": boolean,
    "dictamenTecnico": boolean
  },
  "gas": {
    "tanqueEstacionario": boolean,
    "tanqueMovil": boolean,
    "calentadorAgua": boolean,
    "dictamenTecnico": boolean,
    "capacidad": "string (e.g. '120 L', '0 L', '30 kg')",
    "fugas": boolean,
    "estado": "BUENO | REGULAR | MALO",
    "recomendaciones": "string"
  },
  "electrica": {
    "subestacion": boolean,
    "tableros": boolean,
    "cableado": boolean,
    "contactos": boolean,
    "interruptores": boolean,
    "lamparas": boolean,
    "lamparasEmergencia": boolean,
    "plantaEmergencia": boolean,
    "transformador": boolean,
    "dictamenTecnico": boolean,
    "recomendaciones": "string",
    "estado": "BUENO | REGULAR | MALO"
  },
  "especiales": {
    "bombasAgua": boolean,
    "ac": boolean,
    "extractores": boolean,
    "ventiladores": boolean,
    "cercaElectrica": boolean,
    "alarmaGeneral": boolean,
    "presurizadores": boolean,
    "recomendaciones": "string"
  }
}`;
            responseSchema = {
                type: Type.OBJECT,
                properties: {
                    hidrosanitaria: {
                        type: Type.OBJECT,
                        properties: {
                            cisterna: { type: Type.BOOLEAN },
                            tinaco: { type: Type.BOOLEAN },
                            danosTuberia: { type: Type.BOOLEAN },
                            danosLlaves: { type: Type.BOOLEAN },
                            dictamenTecnico: { type: Type.BOOLEAN }
                        },
                        required: ["cisterna", "tinaco", "danosTuberia", "danosLlaves", "dictamenTecnico"]
                    },
                    gas: {
                        type: Type.OBJECT,
                        properties: {
                            tanqueEstacionario: { type: Type.BOOLEAN },
                            tanqueMovil: { type: Type.BOOLEAN },
                            calentadorAgua: { type: Type.BOOLEAN },
                            dictamenTecnico: { type: Type.BOOLEAN },
                            capacidad: { type: Type.STRING },
                            fugas: { type: Type.BOOLEAN },
                            estado: { type: Type.STRING },
                            recomendaciones: { type: Type.STRING }
                        },
                        required: ["tanqueEstacionario", "tanqueMovil", "calentadorAgua", "dictamenTecnico", "capacidad", "fugas", "estado", "recomendaciones"]
                    },
                    electrica: {
                        type: Type.OBJECT,
                        properties: {
                            subestacion: { type: Type.BOOLEAN },
                            tableros: { type: Type.BOOLEAN },
                            cableado: { type: Type.BOOLEAN },
                            contactos: { type: Type.BOOLEAN },
                            interruptores: { type: Type.BOOLEAN },
                            lamparas: { type: Type.BOOLEAN },
                            lamparasEmergencia: { type: Type.BOOLEAN },
                            plantaEmergencia: { type: Type.BOOLEAN },
                            transformador: { type: Type.BOOLEAN },
                            dictamenTecnico: { type: Type.BOOLEAN },
                            recomendaciones: { type: Type.STRING },
                            estado: { type: Type.STRING }
                        },
                        required: ["subestacion", "tableros", "cableado", "contactos", "interruptores", "lamparas", "lamparasEmergencia", "plantaEmergencia", "transformador", "dictamenTecnico", "recomendaciones", "estado"]
                    },
                    especiales: {
                        type: Type.OBJECT,
                        properties: {
                            bombasAgua: { type: Type.BOOLEAN },
                            ac: { type: Type.BOOLEAN },
                            extractores: { type: Type.BOOLEAN },
                            ventiladores: { type: Type.BOOLEAN },
                            cercaElectrica: { type: Type.BOOLEAN },
                            alarmaGeneral: { type: Type.BOOLEAN },
                            presurizadores: { type: Type.BOOLEAN },
                            recomendaciones: { type: Type.STRING }
                        },
                        required: ["bombasAgua", "ac", "extractores", "ventiladores", "cercaElectrica", "alarmaGeneral", "presurizadores", "recomendaciones"]
                    }
                },
                required: ["hidrosanitaria", "gas", "electrica", "especiales"]
            };
        } else if (section === 'no_estructural') {
            promptText += `Estimate non-structural objects that can fall, slide, or flip. Generate a JSON object matching this structure:
{
  "caer": {
    "lamparas": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "ventiladores": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "pantallas": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "evaporador": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "cristaleria": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "canceles": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "techos": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "plafones": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "repisas": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "cuadros": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "espejos": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "liquidosToxicos": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "liquidosInflamables": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "liquidosCorrosivos": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "otros": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" }
  },
  "deslizarse": {
    "escritorios": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "mesas": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "sillas": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "refrigeradores": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "ruedas": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" }
  },
  "volcar": {
    "computo": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "libreros": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "roperos": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "lockers": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "archiveros": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "estantes": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "vitrinas": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "tanquesGas": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" },
    "subdivisiones": { "siNo": boolean, "cantidad": number, "estado": "BUENO | REGULAR | MALO" }
  }
}`;
            const itemSchema = {
                type: Type.OBJECT,
                properties: {
                    siNo: { type: Type.BOOLEAN },
                    cantidad: { type: Type.INTEGER },
                    estado: { type: Type.STRING }
                },
                required: ["siNo", "cantidad", "estado"]
            };
            responseSchema = {
                type: Type.OBJECT,
                properties: {
                    caer: {
                        type: Type.OBJECT,
                        properties: {
                            lamparas: itemSchema,
                            ventiladores: itemSchema,
                            pantallas: itemSchema,
                            evaporador: itemSchema,
                            cristaleria: itemSchema,
                            canceles: itemSchema,
                            techos: itemSchema,
                            plafones: itemSchema,
                            repisas: itemSchema,
                            cuadros: itemSchema,
                            espejos: itemSchema,
                            liquidosToxicos: itemSchema,
                            liquidosInflamables: itemSchema,
                            liquidosCorrosivos: itemSchema,
                            otros: itemSchema
                        },
                        required: ["lamparas", "ventiladores", "pantallas", "evaporador", "cristaleria", "canceles", "techos", "plafones", "repisas", "cuadros", "espejos", "liquidosToxicos", "liquidosInflamables", "liquidosCorrosivos", "otros"]
                    },
                    deslizarse: {
                        type: Type.OBJECT,
                        properties: {
                            escritorios: itemSchema,
                            mesas: itemSchema,
                            sillas: itemSchema,
                            refrigeradores: itemSchema,
                            ruedas: itemSchema
                        },
                        required: ["escritorios", "mesas", "sillas", "refrigeradores", "ruedas"]
                    },
                    volcar: {
                        type: Type.OBJECT,
                        properties: {
                            computo: itemSchema,
                            libreros: itemSchema,
                            roperos: itemSchema,
                            lockers: itemSchema,
                            archiveros: itemSchema,
                            estantes: itemSchema,
                            vitrinas: itemSchema,
                            tanquesGas: itemSchema,
                            subdivisiones: itemSchema
                        },
                        required: ["computo", "libreros", "roperos", "lockers", "archiveros", "estantes", "vitrinas", "tanquesGas", "subdivisiones"]
                    }
                },
                required: ["caer", "deslizarse", "volcar"]
            };
        } else if (section === 'otros_internos') {
            promptText += `Estimate other internal risks (inflammable items, obstacles, etc.) and finishes for this specific business type and size (m²).
CRITICAL RULES FOR "otros_internos":
1. "acabados":
   - "losetasAzulejos" should be true for most modern businesses.
   - "cantidadM2" MUST match the square meters (m²) provided or be close to it.
   - "estado" should be "BUENO" for most standard businesses.
2. "otrosRiesgos":
   - "inflamar": "combustibles" and "solventes" should only be true for industrial/workshops or restaurants/bakeries. "papelCarton" should be true for retail or offices.
   - "propiciar": "instalacionGas" should be true only if the business uses gas (food/restaurant/industrial). "cafeteras" should be true for offices, clinics, salons. "contactos" and "apagadores" should always be true. "velas" and "cigarros" should be false.
   - "obstaculizar": All fields (tapetes, macetas, etc.) should generally be false for a compliant safe business, unless specifically relevant.
Generate a JSON object matching this structure:
{
  "acabados": {
    "lambrinesIncombustibles": boolean,
    "lambrinesCombustibles": boolean,
    "pisosDesniveles": boolean,
    "pisosFalsos": boolean,
    "losetasAzulejos": boolean,
    "cantidadM2": number,
    "estado": "BUENO | REGULAR | MALO",
    "recomendaciones": "string"
  },
  "otrosRiesgos": {
    "inflamar": { "combustibles": boolean, "solventes": boolean, "papelCarton": boolean, "recomendaciones": "string" },
    "propiciar": { "cigarros": boolean, "colillas": boolean, "velas": boolean, "instalacionGas": boolean, "cafeteras": boolean, "contactos": boolean, "apagadores": boolean, "cablesMalEstado": boolean, "microondas": boolean, "recomendaciones": "string" },
    "obstaculizar": { "tapetes": boolean, "macetas": boolean, "archiveros": boolean, "pizarrones": boolean, "muebles": boolean, "equiposLimpieza": boolean, "herramientas": boolean, "puertasCerradas": boolean, "lavadoras": boolean, "bombeo": boolean, "recomendaciones": "string" }
  }
}`;
            responseSchema = {
                type: Type.OBJECT,
                properties: {
                    acabados: {
                        type: Type.OBJECT,
                        properties: {
                            lambrinesIncombustibles: { type: Type.BOOLEAN },
                            lambrinesCombustibles: { type: Type.BOOLEAN },
                            pisosDesniveles: { type: Type.BOOLEAN },
                            pisosFalsos: { type: Type.BOOLEAN },
                            losetasAzulejos: { type: Type.BOOLEAN },
                            cantidadM2: { type: Type.INTEGER },
                            estado: { type: Type.STRING },
                            recomendaciones: { type: Type.STRING }
                        },
                        required: ["lambrinesIncombustibles", "lambrinesCombustibles", "pisosDesniveles", "pisosFalsos", "losetasAzulejos", "cantidadM2", "estado", "recomendaciones"]
                    },
                    otrosRiesgos: {
                        type: Type.OBJECT,
                        properties: {
                            inflamar: {
                                type: Type.OBJECT,
                                properties: {
                                    combustibles: { type: Type.BOOLEAN },
                                    solventes: { type: Type.BOOLEAN },
                                    papelCarton: { type: Type.BOOLEAN },
                                    recomendaciones: { type: Type.STRING }
                                },
                                required: ["combustibles", "solventes", "papelCarton", "recomendaciones"]
                            },
                            propiciar: {
                                type: Type.OBJECT,
                                properties: {
                                    cigarros: { type: Type.BOOLEAN },
                                    colillas: { type: Type.BOOLEAN },
                                    velas: { type: Type.BOOLEAN },
                                    instalacionGas: { type: Type.BOOLEAN },
                                    cafeteras: { type: Type.BOOLEAN },
                                    contactos: { type: Type.BOOLEAN },
                                    apagadores: { type: Type.BOOLEAN },
                                    cablesMalEstado: { type: Type.BOOLEAN },
                                    microondas: { type: Type.BOOLEAN },
                                    recomendaciones: { type: Type.STRING }
                                },
                                required: ["cigarros", "colillas", "velas", "instalacionGas", "cafeteras", "contactos", "apagadores", "cablesMalEstado", "microondas", "recomendaciones"]
                            },
                            obstaculizar: {
                                type: Type.OBJECT,
                                properties: {
                                    tapetes: { type: Type.BOOLEAN },
                                    macetas: { type: Type.BOOLEAN },
                                    archiveros: { type: Type.BOOLEAN },
                                    pizarrones: { type: Type.BOOLEAN },
                                    muebles: { type: Type.BOOLEAN },
                                    equiposLimpieza: { type: Type.BOOLEAN },
                                    herramientas: { type: Type.BOOLEAN },
                                    puertasCerradas: { type: Type.BOOLEAN },
                                    lavadoras: { type: Type.BOOLEAN },
                                    bombeo: { type: Type.BOOLEAN },
                                    recomendaciones: { type: Type.STRING }
                                },
                                required: ["tapetes", "macetas", "archiveros", "pizarrones", "muebles", "equiposLimpieza", "herramientas", "puertasCerradas", "lavadoras", "bombeo", "recomendaciones"]
                            }
                        },
                        required: ["inflamar", "propiciar", "obstaculizar"]
                    }
                },
                required: ["acabados", "otrosRiesgos"]
            };
        } else if (section === 'externos') {
            promptText += `Estimate realistic external risks and natural hazards for this business.
CRITICAL RULES FOR "externos":
1. "entorno":
   - Evaluate standard urban external elements. "transformadores" (yes, e.g. "15 MTS"), "banquetas" (yes, "1 MTS"), "alcantarillas" (yes, "5 MTS"), "arboles" (yes, "3 MTS"), "callesTransitadas" (yes, "5 MTS") are usually true in urban commercial zones.
   - High risk elements like "fabricasGas", "gasolineras", "torresAltaTension" should be false unless specifically relevant.
2. "socioOrganizativo":
   - "accidentes": "vehiculosParticulares" and "vehiculosPasajeros" should generally be true for street-facing businesses.
   - "delictivo": "robo" should be true (medium/low concern).
3. "hidrometeorologico":
   - Since this system is located in Quintana Roo, Mexico (Playa del Carmen, Tulum, Cancún): "huracan", "vientosFuertes", "tormentaElectrica", "lluviaTorrencial" and "inundacion.lluvia" MUST always be true.
4. "sanitario":
   - "plaga": "siNo" should be true, "vulnerableA" should be "INSECTOS Y ROEDORES" (standard sanitary risk for any food, retail or office establishment).
Generate a JSON object matching this structure:
{
  "riesgosExternos": {
    "entorno": {
      "tanquesElevados": { "siNo": boolean, "distancia": "string" },
      "postesMalEstado": { "siNo": boolean, "distancia": "string" },
      "torresAltaTension": { "siNo": boolean, "distancia": "string" },
      "transformadores": { "siNo": boolean, "distancia": "string" },
      "inmueblesDanados": { "siNo": boolean, "distancia": "string" },
      "banquetas": { "siNo": boolean, "distancia": "string" },
      "alcantarillas": { "siNo": boolean, "distancia": "string" },
      "arboles": { "siNo": boolean, "distancia": "string" },
      "callesTransitadas": { "siNo": boolean, "distancia": "string" },
      "fabricasGas": { "siNo": boolean, "distancia": "string" },
      "tanquesGasLp": { "siNo": boolean, "distancia": "string" },
      "gasolineras": { "siNo": boolean, "distancia": "string" },
      "espectaculares": { "siNo": boolean, "distancia": "string" },
      "almacenesPeligrosos": { "siNo": boolean, "distancia": "string" },
      "fabricas": { "siNo": boolean, "distancia": "string" },
      "costas": { "siNo": boolean, "distancia": "string" },
      "tallerSolventes": { "siNo": boolean, "distancia": "string" }
    },
    "socioOrganizativo": {
      "accidentes": { "vehiculosParticulares": boolean, "vehiculosPeligrosos": boolean, "vehiculosPasajeros": boolean, "aereos": boolean, "otros": boolean },
      "delictivo": { "robo": boolean, "roboViolencia": boolean, "invasion": boolean, "interrupcion": boolean, "sabotajeServicios": boolean, "sabotajePrivados": boolean, "otros": boolean },
      "disturbios": { "marchas": boolean, "plantones": boolean, "vandalismo": boolean, "otros": boolean },
      "lugaresPublicos": { "bares": boolean, "cantinas": boolean, "antros": boolean, "iglesias": boolean, "restaurantesBares": boolean, "salones": boolean, "construcciones": boolean, "hospitales": boolean, "centrosNocturnos": boolean }
    },
    "geologico": { "fallas": boolean, "sismos": boolean, "deslizamiento": boolean, "hundimiento": boolean },
    "quimico": { "incendios": boolean, "explosiones": boolean, "fugas": boolean, "radiaciones": boolean },
    "hidrometeorologico": {
      "inundacion": { "rio": boolean, "lago": boolean, "lluvia": boolean, "mar": boolean },
      "otros": { "vientosFuertes": boolean, "huracan": boolean, "mareaTormenta": boolean, "tormentaElectrica": boolean, "lluviaTorrencial": boolean, "tromba": boolean, "tornado": boolean, "granizo": boolean, "sequia": boolean }
    },
    "sanitario": {
      "epidemia": { "siNo": boolean, "vulnerableA": "string" },
      "plaga": { "siNo": boolean, "vulnerableA": "string" },
      "envenenamiento": { "siNo": boolean, "vulnerableA": "string" }
    }
  }
}`;
            const extItemSchema = {
                type: Type.OBJECT,
                properties: {
                    siNo: { type: Type.BOOLEAN },
                    distancia: { type: Type.STRING }
                },
                required: ["siNo", "distancia"]
            };
            responseSchema = {
                type: Type.OBJECT,
                properties: {
                    riesgosExternos: {
                        type: Type.OBJECT,
                        properties: {
                            entorno: {
                                type: Type.OBJECT,
                                properties: {
                                    tanquesElevados: extItemSchema,
                                    postesMalEstado: extItemSchema,
                                    torresAltaTension: extItemSchema,
                                    transformadores: extItemSchema,
                                    inmueblesDanados: extItemSchema,
                                    banquetas: extItemSchema,
                                    alcantarillas: extItemSchema,
                                    arboles: extItemSchema,
                                    callesTransitadas: extItemSchema,
                                    fabricasGas: extItemSchema,
                                    tanquesGasLp: extItemSchema,
                                    gasolineras: extItemSchema,
                                    espectaculares: extItemSchema,
                                    almacenesPeligrosos: extItemSchema,
                                    fabricas: extItemSchema,
                                    costas: extItemSchema,
                                    tallerSolventes: extItemSchema
                                },
                                required: ["tanquesElevados", "postesMalEstado", "torresAltaTension", "transformadores", "inmueblesDanados", "banquetas", "alcantarillas", "arboles", "callesTransitadas", "fabricasGas", "tanquesGasLp", "gasolineras", "espectaculares", "almacenesPeligrosos", "fabricas", "costas", "tallerSolventes"]
                            },
                            socioOrganizativo: {
                                type: Type.OBJECT,
                                properties: {
                                    accidentes: {
                                        type: Type.OBJECT,
                                        properties: {
                                            vehiculosParticulares: { type: Type.BOOLEAN },
                                            vehiculosPeligrosos: { type: Type.BOOLEAN },
                                            vehiculosPasajeros: { type: Type.BOOLEAN },
                                            aereos: { type: Type.BOOLEAN },
                                            otros: { type: Type.BOOLEAN }
                                        },
                                        required: ["vehiculosParticulares", "vehiculosPeligrosos", "vehiculosPasajeros", "aereos", "otros"]
                                    },
                                    delictivo: {
                                        type: Type.OBJECT,
                                        properties: {
                                            robo: { type: Type.BOOLEAN },
                                            roboViolencia: { type: Type.BOOLEAN },
                                            invasion: { type: Type.BOOLEAN },
                                            interrupcion: { type: Type.BOOLEAN },
                                            sabotajeServicios: { type: Type.BOOLEAN },
                                            sabotajePrivados: { type: Type.BOOLEAN },
                                            otros: { type: Type.BOOLEAN }
                                        },
                                        required: ["robo", "roboViolencia", "invasion", "interrupcion", "sabotajeServicios", "sabotajePrivados", "otros"]
                                    },
                                    disturbios: {
                                        type: Type.OBJECT,
                                        properties: {
                                            marchas: { type: Type.BOOLEAN },
                                            plantones: { type: Type.BOOLEAN },
                                            vandalismo: { type: Type.BOOLEAN },
                                            otros: { type: Type.BOOLEAN }
                                        },
                                        required: ["marchas", "plantones", "vandalismo", "otros"]
                                    },
                                    lugaresPublicos: {
                                        type: Type.OBJECT,
                                        properties: {
                                            bares: { type: Type.BOOLEAN },
                                            cantinas: { type: Type.BOOLEAN },
                                            antros: { type: Type.BOOLEAN },
                                            iglesias: { type: Type.BOOLEAN },
                                            restaurantesBares: { type: Type.BOOLEAN },
                                            salones: { type: Type.BOOLEAN },
                                            construcciones: { type: Type.BOOLEAN },
                                            hospitales: { type: Type.BOOLEAN },
                                            centrosNocturnos: { type: Type.BOOLEAN }
                                        },
                                        required: ["bares", "cantinas", "antros", "iglesias", "restaurantesBares", "salones", "construcciones", "hospitales", "centrosNocturnos"]
                                    }
                                },
                                required: ["accidentes", "delictivo", "disturbios", "lugaresPublicos"]
                            },
                            geologico: {
                                type: Type.OBJECT,
                                properties: {
                                    fallas: { type: Type.BOOLEAN },
                                    sismos: { type: Type.BOOLEAN },
                                    deslizamiento: { type: Type.BOOLEAN },
                                    hundimiento: { type: Type.BOOLEAN }
                                },
                                required: ["fallas", "sismos", "deslizamiento", "hundimiento"]
                            },
                            quimico: {
                                type: Type.OBJECT,
                                properties: {
                                    incendios: { type: Type.BOOLEAN },
                                    explosiones: { type: Type.BOOLEAN },
                                    fugas: { type: Type.BOOLEAN },
                                    radiaciones: { type: Type.BOOLEAN }
                                },
                                required: ["incendios", "explosiones", "fugas", "radiaciones"]
                            },
                            hidrometeorologico: {
                                type: Type.OBJECT,
                                properties: {
                                    inundacion: {
                                        type: Type.OBJECT,
                                        properties: {
                                            rio: { type: Type.BOOLEAN },
                                            lago: { type: Type.BOOLEAN },
                                            lluvia: { type: Type.BOOLEAN },
                                            mar: { type: Type.BOOLEAN }
                                        },
                                        required: ["rio", "lago", "lluvia", "mar"]
                                    },
                                    otros: {
                                        type: Type.OBJECT,
                                        properties: {
                                            vientosFuertes: { type: Type.BOOLEAN },
                                            huracan: { type: Type.BOOLEAN },
                                            mareaTormenta: { type: Type.BOOLEAN },
                                            tormentaElectrica: { type: Type.BOOLEAN },
                                            lluviaTorrencial: { type: Type.BOOLEAN },
                                            tromba: { type: Type.BOOLEAN },
                                            tornado: { type: Type.BOOLEAN },
                                            granizo: { type: Type.BOOLEAN },
                                            sequia: { type: Type.BOOLEAN }
                                        },
                                        required: ["vientosFuertes", "huracan", "mareaTormenta", "tormentaElectrica", "lluviaTorrencial", "tromba", "tornado", "granizo", "sequia"]
                                    }
                                },
                                required: ["inundacion", "otros"]
                            },
                            sanitario: {
                                type: Type.OBJECT,
                                properties: {
                                    epidemia: {
                                        type: Type.OBJECT,
                                        properties: {
                                            siNo: { type: Type.BOOLEAN },
                                            vulnerableA: { type: Type.STRING }
                                        },
                                        required: ["siNo", "vulnerableA"]
                                    },
                                    plaga: {
                                        type: Type.OBJECT,
                                        properties: {
                                            siNo: { type: Type.BOOLEAN },
                                            vulnerableA: { type: Type.STRING }
                                        },
                                        required: ["siNo", "vulnerableA"]
                                    },
                                    envenenamiento: {
                                        type: Type.OBJECT,
                                        properties: {
                                            siNo: { type: Type.BOOLEAN },
                                            vulnerableA: { type: Type.STRING }
                                        },
                                        required: ["siNo", "vulnerableA"]
                                    }
                                },
                                required: ["epidemia", "plaga", "envenenamiento"]
                            }
                        },
                        required: ["entorno", "socioOrganizativo", "geologico", "quimico", "hidrometeorologico", "sanitario"]
                    }
                },
                required: ["riesgosExternos"]
            };
        }

        let response: any;
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                response = await ai.models.generateContent({
                    model: "gemini-2.5-flash-lite",
                    contents: promptText,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: responseSchema
                    }
                });
                break;
            } catch (genErr: any) {
                const isOverloaded =
                    genErr?.status === 503 ||
                    genErr?.message?.includes('503') ||
                    genErr?.message?.toLowerCase().includes('overloaded') ||
                    genErr?.message?.toLowerCase().includes('unavailable');
                if (isOverloaded && attempt < maxAttempts) {
                    const waitMs = 6000 * attempt;
                    console.log(`[IA] Modelo sobrecargado, intento ${attempt}/${maxAttempts}. Esperando ${waitMs / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, waitMs));
                } else {
                    throw genErr;
                }
            }
        }

        if (response?.text) {
            console.log(`[IA] ✅ Sección "${section}" generada exitosamente.`);
            let textCleaned = response.text.trim();
            if (textCleaned.startsWith('```')) {
                textCleaned = textCleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
            }
            const resultData = JSON.parse(textCleaned);
            return res.json(resultData);
        } else {
            throw new Error("Empty response from Gemini.");
        }
    } catch (error: any) {
        console.error(`[IA ERROR] ❌ Error en generate-risk-section (${req.body.section}):`, error);
        res.status(500).json({ error: error.message || "Failed to generate risk section data." });
    }
});

// --- OSRS Timers & CallMeBot Notifications ---
const CALLMEBOT_PHONE = '+5219848790569';
const CALLMEBOT_APIKEY = '2048530';

async function sendCallMeBotWhatsApp(text: string) {
    try {
        const msg = encodeURIComponent(text);
        await fetch(`https://api.callmebot.com/whatsapp.php?phone=${CALLMEBOT_PHONE}&text=${msg}&apikey=${CALLMEBOT_APIKEY}`);
    } catch (e) {
        console.error('CallMeBot notification error:', e);
    }
}

// Cron handler function to check pending timers & send notifications even when tab/browser is closed
async function checkAndProcessOsrsTimers() {
    try {
        // Query osrs_timers table for pending unnotified timers
        const { data: records, error } = await supabase
            .from('osrs_timers')
            .select('*');

        if (error || !records || records.length === 0) return;

        const now = Date.now();
        const REMINDER_INTERVAL_MS = 45 * 60 * 1000; // 45 mins

        for (const record of records) {
            const isBird = record.type === 'bird_run';
            const typeKey = isBird ? 'bird' : 'herb';
            const endsAtMs = new Date(record.ends_at).getTime();

            if (!record.notified && now >= endsAtMs) {
                // ATOMIC UPDATE: Only update if notified is STILL false
                // This prevents race conditions with pg_cron or concurrent calls
                const { data: updated } = await supabase
                    .from('osrs_timers')
                    .update({ notified: true })
                    .eq('id', record.id)
                    .eq('notified', false)
                    .select();

                if (updated && updated.length > 0) {
                    const message = isBird
                        ? "🐥 ya esta listo tus bird houses"
                        : "🌿 tus herbs ya estan listas para recolectar";
                    
                    await sendCallMeBotWhatsApp(message);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } else if (record.notified) {
                // Check for 45-minute inactivity reminders
                const lastCheck = record.created_at ? new Date(record.created_at).getTime() : endsAtMs;
                const timeSinceNotified = now - Math.max(endsAtMs, lastCheck);
                
                if (timeSinceNotified >= REMINDER_INTERVAL_MS) {
                    const reminderMessage = isBird
                        ? "⚠️ Recordatorio: ¡Aún no has hecho tu bird run!"
                        : "⚠️ Recordatorio: ¡Aún no has recolectado tus herbs!";
                    
                    await sendCallMeBotWhatsApp(reminderMessage);
                    // Update created_at to timestamp of this reminder
                    await supabase
                        .from('osrs_timers')
                        .update({ created_at: new Date().toISOString() })
                        .eq('id', record.id);

                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }

        // Clean up any legacy document_info records if present
        await supabase
            .from('document_info')
            .delete()
            .in('access_code', ['OSRS_BIRD', 'OSRS_HERB']);
    } catch (err) {
        console.error('Error in checkAndProcessOsrsTimers:', err);
    }
}

// Cron endpoint (Called automatically by Vercel Cron or external cron ping)
router.get('/osrs/cron', async (req, res) => {
    await checkAndProcessOsrsTimers();
    res.json({ success: true, timestamp: Date.now() });
});

router.post('/osrs/cron', async (req, res) => {
    await checkAndProcessOsrsTimers();
    res.json({ success: true, timestamp: Date.now() });
});

// Start/Reset a timer
router.post('/osrs/start', async (req, res) => {
    const { type, durationSeconds } = req.body;
    if (!type || (type !== 'bird' && type !== 'herb')) {
        return res.status(400).json({ error: 'Invalid type' });
    }

    const seconds = Number(durationSeconds) || (type === 'bird' ? 50 * 60 : 80 * 60);
    const targetTime = Date.now() + seconds * 1000;
    const dbType = type === 'bird' ? 'bird_run' : 'herb_patch';
    const endsAt = new Date(targetTime).toISOString();

    try {
        // Delete all old records for this timer type to prevent duplicates/stale rows
        await supabase
            .from('osrs_timers')
            .delete()
            .eq('type', dbType);

        // Delete legacy document_info records
        await supabase
            .from('document_info')
            .delete()
            .eq('access_code', `OSRS_${type.toUpperCase()}`);

        // Insert new clean record in osrs_timers
        await supabase
            .from('osrs_timers')
            .insert({
                type: dbType,
                ends_at: endsAt,
                notified: false
            });
    } catch (e) {
        console.error('Error saving OSRS timer to Supabase:', e);
    }

    res.json({ success: true, targetTime });
});

// Stop a timer
router.post('/osrs/stop', async (req, res) => {
    const { type } = req.body;
    if (type === 'bird' || type === 'herb') {
        const dbType = type === 'bird' ? 'bird_run' : 'herb_patch';
        await supabase
            .from('osrs_timers')
            .delete()
            .eq('type', dbType);

        await supabase
            .from('document_info')
            .delete()
            .eq('access_code', `OSRS_${type.toUpperCase()}`);
    }
    res.json({ success: true });
});

// Get current timer targets
router.get('/osrs/status', async (req, res) => {
    try {
        const { data: records } = await supabase
            .from('osrs_timers')
            .select('*')
            .in('type', ['bird_run', 'herb_patch']);

        const statusMap: Record<string, any> = {};
        if (records) {
            for (const r of records) {
                const type = r.type === 'bird_run' ? 'bird' : 'herb';
                statusMap[type] = {
                    targetTime: new Date(r.ends_at).getTime(),
                    status: r.notified ? 'notified' : 'pending'
                };
            }
        }
        res.json(statusMap);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/osrs/notify-custom', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text required' });
    await sendCallMeBotWhatsApp(text);
    res.json({ success: true });
});

router.post('/osrs/test', async (req, res) => {
    await sendCallMeBotWhatsApp("🧪 Mensaje de prueba de OSRS Timers: ¡CallMeBot funcionando correctamente!");
    res.json({ success: true });
});

export default router;


