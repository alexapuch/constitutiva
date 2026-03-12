import express from 'express';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { customAlphabet } from 'nanoid';

const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

app.use(express.json({ limit: '10mb' }));

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hdpqihtbueodtermrqbm.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkcHFpaHRidWVvZHRlcm1ycWJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg3NTM3NiwiZXhwIjoyMDg3NDUxMzc2fQ.CnmygqPk7wXDugd4Awm2nBsgB8TMwRr-_ULPCNKEYeE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- API Routes ---

// GET all documents
app.get('/api/documents', async (req, res) => {
  const { activeOnly } = req.query;
  let query = supabase.from('document_info').select('*');
  if (activeOnly === 'true') {
    query = query.eq('is_active', 1);
  }
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST create document
app.post('/api/documents', async (req, res) => {
  const { commercial_name, company_name, date, time_start, time_end, address, is_active, activity, usuarios, visitantes, sotanos, superiores } = req.body;
  const access_code = generateCode(); // e.g. "V1StGX"
  const { data, error } = await supabase
    .from('document_info')
    .insert({ commercial_name, company_name, date, time_start, time_end, address, is_active: is_active ?? 1, activity, access_code, usuarios, visitantes, sotanos, superiores })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id, access_code: data.access_code });
});

// GET document by access code
app.get('/api/documents/code/:code', async (req, res) => {
  const { data, error } = await supabase
    .from('document_info')
    .select('*')
    .eq('access_code', req.params.code)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // No rows returned
      return res.status(404).json({ error: 'Documento no encontrado o código inválido.' });
    }
    return res.status(500).json({ error: error.message });
  }

  if (data.is_active !== 1) {
    return res.status(404).json({ error: 'El documento ya no está activo.' });
  }

  res.json(data);
});

// PUT update document
app.put('/api/documents/:id', async (req, res) => {
  const { commercial_name, company_name, date, time_start, time_end, address, is_active, activity, usuarios, visitantes, sotanos, superiores } = req.body;
  const { error } = await supabase
    .from('document_info')
    .update({ commercial_name, company_name, date, time_start, time_end, address, is_active, activity, usuarios, visitantes, sotanos, superiores })
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// PATCH regenerate access code for a document
app.patch('/api/documents/:id/regenerate-code', async (req, res) => {
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
app.delete('/api/documents/:id', async (req, res) => {
  const { error } = await supabase.from('document_info').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// GET employees of a document
app.get('/api/documents/:id/employees', async (req, res) => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('document_id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST add employee to document
app.post('/api/documents/:id/employees', async (req, res) => {
  const { name, role, brigade, signature } = req.body;
  const { data, error } = await supabase
    .from('employees')
    .insert({ document_id: Number(req.params.id), name, role, brigade, signature })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

// DELETE employee
app.delete('/api/employees/:id', async (req, res) => {
  const { error } = await supabase.from('employees').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// --- QUOTES ENDPOINTS ---

app.get('/api/quotes', async (req, res) => {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/quotes', async (req, res) => {
  const { client_name, company_name, date, admin_name, admin_registration, admin_email, admin_phone, items, subtotal, iva, total } = req.body;
  const { data, error } = await supabase
    .from('quotes')
    .insert({ client_name, company_name, date, admin_name, admin_registration, admin_email, admin_phone, items, subtotal, iva, total })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/quotes/:id', async (req, res) => {
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

app.delete('/api/quotes/:id', async (req, res) => {
  const { error } = await supabase.from('quotes').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// --- PDF Versioning (Supabase Storage only, no extra table needed) ---
const PDF_BUCKET = 'pdf-versions';

app.post('/api/pdf-versions', async (req, res) => {
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

  res.json({ fileName: safeName, storagePath, publicUrl: urlData.publicUrl, folder });
});

app.get('/api/pdf-versions', async (req, res) => {
  const { folder } = req.query;
  // List all folders first, then files inside
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

app.delete('/api/pdf-versions', async (req, res) => {
  const { path } = req.body;
  if (!path) return res.status(400).json({ error: 'path required' });
  const { error } = await supabase.storage.from(PDF_BUCKET).remove([path]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// --- Server Start ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
