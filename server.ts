import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

app.use(express.json({ limit: '10mb' }));

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hdpqihtbueodtermrqbm.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkcHFpaHRidWVvZHRlcm1ycWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NzUzNzYsImV4cCI6MjA4NzQ1MTM3Nn0.a1O7rfEnktapsaTb-8xi8aQxuDABYXLLD9VK2DSjcdI';

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
  const { commercial_name, company_name, date, time_start, time_end, address, is_active } = req.body;
  const { data, error } = await supabase
    .from('document_info')
    .insert({ commercial_name, company_name, date, time_start, time_end, address, is_active: is_active ?? 1 })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

// PUT update document
app.put('/api/documents/:id', async (req, res) => {
  const { commercial_name, company_name, date, time_start, time_end, address, is_active } = req.body;
  const { error } = await supabase
    .from('document_info')
    .update({ commercial_name, company_name, date, time_start, time_end, address, is_active })
    .eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
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

// --- Server Start ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
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

startServer();
