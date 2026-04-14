import React, { useEffect, useState, useRef, useCallback } from 'react';
import Swal from 'sweetalert2';
import { DocumentInfo, Employee } from '../types';
import { Trash2, Save, FileText, Users, Plus, Download, Award, Eye, CheckCircle2, RotateCcw, ChevronDown, ChevronRight, MessageCircle, Check, Pencil } from 'lucide-react';
import { generateSimulacroPDF } from '../utils/generateSimulacroPDF';
import { generateBatchConstanciasPDF } from '../utils/generateBatchConstanciasPDF';
import { generateConstanciaPDF } from '../utils/generateConstanciaPDF';
import { generateConstitutivaPDF } from '../utils/generateConstitutivaPDF';
import { generateCartaResponsivaPDF } from '../utils/generateCartaResponsivaPDF';
import { sortEmployees } from '../utils/employees';
import { preloadTemplates } from '../utils/imageCache';
import { generatePdfName } from '../utils/pdfNameGenerator';
import SwipeableRow from '../components/SwipeableRow';
import AdminLoginForm from '../components/AdminLoginForm';
import QuoteModal from '../components/QuoteModal';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../utils/supabaseClient';

// Nuevos componentes extraidos
import SideMenu from '../components/admin/SideMenu';
import DashboardView from '../components/admin/DashboardView';
import QuoteHistoryDrawer from '../components/admin/QuoteHistoryDrawer';
import PdfHistoryDrawer from '../components/admin/PdfHistoryDrawer';
import PdfPreviewModal from '../components/admin/PdfPreviewModal';
import CartaResponsivaView from '../components/admin/CartaResponsivaView';
import ManualConstanciaModal, { CONSTANCIA_TYPES, CONSTANCIA_PDF_PREFIX } from '../components/admin/ManualConstanciaModal';
import { Menu } from 'lucide-react';

const APP_VERSION = 'v1.32';
const SESSION_KEY = 'adminAuth';
const SESSION_VERSION_KEY = 'adminAuthVersion';

