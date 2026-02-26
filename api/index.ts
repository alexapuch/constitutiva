import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { customAlphabet } from 'nanoid';

const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

const app = express();

app.use(express.json({ limit: '10mb' }));

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hdpqihtbueodtermrqbm.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkcHFpaHRidWVvZHRlcm1ycWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NzUzNzYsImV4cCI6MjA4NzQ1MTM3Nn0.a1O7rfEnktapsaTb-8xi8aQxuDABYXLLD9VK2DSjcdI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
    const { commercial_name, company_name, date, time_start, time_end, address, is_active, activity } = req.body;
    const access_code = generateCode();
    const { data, error } = await supabase
        .from('document_info')
        .insert({ commercial_name, company_name, date, time_start, time_end, address, is_active: is_active ?? 1, activity, access_code })
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
        if (error.code === 'PGRST116') {
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
    const { commercial_name, company_name, date, time_start, time_end, address, is_active, activity } = req.body;
    const { error } = await supabase
        .from('document_info')
        .update({ commercial_name, company_name, date, time_start, time_end, address, is_active, activity })
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

export default app;
