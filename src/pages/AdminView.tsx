import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { DocumentInfo, Employee } from '../types';
import { Trash2, Save, FileText, Users, Plus, LogOut, Download, Award, Zap, X, Calculator, Menu, Home, ClipboardList, FileSignature, ShieldCheck, History, Moon, Sun, BarChart3, Database, Eye, CloudUpload } from 'lucide-react';
import { generateSimulacroPDF } from '../utils/generateSimulacroPDF';
import { generateBatchConstanciasPDF } from '../utils/generateBatchConstanciasPDF';
import { generateConstanciaPDF } from '../utils/generateConstanciaPDF';
import { generateConstitutivaPDF } from '../utils/generateConstitutivaPDF';
import { generateCartaResponsivaPDF } from '../utils/generateCartaResponsivaPDF';
import { sortEmployees } from '../utils/employees';
import { savePdfVersion } from '../utils/savePdfVersion';
import { generatePdfName } from '../utils/pdfNameGenerator';
import SwipeableRow from '../components/SwipeableRow';
import AdminLoginForm from '../components/AdminLoginForm';
import QuoteModal from '../components/QuoteModal';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../utils/supabaseClient';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function LazyPage({ pageNumber, containerWidth }: { pageNumber: number; containerWidth: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="mb-4 shadow-lg flex justify-center bg-gray-300" style={{ minHeight: containerWidth * 1.414 || 600, width: containerWidth || '100%' }}>
      {isVisible ? (
        <Page
          pageNumber={pageNumber}
          width={containerWidth}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          loading={null}
        />
      ) : null}
    </div>
  );
}
export default function AdminView() {
  const { theme, toggleTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'documents' | 'dashboard'>('documents');
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const editSectionRef = useRef<HTMLDivElement>(null);

  // Manual Constancia Generator State
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [locationSection, setLocationSection] = useState<'pdc' | 'tulum' | null>('pdc');
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const CONSTANCIA_TYPES = [
    { id: 'completa',           label: 'Completa (todos los rubros)',    image: '/constancia_vacia.png',                  location: 'pdc' },
    { id: 'evacuacion',         label: 'Evacuación',                     image: '/constancia_evacuacion.png',             location: 'pdc' },
    { id: 'extintores',         label: 'Uso y Manejo de Extintores',     image: '/constancia_extintores.png',             location: 'pdc' },
    { id: 'primeros_auxilios',  label: 'Primeros Auxilios',              image: '/constancia_primeros_auxilios.png',      location: 'pdc' },
    { id: 'pa_extintores',      label: 'Primeros Auxilios + Extintores', image: '/constancia_pa_extintores.png',          location: 'pdc' },
    { id: 'completa_tulum',          label: 'Completa (todos los rubros)',    image: '/constancia_vacia_tulum.png',             location: 'tulum' },
    { id: 'evacuacion_tulum',        label: 'Evacuación',                     image: '/constancia_evacuacion_tulum.png',        location: 'tulum' },
    { id: 'extintores_tulum',        label: 'Uso y Manejo de Extintores',     image: '/constancias_extintores_tulum.png',       location: 'tulum' },
    { id: 'primeros_auxilios_tulum', label: 'Primeros Auxilios',              image: '/constancia_primeros_auxilios_tulum.png', location: 'tulum' },
    { id: 'pa_extintores_tulum',     label: 'Primeros Auxilios + Extintores', image: '/constancia_pa_extintores_tulum.png',     location: 'tulum' },
  ];
  const [quickData, setQuickData] = useState({
    employeeNames: [''],
    constanciaType: 'completa',
    commercial_name: '',
    address: '',
    date: ''
  });

  // Quote History State
  const [quotes, setQuotes] = useState<any[]>([]);
  const [quoteSearchTerm, setQuoteSearchTerm] = useState('');
  const [quoteToEdit, setQuoteToEdit] = useState<any | null>(null);
  const [showQuoteDrawer, setShowQuoteDrawer] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);

  // PDF History State
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [pdfHistory, setPdfHistory] = useState<{ type: string; name: string; date: string; publicUrl?: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem('pdfHistory') || '[]'); } catch { return []; }
  });
  const addToHistory = (type: string, name: string, publicUrl?: string) => {
    if (!type.includes('Constancia')) return;
    const entry = { type, name, date: new Date().toLocaleString('es-MX'), publicUrl };
    const updated = [entry, ...pdfHistory].slice(0, 100);
    setPdfHistory(updated);
    localStorage.setItem('pdfHistory', JSON.stringify(updated));
  };

  const fetchPdfHistory = useCallback(() => {
    fetch('/api/pdf-history')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const entries = data.map((d: any) => {
            let name = d.name.split('_').slice(2).join('_').replace('.pdf', '') || d.name;
            name = name.replace(/_+-_+/g, ' - ').replace(/_+/g, ' ').trim();
            name = name.replace(/[\u0300-\u036f]/g, "");
            return { type: d.type, name, date: new Date(d.created_at).toLocaleString('es-MX'), publicUrl: d.public_url };
          });
          setPdfHistory(entries);
        }
      })
      .catch(console.error);
  }, []);

  const fetchDocuments = useCallback(async () => {
    const res = await fetch('/api/documents');
    const data = await res.json();
    setDocuments(data);
    if (data.length > 0 && !selectedDocId) {
      setSelectedDocId(data[0].id);
    }
  }, [selectedDocId]);

  // Fetch history when drawer opens
  useEffect(() => {
    if (showHistoryDrawer) fetchPdfHistory();
  }, [showHistoryDrawer, fetchPdfHistory]);

  // Auto-refresh: when tab becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchPdfHistory();
        fetchDocuments();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchPdfHistory, fetchDocuments]);

  // Supabase Realtime: listen for changes on document_info and pdf_history tables
  useEffect(() => {
    const channel = supabase
      .channel('realtime_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_info' }, () => {
        fetchDocuments();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pdf_history' }, () => {
        fetchPdfHistory();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'pdf_history' }, () => {
        fetchPdfHistory();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPdfHistory, fetchDocuments]);

  // PDF Preview State
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState('');
  const [previewName, setPreviewName] = useState('');
  const [savingVersion, setSavingVersion] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [pdfWidth, setPdfWidth] = useState<number>(0);

  useEffect(() => {
    if (previewUrl && pdfContainerRef.current) {
       setTimeout(() => {
          if (pdfContainerRef.current) {
            setPdfWidth(Math.max(pdfContainerRef.current.offsetWidth - 32, 300));
          }
       }, 100);
       
       const handleResize = () => {
         if (pdfContainerRef.current) {
           setPdfWidth(Math.max(pdfContainerRef.current.offsetWidth - 32, 300));
         }
       };
       window.addEventListener('resize', handleResize);
       return () => window.removeEventListener('resize', handleResize);
    } else {
       setNumPages(null);
    }
  }, [previewUrl]);

  // Carta Responsiva State (with autosave restore)
  const [showCartaResponsiva, setShowCartaResponsiva] = useState(false);
  const [cartaDocId, setCartaDocId] = useState<number | null>(() => {
    try { const s = localStorage.getItem('autosave_carta'); if (s) return JSON.parse(s).docId ?? null; } catch {} return null;
  });
  const [cartaFvu, setCartaFvu] = useState(() => {
    try { const s = localStorage.getItem('autosave_carta'); if (s) return JSON.parse(s).fvu ?? ''; } catch {} return '';
  });
  const [cartaDictamenGas, setCartaDictamenGas] = useState(() => {
    try { const s = localStorage.getItem('autosave_carta'); if (s) return JSON.parse(s).dictamenGas ?? true; } catch {} return true;
  });
  const [cartaFecha, setCartaFecha] = useState(() => {
    try { const s = localStorage.getItem('autosave_carta'); if (s) return JSON.parse(s).fecha ?? ''; } catch {} return '';
  });

  useEffect(() => {
    if (showQuickModal || showQuoteDrawer || showSideMenu || showCartaResponsiva || showHistoryDrawer || previewUrl) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showQuickModal, showQuoteDrawer, showSideMenu, showCartaResponsiva, showHistoryDrawer, previewUrl]);

  useEffect(() => {
    fetchDocuments();
    fetchQuotes();
  }, []);

  // Scroll to top when authenticated view renders
  useEffect(() => {
    if (isAuthenticated) {
      window.scrollTo(0, 0);
      requestAnimationFrame(() => window.scrollTo(0, 0));
      setTimeout(() => window.scrollTo(0, 0), 100);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedDocId) {
      fetchEmployees(selectedDocId);
    } else {
      setEmployees([]);
    }
  }, [selectedDocId]);



  // Autosave: carta responsiva form
  useEffect(() => {
    const hasData = cartaDocId || cartaFvu || cartaFecha;
    if (hasData) localStorage.setItem('autosave_carta', JSON.stringify({ docId: cartaDocId, fvu: cartaFvu, dictamenGas: cartaDictamenGas, fecha: cartaFecha }));
    else localStorage.removeItem('autosave_carta');
  }, [cartaDocId, cartaFvu, cartaDictamenGas, cartaFecha]);

  const fetchQuotes = async () => {
    try {
      const res = await fetch('/api/quotes');
      const data = await res.json();
      setQuotes(data);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    }
  };

  const fetchEmployees = async (docId: number) => {
    const res = await fetch(`/api/documents/${docId}/employees`);
    const data = await res.json();
    setEmployees(data);
  };

  const handleSaveDocInfo = async () => {
    const docInfo = documents.find(d => d.id === selectedDocId);
    if (!docInfo) return;
    setIsSaving(true);
    await fetch(`/api/documents/${docInfo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docInfo)
    });
    setIsSaving(false);
    fetchDocuments();
  };

  const handleCreateDocument = async () => {
    const newDoc = {
      commercial_name: 'Nueva Empresa',
      company_name: 'Nueva Razón Social',
      date: 'Fecha',
      time_start: '12:00',
      time_end: '13:20',
      address: '',
      is_active: 1
    };
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDoc)
    });
    const data = await res.json();
    await fetchDocuments();
    setSelectedDocId(data.id);
  };

  const handleRegenerateCode = async () => {
    if (!selectedDocId) return;
    const res = await fetch(`/api/documents/${selectedDocId}/regenerate-code`, { method: 'PATCH' });
    const data = await res.json();
    if (data.access_code) {
      setDocuments(docs => docs.map(d => d.id === selectedDocId ? { ...d, access_code: data.access_code } : d));
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

  const handleQuickAutocomplete = (docId: string) => {
    if (!docId) {
      setQuickData(prev => ({ ...prev, commercial_name: '', address: '', date: '' }));
      return;
    }
    const doc = documents.find(d => d.id.toString() === docId);
    if (doc) {
      setQuickData(prev => ({
        ...prev,
        commercial_name: doc.commercial_name || '',
        address: doc.address || '',
        date: doc.date || ''
      }));
    }
  };

  const handleGenerateManualConstancia = async (e: React.FormEvent) => {
    e.preventDefault();
    const names = quickData.employeeNames.filter(n => n.trim() !== '');
    if (names.length === 0 || !quickData.commercial_name.trim() || !quickData.address.trim() || !quickData.date.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor llena todos los campos, o selecciona un acta existente para autocompletar.',
        confirmButtonColor: '#722F37'
      });
      return;
    }

    const fakeDocInfo: DocumentInfo = {
      id: 0,
      commercial_name: quickData.commercial_name.toUpperCase(),
      company_name: '',
      date: quickData.date,
      time_start: '',
      time_end: '',
      address: quickData.address.toUpperCase(),
      is_active: 1
    };

    const selectedType = CONSTANCIA_TYPES.find(t => t.id === quickData.constanciaType);
    const templateImage = selectedType?.image || '/constancia_vacia.png';

    if (names.length === 1) {
      const fakeEmployee: Employee = {
        id: 0, document_id: 0,
        name: names[0].toUpperCase(),
        role: '', brigade: '', signature: ''
      };
      await generateConstanciaPDF(fakeDocInfo, fakeEmployee, templateImage);
      addToHistory('Constancia', generatePdfName('CONSTANCIA', quickData.commercial_name, fakeDocInfo.date));
    } else {
      const fakeEmployees: Employee[] = names.map((name, i) => ({
        id: i, document_id: 0,
        name: name.toUpperCase(),
        role: '', brigade: '', signature: ''
      }));
      await generateBatchConstanciasPDF(fakeDocInfo, fakeEmployees, templateImage);
      addToHistory('Constancias (Lote)', generatePdfName('CONSTANCIAS', quickData.commercial_name, fakeDocInfo.date));
    }
  };

  const handlePreviewManualConstancia = async () => {
    const names = quickData.employeeNames.filter((n: string) => n.trim() !== '');
    if (names.length === 0 || !quickData.commercial_name.trim() || !quickData.address.trim() || !quickData.date.trim()) {
      Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Por favor llena todos los campos.', confirmButtonColor: '#722F37' });
      return;
    }
    const fakeDocInfo: DocumentInfo = {
      id: 0, commercial_name: quickData.commercial_name.toUpperCase(), company_name: '',
      date: quickData.date, time_start: '', time_end: '', address: quickData.address.toUpperCase(), is_active: 1
    };
    const selectedType = CONSTANCIA_TYPES.find(t => t.id === quickData.constanciaType);
    const templateImage = selectedType?.image || '/constancia_vacia.png';
    if (names.length === 1) {
      const fakeEmp: Employee = { id: 0, document_id: 0, name: names[0].toUpperCase(), role: '', brigade: '', signature: '' };
      await handlePreview(() => generateConstanciaPDF(fakeDocInfo, fakeEmp, templateImage, true), 'Constancia', generatePdfName('CONSTANCIA', quickData.commercial_name, fakeDocInfo.date));
    } else {
      const fakeEmps: Employee[] = names.map((name: string, i: number) => ({ id: i, document_id: 0, name: name.toUpperCase(), role: '', brigade: '', signature: '' }));
      await handlePreview(() => generateBatchConstanciasPDF(fakeDocInfo, fakeEmps, templateImage, true), 'Constancias (Lote)', generatePdfName('CONSTANCIAS', quickData.commercial_name, fakeDocInfo.date));
    }
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

  const handleOpenQuickModal = () => {
    setQuickData({
      employeeNames: [''],
      constanciaType: 'completa',
      commercial_name: '',
      address: '',
      date: ''
    });
    setShowQuickModal(true);
  };

  const handleCloseQuickModal = () => {
    setShowQuickModal(false);
    setQuickData({
      employeeNames: [''],
      constanciaType: 'completa',
      commercial_name: '',
      address: '',
      date: ''
    });
  };

  // Export backup
  const handleExportBackup = async () => {
    try {
      const [docsRes, quotesRes] = await Promise.all([
        fetch('/api/documents'),
        fetch('/api/quotes')
      ]);
      const allDocs = await docsRes.json();
      const allQuotes = await quotesRes.json();
      // Fetch employees for all docs
      const allEmployees: any[] = [];
      for (const doc of allDocs) {
        const empRes = await fetch(`/api/documents/${doc.id}/employees`);
        const emps = await empRes.json();
        allEmployees.push(...emps);
      }
      const backup = {
        exportDate: new Date().toISOString(),
        version: 'v1.15',
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

  // Dashboard stats
  const totalActive = documents.filter(d => d.is_active === 1).length;
  const totalInactive = documents.filter(d => d.is_active !== 1).length;
  const thisMonth = new Date().toLocaleString('es-MX', { month: 'long', year: 'numeric' });
  const pdfsThisMonth = pdfHistory.filter(h => {
    try { const d = new Date(h.date); return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear(); } catch { return false; }
  }).length;

  const handleLogin = (passwordInput: string) => {
    if (passwordInput === 'Becase26') {
      setIsAuthenticated(true);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Contraseña incorrecta',
        confirmButtonColor: '#722F37'
      });
    }
  };

  if (!isAuthenticated) {
    return <AdminLoginForm onLogin={handleLogin} />;
  }

  return (
    <div
      className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-8 px-4 sm:px-6 lg:px-8 font-sans transition-colors"
      style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}
    >
      {/* Side Menu Drawer - portal level to cover full viewport */}
      <AnimatePresence>
        {showSideMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }}
              className="bg-black"
              onClick={() => setShowSideMenu(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
              style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: '18rem', zIndex: 9999 }}
              className="bg-white dark:bg-gray-800 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-5 border-b border-gray-200 bg-blue-900" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
                <span className="text-lg font-bold text-white">Panel Admin</span>
                <button onClick={() => setShowSideMenu(false)} className="p-1 hover:bg-blue-800 rounded-full transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Menu Items */}
              <nav className="flex-1 py-4">
                <p className="px-5 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Navegación</p>
                <Link
                  to="/"
                  className="flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors font-medium"
                  onClick={() => setShowSideMenu(false)}
                >
                  <Home className="w-5 h-5" />
                  Inicio
                </Link>

                <button
                  onClick={() => { setShowSideMenu(false); setActiveTab(activeTab === 'dashboard' ? 'documents' : 'dashboard'); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  <BarChart3 className="w-5 h-5" />
                  {activeTab === 'dashboard' ? 'Ver Documentos' : 'Dashboard'}
                </button>

                <div className="my-3 border-t border-gray-100 dark:border-gray-700" />
                <p className="px-5 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</p>

                <button
                  onClick={() => { setShowSideMenu(false); setShowQuoteDrawer(true); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors font-medium"
                >
                  <ClipboardList className="w-5 h-5" />
                  Historial de Cotizaciones
                  {quotes.length > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{quotes.length}</span>
                  )}
                </button>

                <button
                  onClick={() => { setShowSideMenu(false); setShowQuoteModal(true); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors font-medium"
                >
                  <Calculator className="w-5 h-5" />
                  Nueva Cotización
                </button>

                <button
                  onClick={() => { setShowSideMenu(false); handleOpenQuickModal(); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors font-medium"
                >
                  <FileSignature className="w-5 h-5" />
                  Generar Constancia
                </button>

                <button
                  onClick={() => { setShowSideMenu(false); setShowCartaResponsiva(true); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors font-medium"
                >
                  <ShieldCheck className="w-5 h-5" />
                  Carta Responsiva
                </button>

                <button
                  onClick={() => { setShowSideMenu(false); setShowHistoryDrawer(true); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  <History className="w-5 h-5" />
                  Historial de PDFs
                  {pdfHistory.length > 0 && (
                    <span className="ml-auto bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pdfHistory.length}</span>
                  )}
                </button>

                <button
                  onClick={() => { setShowSideMenu(false); handleExportBackup(); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  <Database className="w-5 h-5" />
                  Exportar Backup
                </button>
              </nav>

              {/* Footer */}
              <div className="p-5 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 py-2.5 rounded-lg font-medium transition-colors"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
                </button>
                <button
                  onClick={() => { setShowSideMenu(false); setIsAuthenticated(false); }}
                  className="w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 py-2.5 rounded-lg font-medium transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Cerrar Sesión
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto space-y-8">

        {/* Compact top bar with hamburger menu */}
        <div className="flex justify-between items-center bg-white dark:bg-gray-800 px-4 py-3 rounded-lg shadow-sm transition-colors">
          <button
            onClick={() => setShowSideMenu(true)}
            className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white font-semibold transition-colors"
          >
            <Menu className="w-6 h-6" />
            <span className="text-lg font-bold text-blue-900 dark:text-blue-300">Panel Admin</span>
          </button>
          <span className="text-sm font-medium text-gray-400">v1.15</span>
        </div>

        {/* Quote History Drawer */}
        <AnimatePresence>
          {showQuoteDrawer && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="fixed inset-0 bg-black z-40"
                onClick={() => setShowQuoteDrawer(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="fixed inset-x-4 bottom-4 sm:inset-x-8 sm:bottom-8 md:inset-12 lg:inset-y-12 lg:inset-x-[15%] bg-white rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
                style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
              >
                <div className="px-5 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                    <Calculator className="w-5 h-5 text-blue-600" />
                    Historial de Cotizaciones
                  </h2>
                  <button
                    onClick={() => setShowQuoteDrawer(false)}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                <div className="p-4 border-b border-gray-100 shrink-0">
                  <input
                    type="text"
                    placeholder="Buscar por cliente..."
                    value={quoteSearchTerm}
                    onChange={(e) => setQuoteSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex-1 overflow-y-auto">
                  {quotes
                    .filter(q => q.client_name?.toLowerCase().includes(quoteSearchTerm.toLowerCase()))
                    .map((quote) => (
                      <div key={quote.id} className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-gray-900">{quote.client_name}</span>
                          <span className="text-lg font-bold text-gray-700">
                            ${Number(quote.total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">{quote.date}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setQuoteToEdit(quote);
                                setShowQuoteModal(true);
                                setShowQuoteDrawer(false);
                              }}
                              className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-200 transition-colors font-medium text-xs"
                            >
                              Editar / Imprimir
                            </button>
                            <button
                              onClick={() => handleDeleteQuote(quote.id)}
                              className="bg-red-100 text-red-700 px-3 py-1.5 rounded hover:bg-red-200 transition-colors font-medium text-xs"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  {quotes.length === 0 && (
                    <div className="p-8 text-center text-gray-500 italic">
                      No hay cotizaciones registradas en el historial.
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50 shrink-0">
                  <button
                    onClick={() => {
                      setPreviewUrl(null);
                      setPreviewType('');
                      setPreviewName('');
                      setShowQuoteDrawer(false);
                      setShowQuoteModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-red-900 text-white px-4 py-2.5 rounded-md hover:bg-red-950 transition-colors font-medium"
                  >
                    <Plus className="w-5 h-5" />
                    Nueva Cotización
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Carta Responsiva - Full Screen View */}
        {showCartaResponsiva && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-white" style={{ height: '100dvh' }}>
            <div className="w-full h-full overflow-hidden flex flex-col" style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}>
              <div className="bg-blue-900 p-5 text-white flex justify-between items-center shrink-0" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
                <h3 className="font-extrabold flex items-center gap-2 text-lg">
                  <ShieldCheck className="w-5 h-5" />
                  Carta Responsiva
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowCartaResponsiva(false);
                    setCartaDocId(null);
                    setCartaFvu('');
                    setCartaDictamenGas(true);
                    setCartaFecha('');
                    localStorage.removeItem('autosave_carta');
                  }}
                  className="flex items-center justify-center bg-blue-800/50 hover:bg-blue-800 transition-colors rounded-lg w-11 h-11 text-white/80 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="px-4 py-5 space-y-4 overflow-y-auto overflow-x-hidden flex-1" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
                <p className="text-sm text-gray-600">
                  Selecciona un acta constitutiva registrada para generar la carta responsiva con sus datos.
                </p>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Acta Constitutiva *</label>
                  <select
                    value={cartaDocId ?? ''}
                    onChange={(e) => setCartaDocId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600"
                  >
                    <option value="">— Seleccionar documento —</option>
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.commercial_name} — {doc.company_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="overflow-hidden">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Fecha de la Carta *</label>
                  <input
                    type="date"
                    value={cartaFecha}
                    onChange={(e) => setCartaFecha(e.target.value)}
                    className="border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600"
                    style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', WebkitAppearance: 'none', appearance: 'none' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">FVU-2026-</label>
                  <input
                    type="text"
                    value={cartaFvu}
                    onChange={(e) => setCartaFvu(e.target.value)}
                    placeholder="Ej: 00123"
                    className="w-full border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>

                <label className="flex items-center gap-3 text-base text-gray-700 cursor-pointer select-none py-1">
                  <input
                    type="checkbox"
                    checked={cartaDictamenGas}
                    onChange={(e) => setCartaDictamenGas(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold">Incluir Dictamen de Gas</span>
                </label>

                {cartaDocId && (() => {
                  const doc = documents.find(d => d.id === cartaDocId);
                  if (!doc) return null;
                  return (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                      <h3 className="text-sm font-bold text-blue-900">Datos que se usarán:</h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-semibold text-gray-600">Nombre Comercial:</span>
                          <p className="text-gray-900">{doc.commercial_name || '—'}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">Razón Social:</span>
                          <p className="text-gray-900">{doc.company_name || '—'}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">Dirección:</span>
                          <p className="text-gray-900">{doc.address || '—'}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">Giro Comercial:</span>
                          <p className="text-gray-900">{doc.activity || '—'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50 shrink-0 flex gap-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                <button
                  disabled={!cartaDocId}
                  onClick={async () => {
                    const doc = documents.find(d => d.id === cartaDocId);
                    if (!doc) return;
                    const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
                    let fechaFormateada = doc.date || '';
                    if (cartaFecha) {
                      const [yr, mo, dy] = cartaFecha.split('-').map(Number);
                      fechaFormateada = `${dy} DE ${meses[mo - 1]} DE ${yr}`;
                    }
                    await generateCartaResponsivaPDF({
                      nombreComercial: doc.commercial_name || '',
                      razonSocial: doc.company_name || '',
                      direccion: doc.address || '',
                      giroComercial: doc.activity || '',
                      fecha: fechaFormateada,
                      fvu: cartaFvu,
                      dictamenGas: cartaDictamenGas,
                    });
                    addToHistory('Carta Responsiva', generatePdfName('CARTA RESPONSIVA', doc.commercial_name || '', fechaFormateada));
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-900 text-white px-4 py-3 rounded-l-md hover:bg-red-950 transition-colors font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  Generar PDF
                </button>
                <button
                  disabled={!cartaDocId}
                  onClick={async () => {
                    const doc = documents.find(d => d.id === cartaDocId);
                    if (!doc) return;
                    const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
                    let fechaFormateada = doc.date || '';
                    if (cartaFecha) {
                      const [yr, mo, dy] = cartaFecha.split('-').map(Number);
                      fechaFormateada = `${dy} DE ${meses[mo - 1]} DE ${yr}`;
                    }
                    await handlePreview(() => generateCartaResponsivaPDF({
                      nombreComercial: doc.commercial_name || '',
                      razonSocial: doc.company_name || '',
                      direccion: doc.address || '',
                      giroComercial: doc.activity || '',
                      fecha: fechaFormateada,
                      fvu: cartaFvu,
                      dictamenGas: cartaDictamenGas,
                    }, true), 'Carta Responsiva', `CARTA RESPONSIVA - ${(doc.commercial_name || '').toUpperCase()} - ${fechaFormateada}`.replace(/[\/\\?%*:|"<>]/g, '-'));
                  }}
                  className="flex items-center justify-center bg-red-800 text-white px-3 py-3 rounded-r-md hover:bg-red-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                  title="Vista Previa"
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-extrabold text-blue-900 dark:text-blue-300 flex items-center gap-2">
              <BarChart3 className="w-7 h-7" />
              Dashboard
            </h2>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Documentos Activos</p>
                <p className="text-3xl font-extrabold text-green-600 mt-1">{totalActive}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Inactivos</p>
                <p className="text-3xl font-extrabold text-gray-400 mt-1">{totalInactive}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Cotizaciones</p>
                <p className="text-3xl font-extrabold text-blue-600 mt-1">{quotes.length}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">PDFs ({thisMonth})</p>
                <p className="text-3xl font-extrabold text-purple-600 mt-1">{pdfsThisMonth}</p>
              </div>
            </div>

            {/* Recent PDFs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
              <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Ultimos PDFs Generados
                </h3>
              </div>
              {pdfHistory.length === 0 ? (
                <p className="p-5 text-gray-400 text-sm italic">No se han generado PDFs aun.</p>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                  {pdfHistory.slice(0, 10).map((entry, i) => (
                    <div key={i} className="px-5 py-3 flex items-center gap-3">
                      <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${
                        entry.type === 'Acta Constitutiva' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        entry.type === 'Carta Responsiva' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                        entry.type.includes('Constancia') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        entry.type.includes('Simulacro') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {entry.type}
                      </span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate flex-1">{entry.name}</span>
                      <span className="text-xs text-gray-400 shrink-0">{entry.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Document Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
              <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Resumen de Documentos
                </h3>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {documents.slice(0, 10).map(doc => (
                  <div key={doc.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{doc.commercial_name}</p>
                      <p className="text-xs text-gray-400">{doc.company_name}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${doc.is_active === 1 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500'}`}>
                      {doc.is_active === 1 ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Documents View */}
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

          <div className="p-0 bg-gray-50 dark:bg-gray-900" style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <div className="flex flex-col gap-2 p-2 sm:p-4">
              <AnimatePresence>
                {documents.map(doc => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <SwipeableRow
                      onDelete={() => handleDeleteDocument(doc.id)}
                      onClick={() => {
                        setSelectedDocId(doc.id);
                        setTimeout(() => {
                          editSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                      }}
                    >
                      <div
                        className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all shadow-sm ${selectedDocId === doc.id ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 ring-1 ring-blue-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:shadow-md'}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className="font-extrabold text-blue-900 dark:text-blue-300 text-lg leading-tight pr-4">{doc.commercial_name}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id); }}
                            className="hidden sm:flex text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                            title="Eliminar Acta"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-600 self-start sm:self-auto">
                            <span className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold tracking-wider">Acceso:</span>
                            <span className="font-mono text-blue-700 dark:text-blue-400 font-bold tracking-widest text-sm">{doc.access_code || 'N/A'}</span>
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
              {documents.length === 0 && (
                <div className="px-6 py-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mt-2">
                  <FileText className="w-12 h-12 text-blue-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No hay actas constitutivas creadas.</p>
                  <p className="text-sm text-gray-400 mt-1">Crea una nueva acta para comenzar.</p>
                </div>
              )}
            </div>
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
                  onClick={handleSaveDocInfo}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 bg-blue-900 text-white px-6 py-2 rounded-md font-bold hover:bg-blue-800 transition-colors shadow-md disabled:opacity-50 min-h-[44px]"
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
                    onChange={(e) => updateSelectedDoc('commercial_name', e.target.value.toUpperCase())}
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
                      onClick={() => {
                        if (docInfo.access_code) {
                          navigator.clipboard.writeText(docInfo.access_code);
                          alert('Código copiado al portapapeles');
                        }
                      }}
                      className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md transition-colors text-sm font-bold whitespace-nowrap min-h-[44px] flex items-center"
                      title="Copiar código"
                    >
                      Copiar
                    </button>
                    <button
                      onClick={handleRegenerateCode}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2 rounded-md transition-colors text-sm font-bold whitespace-nowrap min-h-[44px] flex items-center"
                      title="Generar nuevo código"
                    >
                      Regenerar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
                  <input
                    type="text"
                    value={docInfo.company_name}
                    onChange={(e) => updateSelectedDoc('company_name', e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección del Inmueble</label>
                  <textarea
                    rows={2}
                    value={docInfo.address}
                    onChange={(e) => updateSelectedDoc('address', e.target.value.toUpperCase())}
                    className="w-full border border-gray-300 rounded-t-md p-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej. Calle 6 bis entre 25 y 30, Col. Centro"
                  />
                  <div className="w-full bg-gray-100 border border-t-0 border-gray-300 rounded-b-md px-3 py-2 text-sm font-semibold text-gray-700 select-none">
                    PLAYA DEL CARMEN, QUINTANA ROO, MÉXICO.
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giro o actividad productiva principal</label>
                  <input
                    type="text"
                    value={docInfo.activity || ''}
                    onChange={(e) => updateSelectedDoc('activity', e.target.value.toUpperCase())}
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
                      onChange={(e) => updateSelectedDoc('usuarios', parseInt(e.target.value.replace(/\D/g, '')) || 0)}
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
                      onChange={(e) => updateSelectedDoc('visitantes', parseInt(e.target.value.replace(/\D/g, '')) || 0)}
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
                      onChange={(e) => updateSelectedDoc('sotanos', parseInt(e.target.value.replace(/\D/g, '')) || 0)}
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
                      onChange={(e) => updateSelectedDoc('superiores', parseInt(e.target.value.replace(/\D/g, '')) || 0)}
                      className="w-12 border-none bg-transparent p-0 text-center focus:ring-0 text-gray-900 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <div className="flex-1 sm:flex-none flex items-center gap-1">
                    <button
                      onClick={async () => { if (docInfo) { await generateBatchConstanciasPDF(docInfo, employees); addToHistory('Constancias (Lote)', generatePdfName('CONSTANCIAS', docInfo.commercial_name, docInfo.date)); } }}
                      disabled={employees.length === 0}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-l-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm font-bold min-h-[44px]"
                      title="Descargar Todas las Constancias"
                    >
                      <Award className="w-5 h-5" />
                      <span className="whitespace-nowrap">Constancias (Lote)</span>
                    </button>
                    <button
                      onClick={() => { if (docInfo) handlePreview(() => generateBatchConstanciasPDF(docInfo, employees, undefined, true), 'Constancias (Lote)', generatePdfName('CONSTANCIAS', docInfo.commercial_name, docInfo.date)); }}
                      disabled={employees.length === 0}
                      className="flex items-center justify-center bg-blue-500 text-white px-2.5 py-2 rounded-r-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
                      title="Vista Previa"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 sm:flex-none flex items-center gap-1">
                    <button
                      onClick={async () => { if (docInfo) { await generateSimulacroPDF(docInfo, employees); addToHistory('Cédula Simulacro', generatePdfName('CÉDULA SIMULACRO', docInfo.commercial_name, docInfo.date)); } }}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-l-md hover:bg-blue-700 transition-colors shadow-sm font-bold min-h-[44px]"
                      title="Descargar Cédula de Evaluación de Simulacro"
                    >
                      <Download className="w-5 h-5" />
                      <span className="whitespace-nowrap">Cédula Simulacro</span>
                    </button>
                    <button
                      onClick={() => { if (docInfo) handlePreview(() => generateSimulacroPDF(docInfo, employees, true), 'Cédula Simulacro', generatePdfName('CÉDULA SIMULACRO', docInfo.commercial_name, docInfo.date)); }}
                      className="flex items-center justify-center bg-blue-500 text-white px-2.5 py-2 rounded-r-md hover:bg-blue-600 transition-colors min-h-[44px]"
                      title="Vista Previa"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
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
                        <td className="p-3 font-medium uppercase dark:text-gray-200">{emp.name}</td>
                        <td className="p-3 uppercase dark:text-gray-300">{emp.role}</td>
                        <td className="p-3 uppercase dark:text-gray-300">{emp.brigade}</td>
                        <td className="p-3 text-center h-16">
                          <img src={emp.signature} alt="Firma" className="h-10 mx-auto object-contain mix-blend-multiply" />
                        </td>
                        <td className="p-3 text-center flex justify-center gap-2">
                          <button
                            onClick={async (e) => { e.stopPropagation(); if (docInfo) { await generateConstanciaPDF(docInfo, emp); addToHistory('Constancia', generatePdfName('CONSTANCIA', docInfo.commercial_name, docInfo.date)); } }}
                            className="text-indigo-500 hover:text-indigo-700 p-2 rounded-full hover:bg-indigo-50 transition-colors"
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

      {/* Quote History section moved to the top */}

      {showQuickModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center md:p-4 z-50">
          <div className="bg-white dark:bg-gray-800 shadow-xl w-full h-full md:h-auto md:max-h-[90vh] md:max-w-lg md:rounded-xl overflow-hidden flex flex-col min-w-0 break-words" style={{ overscrollBehavior: 'contain' }}>
            <div className="bg-blue-900 shrink-0 md:hidden" style={{ height: 'env(safe-area-inset-top)' }} />
            <div className="bg-blue-900 px-5 py-5 text-white flex justify-between items-center shrink-0">
              <h3 className="font-extrabold flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" />
                Nueva Constancia
              </h3>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); handleCloseQuickModal(); }}
                className="flex items-center justify-center bg-blue-800/50 hover:bg-blue-800 transition-colors rounded-lg w-11 h-11 text-white/80 hover:text-white"
                title="Cerrar modal"
                aria-label="Cerrar modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form id="constancia-form" onSubmit={handleGenerateManualConstancia} className="p-6 space-y-4 overflow-y-auto overflow-x-hidden flex-1 w-full max-w-full" style={{ overscrollBehavior: 'contain' }}>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Genera una constancia en PDF al instante para cualquier persona. Puedes escribir los datos de la empresa manualmente o autocompletarlos seleccionando un acta existente.
              </p>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Nombre(s) de la(s) Persona(s) *
                </label>
                <div className="space-y-2">
                  {quickData.employeeNames.map((name, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        required
                        placeholder={`Ej. Juan Pérez López`}
                        value={name}
                        onChange={(e) => {
                          const updated = [...quickData.employeeNames];
                          updated[idx] = e.target.value.toUpperCase();
                          setQuickData({ ...quickData, employeeNames: updated });
                        }}
                        className="w-full border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600"
                      />
                      {quickData.employeeNames.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = quickData.employeeNames.filter((_, i) => i !== idx);
                            setQuickData({ ...quickData, employeeNames: updated });
                          }}
                          className="shrink-0 w-10 h-10 flex items-center justify-center bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                          title="Quitar persona"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setQuickData({ ...quickData, employeeNames: [...quickData.employeeNames, ''] })}
                  className="mt-2 flex items-center gap-1.5 text-sm text-blue-700 font-semibold hover:text-blue-900 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Agregar otra persona
                </button>
                {quickData.employeeNames.filter(n => n.trim()).length > 1 && (
                  <p className="mt-1 text-xs text-blue-600 font-medium">
                    Se generarán {quickData.employeeNames.filter(n => n.trim()).length} constancias en un solo PDF.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Constancia *</label>

                {/* Playa del Carmen section */}
                <div className="border border-gray-200 rounded-lg overflow-hidden mb-2">
                  <button
                    type="button"
                    onClick={() => setLocationSection(locationSection === 'pdc' ? null : 'pdc')}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <span className="text-sm font-semibold text-gray-700">📍 Playa del Carmen</span>
                    <span className="text-gray-400 text-xs">{locationSection === 'pdc' ? '▲' : '▼'}</span>
                  </button>
                  {locationSection === 'pdc' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
                      {CONSTANCIA_TYPES.filter(t => t.location === 'pdc').map((type) => (
                        <label
                          key={type.id}
                          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md border cursor-pointer transition-all ${
                            quickData.constanciaType === type.id
                              ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="constanciaType"
                            value={type.id}
                            checked={quickData.constanciaType === type.id}
                            onChange={(e) => setQuickData({ ...quickData, constanciaType: e.target.value })}
                            className="w-3 h-3 text-blue-600 accent-blue-600 shrink-0"
                          />
                          <span className={`text-xs font-medium leading-tight ${quickData.constanciaType === type.id ? 'text-blue-800' : 'text-gray-600'}`}>
                            {type.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tulum section */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setLocationSection(locationSection === 'tulum' ? null : 'tulum')}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <span className="text-sm font-semibold text-gray-700">📍 Tulum</span>
                    <span className="text-gray-400 text-xs">{locationSection === 'tulum' ? '▲' : '▼'}</span>
                  </button>
                  {locationSection === 'tulum' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2">
                      {CONSTANCIA_TYPES.filter(t => t.location === 'tulum').map((type) => (
                        <label
                          key={type.id}
                          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md border cursor-pointer transition-all ${
                            quickData.constanciaType === type.id
                              ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="constanciaType"
                            value={type.id}
                            checked={quickData.constanciaType === type.id}
                            onChange={(e) => setQuickData({ ...quickData, constanciaType: e.target.value })}
                            className="w-3 h-3 text-blue-600 accent-blue-600 shrink-0"
                          />
                          <span className={`text-xs font-medium leading-tight ${quickData.constanciaType === type.id ? 'text-blue-800' : 'text-gray-600'}`}>
                            {type.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Autocompletar datos desde acta existente (Opcional):</label>
                <select
                  className="w-full border border-gray-300 rounded-md p-3 text-base bg-gray-50 focus:ring-blue-600"
                  onChange={(e) => handleQuickAutocomplete(e.target.value)}
                  defaultValue=""
                >
                  <option value="">-- Escribir datos manualmente --</option>
                  {documents.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.commercial_name} ({doc.date})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial de la Empresa *</label>
                  <input
                    type="text"
                    required
                    value={quickData.commercial_name}
                    onChange={(e) => setQuickData({ ...quickData, commercial_name: e.target.value.toUpperCase() })}
                    className="w-full border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de la Empresa *</label>
                  <input
                    type="text"
                    required
                    value={quickData.address}
                    onChange={(e) => setQuickData({ ...quickData, address: e.target.value.toUpperCase() })}
                    className="w-full border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Expedición *</label>
                  <input
                    type="date"
                    required
                    onChange={(e) => {
                      const dateObj = new Date(e.target.value + 'T00:00:00');
                      if (!isNaN(dateObj.getTime())) {
                        const formattedDate = dateObj.toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        });
                        setQuickData({ ...quickData, date: formattedDate });
                      } else {
                        setQuickData({ ...quickData, date: '' });
                      }
                    }}
                    className="w-full border border-gray-300 rounded-md p-3 text-base focus:ring-blue-600 focus:border-blue-600"
                  />
                  {quickData.date && (
                    <p className="text-xs text-blue-600 mt-2 font-medium">
                      Formato final: {quickData.date}
                    </p>
                  )}
                </div>
              </div>

            </form>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 shrink-0 bg-white dark:bg-gray-800 flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseQuickModal}
                className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-bold min-h-[44px] text-base"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePreviewManualConstancia}
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-bold flex items-center justify-center gap-2 min-h-[44px] text-base"
              >
                <Eye className="w-5 h-5 shrink-0" />
                Vista Previa
              </button>
              <button
                type="button"
                onClick={() => { const form = document.getElementById('constancia-form') as HTMLFormElement; if (form) form.requestSubmit(); }}
                className="w-full sm:w-auto px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-bold flex items-center justify-center gap-2 min-h-[44px] text-base"
              >
                <Award className="w-5 h-5 shrink-0" />
                {quickData.employeeNames.filter(n => n.trim()).length > 1
                  ? `Descargar ${quickData.employeeNames.filter(n => n.trim()).length} Constancias`
                  : 'Descargar Constancia'}
              </button>
            </div>
          </div>
        </div>
      )}

      <QuoteModal
        isOpen={showQuoteModal}
        onClose={() => {
          setShowQuoteModal(false);
          setQuoteToEdit(null);
        }}
        quoteToEdit={quoteToEdit}
        onQuoteSaved={fetchQuotes}
      />

      {/* PDF History Drawer */}
      {showHistoryDrawer && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowHistoryDrawer(false)} />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col"
          >
            <div className="bg-blue-900 p-5 text-white flex justify-between items-center shrink-0" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
              <h3 className="text-lg font-bold">Historial de PDFs Generados</h3>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="flex items-center justify-center bg-blue-800/50 hover:bg-blue-800 transition-colors rounded-lg w-11 h-11 text-white/80 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {pdfHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                  <History className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium">Sin historial</p>
                  <p className="text-sm text-center mt-1">Los PDFs que generes apareceran aqui.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {pdfHistory.filter(entry => entry.type.includes('Constancia')).map((entry, i) => (
                    <div key={i} className="px-5 py-3.5 hover:bg-gray-50 transition-colors flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${
                          entry.type === 'Acta Constitutiva' ? 'bg-red-100 text-red-700' :
                          entry.type === 'Carta Responsiva' ? 'bg-purple-100 text-purple-700' :
                          entry.type.includes('Constancia') ? 'bg-blue-100 text-blue-700' :
                          entry.type.includes('Simulacro') ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {entry.type}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-800 truncate">{entry.name}</p>
                          <p className="text-xs text-gray-400">{entry.date}</p>
                        </div>
                      </div>
                      
                      {entry.publicUrl && (
                        <div className="flex justify-end mt-1">
                          <a 
                            href={entry.publicUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 text-xs font-bold rounded-md transition-colors border border-blue-200"
                            title="Descargar desde la nube"
                          >
                            <CloudUpload className="w-3.5 h-3.5" />
                            Descargar (Nube)
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {pdfHistory.length > 0 && (
              <div className="p-4 border-t border-gray-200 shrink-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                <button
                  onClick={() => {
                    Swal.fire({
                      title: '¿Limpiar historial?',
                      text: 'Se eliminara todo el historial de PDFs generados.',
                      icon: 'warning',
                      showCancelButton: true,
                      confirmButtonColor: '#d33',
                      cancelButtonColor: '#3085d6',
                      confirmButtonText: 'Sí, limpiar',
                      cancelButtonText: 'Cancelar'
                    }).then(result => {
                      if (result.isConfirmed) {
                        setPdfHistory([]);
                        localStorage.removeItem('pdfHistory');
                        fetch('/api/pdf-history-clear', { method: 'DELETE' }).catch(() => {});
                      }
                    });
                  }}
                  className="w-full py-2.5 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors text-sm"
                >
                  Limpiar Historial
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* PDF Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/70 flex flex-col z-50">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white shrink-0" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
            <h3 className="font-bold text-lg truncate">{previewName}</h3>
            <div className="flex items-center gap-2">
              <button
                disabled={savingVersion}
                onClick={async () => {
                  setSavingVersion(true);
                  const fileName = `${previewName}.pdf`;
                  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                  
                  try {
                    const res = await fetch(previewUrl);
                    const blob = await res.blob();
                    
                    // Auto-upload in background and add to history (silently!)
                    savePdfVersion(blob, fileName, previewType, selectedDocId || undefined)
                      .then(result => {
                         if (result && !result._error) {
                           addToHistory(previewType, previewName, result.publicUrl);
                         }
                      }).catch(err => console.error('Auto-save failed:', err));
                    
                    // Prompt local download right away
                    if (isMobile && navigator.share) {
                      try {
                        const file = new File([blob], fileName, { type: 'application/pdf' });
                        await navigator.share({ files: [file] });
                      } catch (err: any) {
                        if (err.name !== 'AbortError') console.error('Share error:', err);
                      }
                    } else {
                      const a = document.createElement('a');
                      a.href = previewUrl;
                      a.download = fileName;
                      a.click();
                    }
                  } catch (e: any) {
                     Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo procesar la descarga.', confirmButtonColor: '#722F37' });
                  } finally {
                    setSavingVersion(false);
                  }
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-bold transition-colors min-h-[44px] disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
                {savingVersion ? 'Procesando...' : 'Descargar'}
              </button>
              <button
                onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setPreviewType(''); setPreviewName(''); }}
                className="flex items-center justify-center bg-gray-700 hover:bg-gray-600 transition-colors rounded-lg w-11 h-11 text-white/80 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          <div ref={pdfContainerRef} className="flex-1 w-full bg-gray-200 overflow-y-auto p-4 flex flex-col items-center">
            <Document
              file={previewUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={<div className="text-gray-500 py-10 font-bold">Cargando documento...</div>}
              className="flex flex-col items-center"
            >
              {Array.from(new Array(numPages || 0), (_, index) => (
                <LazyPage key={`page_${index + 1}`} pageNumber={index + 1} containerWidth={pdfWidth} />
              ))}
            </Document>
          </div>
        </div>
      )}
    </div>
  );
}