export default function AdminView() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    preloadTemplates([
      '/constancia_vacia.png',
      '/constancia_vacia_tulum.png',
      '/constancia_evacuacion.png',
      '/constancia_extintores.png',
      '/constancia_primeros_auxilios.png',
    ]);
  }, []);

  useEffect(() => {
    const checkUser = (session: any) => {
      if (session?.user?.email === 'alexapuch@hotmail.com') {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      checkUser(session);
      setAuthLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      checkUser(session);
      setAuthLoading(false);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const [activeTab, setActiveTab] = useState<'documents' | 'dashboard'>('documents');
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const editSectionRef = useRef<HTMLDivElement>(null);

  // States for Modals/Drawers
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [quoteSearchTerm, setQuoteSearchTerm] = useState('');
  const [quoteToEdit, setQuoteToEdit] = useState<any | null>(null);
  const [showQuoteDrawer, setShowQuoteDrawer] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showDoneSection, setShowDoneSection] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showCartaResponsiva, setShowCartaResponsiva] = useState(false);
  const [turnosSimulacro, setTurnosSimulacro] = useState<'M' | 'MV' | 'MVN'>('MV');
  const [editingEmpId, setEditingEmpId] = useState<number | null>(null);
  const [editingEmpName, setEditingEmpName] = useState('');

  // PDF Preview State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState('');
  const [previewName, setPreviewName] = useState('');

  // PDF History State
  const [pdfHistory, setPdfHistory] = useState<{ type: string; name: string; date: string; publicUrl?: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem('pdfHistory') || '[]'); } catch { return []; }
  });

  const addToHistory = (type: string, name: string, publicUrl?: string) => {
    if (!type.includes('Constancia') && !type.includes('Acta') && !type.includes('Carta') && !type.includes('Simulacro')) return;
    const entry = { type, name, date: new Date().toLocaleString('es-MX'), publicUrl };
    const updated = [entry, ...pdfHistory].slice(0, 100);
    setPdfHistory(updated);
    localStorage.setItem('pdfHistory', JSON.stringify(updated));
  };

  const fetchPdfHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/pdf-history');
      const data = await res.json();
      if (res.ok && data) {
        const entries = data.map((d: any) => {
          let name = d.name.split('_').slice(2).join('_').replace('.pdf', '') || d.name;
          name = name.replace(/_+-_+/g, ' - ').replace(/_+/g, ' ').trim();
          name = name.replace(/[\u0300-\u036f]/g, "");
          return { type: d.type, name, date: new Date(d.created_at).toLocaleString('es-MX'), publicUrl: d.public_url };
        });
        setPdfHistory(entries);
      }
    } catch (error) {
      console.error('Error fetching PDF history:', error);
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (res.ok && data) {
        setDocuments(data);
        if (data.length > 0 && !selectedDocId) {
          setSelectedDocId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  }, [selectedDocId]);

  useEffect(() => {
    if (showQuickModal || showQuoteDrawer || showSideMenu || showCartaResponsiva || showHistoryDrawer || previewUrl) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showQuickModal, showQuoteDrawer, showSideMenu, showCartaResponsiva, showHistoryDrawer, previewUrl]);

  useEffect(() => {
    fetchDocuments();
    fetchQuotes();
  }, [fetchDocuments]);

  useEffect(() => {
    if (showHistoryDrawer) fetchPdfHistory();
  }, [showHistoryDrawer, fetchPdfHistory]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchPdfHistory();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchPdfHistory]);


  useEffect(() => {
    if (isAuthenticated) {
      window.scrollTo(0, 0);
      requestAnimationFrame(() => window.scrollTo(0, 0));
      setTimeout(() => window.scrollTo(0, 0), 100);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedDocId) fetchEmployees(selectedDocId);
    else setEmployees([]);
  }, [selectedDocId]);

  const fetchQuotes = async () => {
    try {
      const res = await fetch('/api/quotes');
      const data = await res.json();
      if (res.ok && data) setQuotes(data);
    } catch (error) { console.error('Error fetching quotes:', error); }
  };

  const fetchEmployees = async (docId: number) => {
    try {
      const res = await fetch(`/api/documents/${docId}/employees`);
      const data = await res.json();
      if (res.ok && data) setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleSaveDocInfo = async () => {
    const docInfo = documents.find(d => d.id === selectedDocId);
    if (!docInfo || !selectedDocId) return;
    setIsSaving(true);
    await fetch(`/api/documents/${selectedDocId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commercial_name: docInfo.commercial_name,
        company_name: (docInfo.company_name || '').toUpperCase(),
        date: docInfo.date,
        time_start: docInfo.time_start,
        time_end: docInfo.time_end,
        address: docInfo.address,
        is_active: docInfo.is_active,
        activity: docInfo.activity,
        usuarios: docInfo.usuarios,
        visitantes: docInfo.visitantes,
        sotanos: docInfo.sotanos,
        superiores: docInfo.superiores
      })
    });
    setIsSaving(false);
    fetchDocuments();
  };

  const handleCopyInstructions = async (doc: DocumentInfo) => {
    const code = doc.access_code || '';
    const text = `Buenas tardes. Para firmar el acta constitutiva de *${doc.commercial_name}*, por favor sigan estos pasos:\n\n1. Ingresen al siguiente enlace: https://constitutiva.vercel.app\n2. En el apartado "Código de acceso", peguen este código: "${code}"\n3. Cuando se abra su acta, den clic en "Firmar y registrarse"\n4. Escriban su nombre, puesto y realicen su firma\n5. Finalmente, den clic en "Guardar firma"\n\nY listo, con eso quedará firmada.`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'absolute';
        ta.style.left = '-999999px';
        document.body.prepend(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      setCopiedId(doc.id ?? null);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo copiar el mensaje', timer: 2000 });
    }
  };

  const handleToggleDone = async (docId: number, currentActive: number) => {
    const newActive = currentActive === 1 ? 0 : 1;
    await fetch(`/api/documents/${docId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: newActive })
    });
    fetchDocuments();
  };

  const handleCreateDocument = async () => {
    const { data: result, error } = await (async () => {
      try {
        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commercial_name: 'Nueva Empresa',
            company_name: 'Nueva Razón Social',
            date: 'Fecha',
            time_start: '12:00',
            time_end: '13:20',
            address: '',
            is_active: 1
          })
        });
        const data = await res.json();
        return { data, error: !res.ok ? data.error : null };
      } catch (err: any) { return { data: null, error: err.message }; }
    })();

    if (!error && result) {
      await fetchDocuments();
      setSelectedDocId(result.id);
    }
  };

  const handleRegenerateCode = async () => {
    if (!selectedDocId) return;
    try {
      const res = await fetch(`/api/documents/${selectedDocId}/regenerate-code`, { method: 'PATCH' });
      const data = await res.json();
      if (res.ok && data.access_code) {
        setDocuments(docs => docs.map(d => d.id === selectedDocId ? { ...d, access_code: data.access_code } : d));
      }
    } catch (err) {
      console.error('Error regenerating code:', err);
    }
  };

  const handleDeleteDocument = async (id: number) => {
    const doc = documents.find(d => d.id === id);
    const result = await Swal.fire({
      title: '¿Eliminar acta?',
      text: `Se eliminará "${doc?.commercial_name || 'este documento'}" y todos sus empleados. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    if (selectedDocId === id) setSelectedDocId(null);
    fetchDocuments();
  };

  const handleDeleteQuote = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "La cotización se eliminará del historial. Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      await fetch(`/api/quotes/${id}`, { method: 'DELETE' });
      fetchQuotes();
      Swal.fire('Eliminado', 'La cotización ha sido eliminada del historial.', 'success');
    }
  };

  const handleSaveEmpName = (id: number) => {
    const trimmed = editingEmpName.trim();
    setEditingEmpId(null);
    if (!trimmed) return;
    fetch(`/api/employees/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: trimmed }) })
      .then(() => { if (selectedDocId) fetchEmployees(selectedDocId); });
  };

  const handleDeleteEmployee = async (id: number) => {
    const emp = employees.find(e => e.id === id);
    const result = await Swal.fire({
      title: '¿Eliminar firma?',
      text: `Se eliminará la firma de "${emp?.name || 'este empleado'}". Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    await fetch(`/api/employees/${id}`, { method: 'DELETE' });
    if (selectedDocId) fetchEmployees(selectedDocId);
  };

  const updateSelectedDoc = (field: keyof DocumentInfo, value: any) => {
    setDocuments(docs => docs.map(d => d.id === selectedDocId ? { ...d, [field]: value } : d));
  };

  const handleUppercaseChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof DocumentInfo
  ) => {
    const input = e.target;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    updateSelectedDoc(field, e.target.value.toUpperCase());
    requestAnimationFrame(() => { input.setSelectionRange(start, end); });
  };

  const docInfo = documents.find(d => d.id === selectedDocId);

  const handleDownloadPDF = async () => {
    if (!docInfo) return;
    await generateConstitutivaPDF(docInfo, employees);
    addToHistory('Acta Constitutiva', generatePdfName('ACTA CONSTITUTIVA', docInfo.commercial_name, docInfo.date));
  };

  const handlePreview = async (generator: () => Promise<string | void>, type: string, name: string) => {
    const url = await generator();
    if (url) {
      setPreviewUrl(url);
      setPreviewType(type);
      setPreviewName(name);
    }
  };

  const handleExportBackup = async () => {
    try {
      const [docsRes, quotesRes] = await Promise.all([
        fetch('/api/documents'),
        fetch('/api/quotes')
      ]);
      const allDocs = await docsRes.json();
      const allQuotes = await quotesRes.json();
      const allEmployees: any[] = [];
      for (const doc of allDocs) {
        const empRes = await fetch(`/api/documents/${doc.id}/employees`);
        const emps = await empRes.json();
        allEmployees.push(...emps);
      }
      const backup = {
        exportDate: new Date().toISOString(),
        version: 'v1.32', // Same arbitrary version flag
        documents: allDocs,
        employees: allEmployees,
        quotes: allQuotes,
        pdfHistory
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_seprisa_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      Swal.fire({ icon: 'success', title: 'Backup exportado', text: `${allDocs.length} documentos, ${allEmployees.length} empleados, ${allQuotes.length} cotizaciones.`, confirmButtonColor: '#1f3769' });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.message, confirmButtonColor: '#722F37' });
    }
  };

  if (authLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!isAuthenticated) return <AdminLoginForm />;

  return (
    <div
      className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-8 px-4 sm:px-6 lg:px-8 font-sans transition-colors"
      style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}
    >
      <SideMenu
        isOpen={showSideMenu}
        onClose={() => setShowSideMenu(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        quotesCount={quotes.length}
        pdfHistoryCount={pdfHistory.length}
        onOpenQuoteHistory={() => { setShowQuoteDrawer(true); }}
        onOpenNewQuote={() => { setShowQuoteModal(true); }}
        onOpenManualConstancia={() => { setShowQuickModal(true); }}
        onOpenCartaResponsiva={() => { setShowCartaResponsiva(true); }}
        onOpenPdfHistory={() => { setShowHistoryDrawer(true); }}
        onExportBackup={handleExportBackup}
        onLogout={async () => {
          await supabase.auth.signOut();
          setIsAuthenticated(false);
        }}
        onNavigateHome={() => {
          Swal.fire({
            title: '¿Salir del panel?',
            text: 'Vas a ir a la pantalla de inicio. Tu sesión se mantendrá activa.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, ir al inicio',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#1e3a8a',
            cancelButtonColor: '#6b7280',
          }).then(result => {
            if (result.isConfirmed) window.location.href = '/';
          });
        }}
      />

      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex justify-between items-center bg-white dark:bg-gray-800 px-4 py-3 rounded-lg shadow-sm transition-colors">
          <button
            onClick={() => setShowSideMenu(true)}
            className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white font-semibold transition-colors"
          >
            <Menu className="w-6 h-6" />
            <span className="text-lg font-bold text-blue-900 dark:text-blue-300">Panel Admin</span>
          </button>
          <span className="text-sm font-medium text-gray-400">{APP_VERSION}</span>
        </div>

        {activeTab === 'dashboard' && (
          <DashboardView documents={documents} quotes={quotes} pdfHistory={pdfHistory} />
        )}

        {activeTab === 'documents' && (<>
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden transition-colors">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
            <h2 className="text-xl font-extrabold flex items-center gap-2 text-blue-900 dark:text-blue-300 tracking-tight">
              <FileText className="w-6 h-6 text-blue-600" />
              Actas Constitutivas
            </h2>
            <button
              onClick={handleCreateDocument}
              className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-md hover:bg-red-700 transition-colors font-bold shadow-md min-h-[44px]"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Nueva Acta</span>
              <span className="inline sm:hidden">Nueva</span>
            </button>
          </div>

          <div className="p-0 bg-gray-50 dark:bg-gray-900" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {/* ── Pendientes ── */}
            <div className="flex flex-col gap-2 p-2 sm:p-4">
              <AnimatePresence>
                {documents.filter(d => d.is_active === 1).map(doc => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <SwipeableRow onDelete={() => handleDeleteDocument(doc.id)} onClick={() => { setSelectedDocId(doc.id); setTimeout(() => { editSectionRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' }); }, 150); }}>
                      <div className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all shadow-sm ${selectedDocId === doc.id ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 ring-1 ring-blue-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:shadow-md'}`}>
                        <div className="flex justify-between items-start mb-3">
                          <span className="font-extrabold text-blue-900 dark:text-blue-300 text-lg leading-tight pr-2">{doc.commercial_name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleDone(doc.id, doc.is_active); }}
                              className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1.5 rounded-lg transition-colors"
                              title="Marcar como terminada"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Terminada</span>
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id); }}
                              className="hidden sm:flex text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                              title="Eliminar Acta"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-600 self-start sm:self-auto">
                            <span className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold tracking-wider">Acceso:</span>
                            <span className="font-mono text-blue-700 dark:text-blue-400 font-bold tracking-widest text-sm">{doc.access_code || 'N/A'}</span>
                            {doc.access_code && (
                              <button
                                onClick={e => { e.stopPropagation(); handleCopyInstructions(doc); }}
                                title="Copiar instrucciones para WhatsApp"
                                className="ml-1 p-1 rounded-md transition-colors text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"
                              >
                                {copiedId === doc.id
                                  ? <Check className="w-3.5 h-3.5 text-green-500" />
                                  : <MessageCircle className="w-3.5 h-3.5" />
                                }
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400 font-medium">Fecha:</span>
                            <span className="font-medium text-gray-700 dark:text-gray-300">{doc.date}</span>
                          </div>
                        </div>
                        <span className="block sm:hidden text-xs text-red-500 mt-3 font-medium opacity-70">← Desliza para eliminar</span>
                      </div>
                    </SwipeableRow>
                  </motion.div>
                ))}
              </AnimatePresence>
              {documents.filter(d => d.is_active === 1).length === 0 && (
                <div className="px-6 py-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mt-2">
                  <FileText className="w-12 h-12 text-blue-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No hay actas pendientes.</p>
                  <p className="text-sm text-gray-400 mt-1">Crea una nueva acta para comenzar.</p>
                </div>
              )}
            </div>

            {/* ── Terminadas (colapsable) ── */}
            {documents.filter(d => d.is_active !== 1).length > 0 && (
              <div className="px-2 sm:px-4 pb-4">
                <button
                  onClick={() => setShowDoneSection(v => !v)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-xl transition-colors text-sm font-bold text-gray-600 dark:text-gray-300"
                >
                  {showDoneSection ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  Terminadas
                  <span className="ml-auto bg-gray-400 dark:bg-gray-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {documents.filter(d => d.is_active !== 1).length}
                  </span>
                </button>
                <AnimatePresence>
                  {showDoneSection && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-2 mt-2">
                        {documents.filter(d => d.is_active !== 1).map(doc => (
                          <SwipeableRow key={doc.id} onDelete={() => handleDeleteDocument(doc.id)} onClick={() => { setSelectedDocId(doc.id); setTimeout(() => { editSectionRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' }); }, 150); }}>
                            <div className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all shadow-sm opacity-60 ${selectedDocId === doc.id ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 ring-1 ring-blue-400 opacity-100' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-gray-600 dark:text-gray-400 text-base leading-tight pr-2 line-through decoration-gray-400">{doc.commercial_name}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleToggleDone(doc.id, doc.is_active); }}
                                    className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-colors"
                                    title="Reactivar acta"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Reactivar</span>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id); }}
                                    className="hidden sm:flex text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                                    title="Eliminar Acta"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span className="font-mono">{doc.access_code || 'N/A'}</span>
                                <span>·</span>
                                <span>{doc.date}</span>
                              </div>
                            </div>
                          </SwipeableRow>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {docInfo && (
          <>
            <div ref={editSectionRef} className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden transition-colors">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-blue-50 dark:bg-gray-800">
                <h2 className="text-xl font-bold flex items-center gap-2 text-blue-900 dark:text-blue-300">
                  <FileText className="w-6 h-6" />
                  Editar Información del Acta Seleccionada
                </h2>
                <button
                  type="button"
                  onClick={handleSaveDocInfo}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 bg-blue-900 text-white px-6 py-2 rounded-md font-bold hover:bg-blue-800 transition-colors shadow-md disabled:opacity-50 min-h-[44px] touch-manipulation cursor-pointer"
                >
                  <Save className="w-5 h-5" />
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre Comercial</label>
                  <input
                    type="text"
                    value={docInfo.commercial_name}
                    onChange={(e) => handleUppercaseChange(e, 'commercial_name')}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código de Acceso (Solo Lectura)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={docInfo.access_code || 'No asignado'}
                      className="w-full border border-gray-200 bg-gray-50 rounded-md p-2 text-gray-600 font-mono"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (docInfo.access_code) {
                          try {
                            if (navigator.clipboard && window.isSecureContext) {
                              await navigator.clipboard.writeText(docInfo.access_code);
                            } else {
                              const textArea = document.createElement("textarea");
                              textArea.value = docInfo.access_code;
                              textArea.style.position = "absolute";
                              textArea.style.left = "-999999px";
                              document.body.prepend(textArea);
                              textArea.select();
                              document.execCommand('copy');
                              textArea.remove();
                            }
                            Swal.fire({
                              icon: 'success',
                              title: '¡Copiado!',
                              text: 'Código copiado al portapapeles',
                              timer: 2000,
                              showConfirmButton: false
                            });
                          } catch (err) {
                            Swal.fire({
                              icon: 'error',
                              title: 'Error',
                              text: 'No se pudo copiar el código',
                              timer: 2000
                            });
                          }
                        }
                      }}
                      className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md transition-colors text-sm font-bold whitespace-nowrap min-h-[44px] flex items-center touch-manipulation cursor-pointer"
                    >
                      Copiar
                    </button>
                    <button
                      type="button"
                      onClick={handleRegenerateCode}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded-md transition-colors text-sm font-bold whitespace-nowrap min-h-[44px] flex items-center touch-manipulation cursor-pointer"
                    >
                      Regenerar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Razón Social</label>
                  <input
                    type="text"
                    value={docInfo.company_name}
                    onChange={(e) => updateSelectedDoc('company_name', e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      const [y, m, d] = val.split('-');
                      const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
                      const formatted = `${parseInt(d)} DE ${meses[parseInt(m) - 1]} DEL ${y}`;
                      updateSelectedDoc('date', formatted);
                    }}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 mb-1"
                  />
                  <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 font-medium">
                    {docInfo.date || 'Sin fecha seleccionada'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora Inicio</label>
                    <input
                      type="text"
                      value={docInfo.time_start}
                      onChange={(e) => updateSelectedDoc('time_start', e.target.value)}
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej. 12:00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora Fin</label>
                    <input
                      type="text"
                      value={docInfo.time_end}
                      onChange={(e) => updateSelectedDoc('time_end', e.target.value)}
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej. 13:00"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección del Inmueble y Ciudad</label>
                  <div className="flex flex-col md:flex-row gap-4 mb-2">
                     <label className="flex items-center gap-2 text-sm text-gray-700">
                       <input
                         type="radio"
                         name="city_selector"
                         checked={((docInfo.address || '').split(/\s*\|\s*/)[1] || 'PLAYA DEL CARMEN') === 'PLAYA DEL CARMEN'}
                         onChange={async () => {
                           const newAddr = (docInfo.address || '').split(/\s*\|\s*/)[0] + ' | PLAYA DEL CARMEN';
                           updateSelectedDoc('address', newAddr);
                           if (selectedDocId) await supabase.from('document_info').update({ address: newAddr }).eq('id', selectedDocId);
                         }}
                         className="text-blue-600 focus:ring-blue-500"
                       /> Playa del Carmen
                     </label>
                     <label className="flex items-center gap-2 text-sm text-gray-700">
                       <input
                         type="radio"
                         name="city_selector"
                         checked={((docInfo.address || '').split(/\s*\|\s*/)[1]) === 'TULUM'}
                         onChange={async () => {
                           const newAddr = (docInfo.address || '').split(/\s*\|\s*/)[0] + ' | TULUM';
                           updateSelectedDoc('address', newAddr);
                           if (selectedDocId) await supabase.from('document_info').update({ address: newAddr }).eq('id', selectedDocId);
                         }}
                         className="text-blue-600 focus:ring-blue-500"
                       /> Tulum
                     </label>
                  </div>
                  <textarea
                    key={`addr-${selectedDocId}`}
                    rows={2}
                    defaultValue={(docInfo.address || '').split(/\s*\|\s*/)[0]}
                    onChange={(e) => {
                       const currentCity = (docInfo.address || '').split(/\s*\|\s*/)[1] || 'PLAYA DEL CARMEN';
                       updateSelectedDoc('address', e.target.value.toUpperCase() + ' | ' + currentCity);
                    }}
                    className="w-full border border-gray-300 rounded-t-md p-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                    placeholder="Ej. Calle 6 bis entre 25 y 30, Col. Centro"
                  />
                  <div className="w-full bg-gray-100 border border-t-0 border-gray-300 rounded-b-md px-3 py-2 text-sm font-semibold text-gray-700 select-none">
                    {((docInfo.address || '').split(/\s*\|\s*/)[0] ? ", " : "") + 
                    (((docInfo.address || '').split(/\s*\|\s*/)[1] || 'PLAYA DEL CARMEN') === 'TULUM' 
                       ? "TULUM, QUINTANA ROO, MÉXICO." 
                       : "PLAYA DEL CARMEN, QUINTANA ROO, MÉXICO.")}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giro o actividad productiva principal</label>
                  <input
                    type="text"
                    value={docInfo.activity || ''}
                    onChange={(e) => handleUppercaseChange(e, 'activity')}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej. HOTEL U HOSPEDAJE TEMPORAL"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden transition-colors">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                    <Users className="w-6 h-6" />
                    Firmas Registradas
                    <span className="text-sm font-normal text-gray-500">({employees.length} en total)</span>
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-gray-200 shadow-sm">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Usuarios:</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0"
                      value={docInfo.usuarios || ''}
                      onChange={(e) => updateSelectedDoc('usuarios', parseInt(e.target.value.replace(/\\D/g, '')) || 0)}
                      className="w-12 border-none bg-transparent p-0 text-center focus:ring-0 text-gray-900 font-semibold"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-gray-200 shadow-sm">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Visitantes:</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0"
                      value={docInfo.visitantes || ''}
                      onChange={(e) => updateSelectedDoc('visitantes', parseInt(e.target.value.replace(/\\D/g, '')) || 0)}
                      className="w-12 border-none bg-transparent p-0 text-center focus:ring-0 text-gray-900 font-semibold"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-gray-200 shadow-sm">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sótanos:</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0"
                      value={docInfo.sotanos || ''}
                      onChange={(e) => updateSelectedDoc('sotanos', parseInt(e.target.value.replace(/\\D/g, '')) || 0)}
                      className="w-12 border-none bg-transparent p-0 text-center focus:ring-0 text-gray-900 font-semibold"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-gray-200 shadow-sm">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Superiores:</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0"
                      value={docInfo.superiores || ''}
                      onChange={(e) => updateSelectedDoc('superiores', parseInt(e.target.value.replace(/\\D/g, '')) || 0)}
                      className="w-12 border-none bg-transparent p-0 text-center focus:ring-0 text-gray-900 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <div className="flex-1 sm:flex-none flex items-center gap-1">
                    <button
                      onClick={async () => { if (docInfo) { const isTulum = (docInfo.address || '').split(/\s*\|\s*/)[1] === 'TULUM'; const tmpl = isTulum ? '/constancia_vacia_tulum.png' : '/constancia_vacia.png'; await generateBatchConstanciasPDF(docInfo, employees, tmpl); addToHistory('Constancias (Lote)', generatePdfName('CONSTANCIAS', docInfo.commercial_name, docInfo.date)); } }}
                      disabled={employees.length === 0}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-l-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm font-bold min-h-[44px]"
                      title="Descargar Todas las Constancias"
                    >
                      <Award className="w-5 h-5" />
                      <span className="whitespace-nowrap">Constancias (Lote)</span>
                    </button>
                    <button
                      onClick={() => { if (docInfo) { const isTulum = (docInfo.address || '').split(/\s*\|\s*/)[1] === 'TULUM'; const tmpl = isTulum ? '/constancia_vacia_tulum.png' : '/constancia_vacia.png'; handlePreview(() => generateBatchConstanciasPDF(docInfo, employees, tmpl, true), 'Constancias (Lote)', generatePdfName('CONSTANCIAS', docInfo.commercial_name, docInfo.date)); } }}
                      disabled={employees.length === 0}
                      className="flex items-center justify-center bg-blue-500 text-white px-2.5 py-2 rounded-r-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
                      title="Vista Previa"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md px-2 py-1 shadow-sm">
                      <span className="text-xs font-medium text-gray-500 whitespace-nowrap mr-1">Turnos:</span>
                      {(['M', 'MV', 'MVN'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setTurnosSimulacro(t)}
                          className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${turnosSimulacro === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                          {t === 'M' ? 'Mat.' : t === 'MV' ? 'Mat.+Ves.' : 'Mat.+Ves.+Noc.'}
                        </button>
                      ))}
                    </div>
                    <div className="flex-1 sm:flex-none flex items-center gap-1">
                      <button
                        onClick={async () => { if (docInfo) { await generateSimulacroPDF(docInfo, employees, false, turnosSimulacro); addToHistory('Cédula Simulacro', generatePdfName('CÉDULA SIMULACRO', docInfo.commercial_name, docInfo.date)); } }}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-l-md hover:bg-blue-700 transition-colors shadow-sm font-bold min-h-[44px]"
                        title="Descargar Cédula de Evaluación de Simulacro"
                      >
                        <Download className="w-5 h-5" />
                        <span className="whitespace-nowrap">Cédula Simulacro</span>
                      </button>
                      <button
                        onClick={() => { if (docInfo) handlePreview(() => generateSimulacroPDF(docInfo, employees, true, turnosSimulacro), 'Cédula Simulacro', generatePdfName('CÉDULA SIMULACRO', docInfo.commercial_name, docInfo.date)); }}
                        className="flex items-center justify-center bg-blue-500 text-white px-2.5 py-2 rounded-r-md hover:bg-blue-600 transition-colors min-h-[44px]"
                        title="Vista Previa"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 sm:flex-none flex items-center gap-1">
                    <button
                      onClick={handleDownloadPDF}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-5 py-2 rounded-l-md hover:bg-red-700 transition-colors shadow-md font-bold min-h-[44px]"
                      title="Descargar Acta Constitutiva"
                    >
                      <Download className="w-5 h-5" />
                      <span className="whitespace-nowrap">Acta Constitutiva</span>
                    </button>
                    <button
                      onClick={() => { if (docInfo) handlePreview(() => generateConstitutivaPDF(docInfo, employees, true), 'Acta Constitutiva', generatePdfName('ACTA CONSTITUTIVA', docInfo.commercial_name, docInfo.date)); }}
                      className="flex items-center justify-center bg-red-500 text-white px-2.5 py-2 rounded-r-md hover:bg-red-600 transition-colors min-h-[44px]"
                      title="Vista Previa"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      <th className="border-b border-gray-200 p-3 text-left">ID</th>
                      <th className="border-b border-gray-200 p-3 text-left">Nombre</th>
                      <th className="border-b border-gray-200 p-3 text-left">Puesto</th>
                      <th className="border-b border-gray-200 p-3 text-left">Brigada</th>
                      <th className="border-b border-gray-200 p-3 text-center">Firma</th>
                      <th className="border-b border-gray-200 p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortEmployees(employees).map((emp, index) => (
                      <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700">
                        <td className="p-3 text-gray-500">#{index + 1}</td>
                        <td className="p-3 font-medium uppercase dark:text-gray-200">
                          {editingEmpId === emp.id ? (
                            <input
                              autoFocus
                              value={editingEmpName}
                              onChange={e => setEditingEmpName(e.target.value.toUpperCase())}
                              onBlur={() => handleSaveEmpName(emp.id)}
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveEmpName(emp.id); if (e.key === 'Escape') setEditingEmpId(null); }}
                              className="border border-blue-400 rounded px-2 py-0.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                              style={{ fontSize: '16px' }}
                            />
                          ) : (
                            <span className="flex items-center gap-1 group">
                              {emp.name}
                              <button
                                onClick={() => { setEditingEmpId(emp.id); setEditingEmpName(emp.name); }}
                                className="opacity-0 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100 text-gray-400 hover:text-blue-500 active:text-blue-500 transition-opacity p-0.5 rounded touch-manipulation"
                                title="Editar nombre"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          )}
                        </td>
                        <td className="p-3 uppercase dark:text-gray-300">{emp.role}</td>
                        <td className="p-3 uppercase dark:text-gray-300">{emp.brigade}</td>
                        <td className="p-3 text-center h-16">
                          <img src={emp.signature} alt="Firma" className="h-10 mx-auto object-contain mix-blend-multiply" />
                        </td>
                        <td className="p-3 text-center flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={async (e) => { e.stopPropagation(); if (docInfo) { await generateConstanciaPDF(docInfo, emp); addToHistory('Constancia', generatePdfName('CONSTANCIA', docInfo.commercial_name, docInfo.date)); } }}
                            className="text-indigo-500 hover:text-indigo-700 p-2 rounded-full hover:bg-indigo-50 transition-colors touch-manipulation cursor-pointer"
                            title="Descargar Constancia"
                          >
                            <Award className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(emp.id); }}
                            className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                            title="Eliminar Firma"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {employees.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500 italic">
                          Aún no hay firmas registradas en esta acta.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        </>)}
      </div>

      <QuoteModal
        isOpen={showQuoteModal}
        onClose={() => { setShowQuoteModal(false); setQuoteToEdit(null); }}
        quoteToEdit={quoteToEdit}
        onQuoteSaved={fetchQuotes}
      />

      <QuoteHistoryDrawer
        isOpen={showQuoteDrawer}
        onClose={() => setShowQuoteDrawer(false)}
        quotes={quotes}
        searchTerm={quoteSearchTerm}
        onSearchChange={setQuoteSearchTerm}
        onEditQuote={(q) => { setQuoteToEdit(q); setShowQuoteModal(true); setShowQuoteDrawer(false); }}
        onDeleteQuote={handleDeleteQuote}
        onNewQuote={() => { setPreviewUrl(null); setPreviewType(''); setPreviewName(''); setShowQuoteDrawer(false); setShowQuoteModal(true); }}
      />

      <CartaResponsivaView
        isOpen={showCartaResponsiva}
        onClose={() => setShowCartaResponsiva(false)}
        documents={documents}
        onGeneratePDF={async (docId, fecha, fvu, dictamenGas) => {
           const doc = documents.find(d => d.id === docId);
           if (!doc) return;
           const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
           let fechaFormateada = doc.date || '';
           if (fecha) {
             const [yr, mo, dy] = fecha.split('-').map(Number);
             fechaFormateada = `${dy} DE ${meses[mo - 1]} DE ${yr}`;
           }
           await generateCartaResponsivaPDF({
             nombreComercial: doc.commercial_name || '',
             razonSocial: doc.company_name || '',
             direccion: doc.address || '',
             giroComercial: doc.activity || '',
             fecha: fechaFormateada,
             fvu: fvu,
             dictamenGas: dictamenGas,
           });
           addToHistory('Carta Responsiva', generatePdfName('CARTA RESPONSIVA', doc.commercial_name || '', fechaFormateada));
        }}
        onPreviewPDF={async (docId, fecha, fvu, dictamenGas) => {
           const doc = documents.find(d => d.id === docId);
           if (!doc) return;
           const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
           let fechaFormateada = doc.date || '';
           if (fecha) {
             const [yr, mo, dy] = fecha.split('-').map(Number);
             fechaFormateada = `${dy} DE ${meses[mo - 1]} DE ${yr}`;
           }
           await handlePreview(() => generateCartaResponsivaPDF({
             nombreComercial: doc.commercial_name || '',
             razonSocial: doc.company_name || '',
             direccion: doc.address || '',
             giroComercial: doc.activity || '',
             fecha: fechaFormateada,
             fvu: fvu,
             dictamenGas: dictamenGas,
           }, true), 'Carta Responsiva', `CARTA RESPONSIVA - ${(doc.commercial_name || '').toUpperCase()} - ${fechaFormateada}`.replace(/[\\/\\\\?%*:|"<>]/g, '-'));
        }}
      />

      <ManualConstanciaModal
        isOpen={showQuickModal}
        onClose={() => setShowQuickModal(false)}
        documents={documents}
        onGenerate={async (qd) => {
           const names = qd.employeeNames.filter((n: string) => n.trim() !== '');
           const fakeDocInfo = {
             id: undefined, commercial_name: qd.commercial_name.toUpperCase(), company_name: '',
             date: qd.date, time_start: '', time_end: '', address: qd.address.toUpperCase(), is_active: 1
           };
           const selectedType = CONSTANCIA_TYPES.find(t => t.id === qd.constanciaType);
           const templateImage = selectedType?.image || '/constancia_vacia.png';
           const prefix = CONSTANCIA_PDF_PREFIX[qd.constanciaType] || 'CONSTANCIA';
           const fileDate = qd.dateISO || fakeDocInfo.date;

           if (names.length === 1) {
             const fakeEmployee = { id: 0, document_id: 0, name: names[0].toUpperCase(), role: '', brigade: '', signature: '' };
             await generateConstanciaPDF(fakeDocInfo, fakeEmployee as any, templateImage, false, prefix, fileDate);
             addToHistory('Constancia', generatePdfName(prefix, qd.commercial_name, fileDate));
           } else {
             const fakeEmployees = names.map((name: string, i: number) => ({ id: i, document_id: 0, name: name.toUpperCase(), role: '', brigade: '', signature: '' }));
             await generateBatchConstanciasPDF(fakeDocInfo, fakeEmployees as any, templateImage, false, prefix, fileDate);
             addToHistory('Constancias (Lote)', generatePdfName(prefix, qd.commercial_name, fileDate));
           }
        }}
        onPreview={async (qd) => {
           const names = qd.employeeNames.filter((n: string) => n.trim() !== '');
           const fakeDocInfo = {
             id: undefined, commercial_name: qd.commercial_name.toUpperCase(), company_name: '',
             date: qd.date, time_start: '', time_end: '', address: qd.address.toUpperCase(), is_active: 1
           };
           const selectedType = CONSTANCIA_TYPES.find(t => t.id === qd.constanciaType);
           const templateImage = selectedType?.image || '/constancia_vacia.png';
           const prefix = CONSTANCIA_PDF_PREFIX[qd.constanciaType] || 'CONSTANCIA';
           const fileDate = qd.dateISO || fakeDocInfo.date;
           if (names.length === 1) {
             const fakeEmp = { id: 0, document_id: 0, name: names[0].toUpperCase(), role: '', brigade: '', signature: '' };
             await handlePreview(() => generateConstanciaPDF(fakeDocInfo, fakeEmp as any, templateImage, true, prefix, fileDate), 'Constancia', generatePdfName(prefix, qd.commercial_name, fileDate));
           } else {
             const fakeEmps = names.map((name: string, i: number) => ({ id: i, document_id: 0, name: name.toUpperCase(), role: '', brigade: '', signature: '' }));
             await handlePreview(() => generateBatchConstanciasPDF(fakeDocInfo, fakeEmps as any, templateImage, true, prefix, fileDate), 'Constancias (Lote)', generatePdfName(prefix, qd.commercial_name, fileDate));
           }
        }}
      />

      <PdfHistoryDrawer
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        pdfHistory={pdfHistory}
        onClearHistory={() => {
          setPdfHistory([]);
          localStorage.removeItem('pdfHistory');
          fetch('/api/pdf-history-clear', { method: 'DELETE' }).catch(() => {});
        }}
      />

      <PdfPreviewModal
        previewUrl={previewUrl}
        previewName={previewName}
        previewType={previewType}
        selectedDocId={selectedDocId}
        onClose={() => {
          setPreviewUrl(null);
          setPreviewType('');
          setPreviewName('');
        }}
        onAddToHistory={addToHistory}
      />
    </div>
  );
}
