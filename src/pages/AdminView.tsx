import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { DocumentInfo, Employee } from '../types';
import { Trash2, Save, FileText, Users, Plus, LogOut, Download, Award, Zap, X, Calculator, Menu, Home, ClipboardList, FileSignature } from 'lucide-react';
import { generateSimulacroPDF } from '../utils/generateSimulacroPDF';
import { generateBatchConstanciasPDF } from '../utils/generateBatchConstanciasPDF';
import { generateConstanciaPDF } from '../utils/generateConstanciaPDF';
import { generateConstitutivaPDF } from '../utils/generateConstitutivaPDF';
import { sortEmployees } from '../utils/employees';
import SwipeableRow from '../components/SwipeableRow';
import AdminLoginForm from '../components/AdminLoginForm';
import QuoteModal from '../components/QuoteModal';
import { motion, AnimatePresence } from 'motion/react';
export default function AdminView() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const editSectionRef = useRef<HTMLDivElement>(null);

  // Manual Constancia Generator State
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const CONSTANCIA_TYPES = [
    { id: 'completa', label: 'Completa (todos los rubros)', image: '/constancia_vacia.png' },
    { id: 'evacuacion', label: 'Evacuación', image: '/constancia_evacuacion.png' },
    { id: 'extintores', label: 'Uso y Manejo de Extintores', image: '/constancia_extintores.png' },
    { id: 'primeros_auxilios', label: 'Primeros Auxilios', image: '/constancia_primeros_auxilios.png' },
    { id: 'pa_extintores', label: 'Primeros Auxilios + Extintores', image: '/constancia_pa_extintores.png' },
  ];
  const [quickData, setQuickData] = useState({
    employeeNames: [''] as string[],
    commercial_name: '',
    address: '',
    date: '',
    constanciaType: 'completa'
  });

  // Quote History State
  const [quotes, setQuotes] = useState<any[]>([]);
  const [quoteSearchTerm, setQuoteSearchTerm] = useState('');
  const [quoteToEdit, setQuoteToEdit] = useState<any | null>(null);
  const [showQuoteDrawer, setShowQuoteDrawer] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);

  useEffect(() => {
    if (showQuickModal || showQuoteDrawer || showSideMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showQuickModal, showQuoteDrawer, showSideMenu]);

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

  const fetchDocuments = async () => {
    const res = await fetch('/api/documents');
    const data = await res.json();
    setDocuments(data);
    if (data.length > 0 && !selectedDocId) {
      setSelectedDocId(data[0].id);
    }
  };

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
  }; const handleDeleteEmployee = async (id: number) => {
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

  const handleGenerateManualConstancia = (e: React.FormEvent) => {
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
      generateConstanciaPDF(fakeDocInfo, fakeEmployee, templateImage);
    } else {
      const fakeEmployees: Employee[] = names.map((name, i) => ({
        id: i, document_id: 0,
        name: name.toUpperCase(),
        role: '', brigade: '', signature: ''
      }));
      generateBatchConstanciasPDF(fakeDocInfo, fakeEmployees, templateImage);
    }

    setShowQuickModal(false);
    setQuickData({ employeeNames: [''], commercial_name: '', address: '', date: '', constanciaType: 'completa' });
  };

  const docInfo = documents.find(d => d.id === selectedDocId);

  const handleDownloadPDF = async () => {
    if (!docInfo) return;
    await generateConstitutivaPDF(docInfo, employees);
  };

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
      className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8 font-sans"
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
              className="bg-white shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-blue-900">
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

                <div className="my-3 border-t border-gray-100" />
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
                  onClick={() => { setShowSideMenu(false); setShowQuickModal(true); }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors font-medium"
                >
                  <FileSignature className="w-5 h-5" />
                  Generar Constancia
                </button>
              </nav>

              {/* Footer */}
              <div className="p-5 border-t border-gray-200">
                <button
                  onClick={() => { setShowSideMenu(false); setIsAuthenticated(false); }}
                  className="w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 py-2.5 rounded-lg font-medium transition-colors"
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
        <div className="flex justify-between items-center bg-white px-4 py-3 rounded-lg shadow-sm">
          <button
            onClick={() => setShowSideMenu(true)}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-semibold transition-colors"
          >
            <Menu className="w-6 h-6" />
            <span className="text-lg font-bold text-blue-900">Panel Admin</span>
          </button>
          <span className="text-sm font-medium text-gray-400">v1.14</span>
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
                className="fixed inset-4 sm:inset-8 md:inset-12 lg:inset-y-12 lg:inset-x-[15%] bg-white rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
              >
                <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
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

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h2 className="text-xl font-extrabold flex items-center gap-2 text-blue-900 tracking-tight">
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

          <div className="p-0 bg-gray-50" style={{ maxHeight: '500px', overflowY: 'auto' }}>
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
                        className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all shadow-sm ${selectedDocId === doc.id ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className="font-extrabold text-blue-900 text-lg leading-tight pr-4">{doc.commercial_name}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id); }}
                            className="hidden sm:flex text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                            title="Eliminar Acta"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 self-start sm:self-auto">
                            <span className="text-gray-500 text-xs uppercase font-bold tracking-wider">Acceso:</span>
                            <span className="font-mono text-blue-700 font-bold tracking-widest text-sm">{doc.access_code || 'N/A'}</span>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400 font-medium">Fecha:</span>
                            <span className="font-medium text-gray-700">{doc.date}</span>
                          </div>
                        </div>

                        <span className="block sm:hidden text-xs text-red-500 mt-3 font-medium opacity-70">← Desliza para eliminar</span>
                      </div>
                    </SwipeableRow>
                  </motion.div>
                ))}
              </AnimatePresence>
              {documents.length === 0 && (
                <div className="px-6 py-12 text-center bg-white rounded-xl border border-gray-200 shadow-sm mt-2">
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
            <div ref={editSectionRef} className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-blue-50">
                <h2 className="text-xl font-bold flex items-center gap-2 text-blue-900">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial</label>
                  <input
                    type="text"
                    value={docInfo.commercial_name}
                    onChange={(e) => updateSelectedDoc('commercial_name', e.target.value.toUpperCase())}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código de Acceso (Solo Lectura)</label>
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

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gray-50 space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
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
                  <button
                    onClick={() => docInfo && generateBatchConstanciasPDF(docInfo, employees)}
                    disabled={employees.length === 0}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm font-bold min-h-[44px]"
                    title="Descargar Todas las Constancias"
                  >
                    <Award className="w-5 h-5" />
                    <span className="whitespace-nowrap">Constancias (Lote)</span>
                  </button>
                  <button
                    onClick={() => docInfo && generateSimulacroPDF(docInfo, employees)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-sm font-bold min-h-[44px]"
                    title="Descargar Cédula de Evaluación de Simulacro"
                  >
                    <Download className="w-5 h-5" />
                    <span className="whitespace-nowrap">Cédula Simulacro</span>
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-600 text-white px-5 py-2 rounded-md hover:bg-red-700 transition-colors shadow-md font-bold min-h-[44px]"
                    title="Descargar Acta Constitutiva"
                  >
                    <Download className="w-5 h-5" />
                    <span className="whitespace-nowrap">Acta Constitutiva</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700">
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
                      <tr key={emp.id} className="hover:bg-gray-50 border-b border-gray-100">
                        <td className="p-3 text-gray-500">#{index + 1}</td>
                        <td className="p-3 font-medium uppercase">{emp.name}</td>
                        <td className="p-3 uppercase">{emp.role}</td>
                        <td className="p-3 uppercase">{emp.brigade}</td>
                        <td className="p-3 text-center h-16">
                          <img src={emp.signature} alt="Firma" className="h-10 mx-auto object-contain mix-blend-multiply" />
                        </td>
                        <td className="p-3 text-center flex justify-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); docInfo && generateConstanciaPDF(docInfo, emp); }}
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

      </div>

      {/* Quote History section moved to the top */}

      {showQuickModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center md:p-4 z-50">
          <div className="bg-white shadow-xl w-full h-full md:h-auto md:max-h-[90vh] md:max-w-lg md:rounded-xl overflow-hidden flex flex-col min-w-0 break-words" style={{ overscrollBehavior: 'contain' }}>
            <div className="bg-blue-900 p-5 text-white flex justify-between items-center shrink-0">
              <h3 className="font-extrabold flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" />
                Nueva Constancia
              </h3>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setShowQuickModal(false); }}
                className="flex items-center justify-center bg-blue-800/50 hover:bg-blue-800 transition-colors rounded-lg w-11 h-11 text-white/80 hover:text-white"
                title="Cerrar modal"
                aria-label="Cerrar modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form id="constancia-form" onSubmit={handleGenerateManualConstancia} className="p-6 space-y-4 overflow-y-auto overflow-x-hidden flex-1 w-full max-w-full" style={{ overscrollBehavior: 'contain' }}>
              <p className="text-sm text-gray-600 mb-4">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CONSTANCIA_TYPES.map((type) => (
                    <label
                      key={type.id}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md border cursor-pointer transition-all text-center ${
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

            <div className="p-4 border-t border-gray-200 shrink-0 bg-white flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowQuickModal(false)}
                className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-bold min-h-[44px] text-base"
              >
                Cancelar
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
    </div>
  );
}
