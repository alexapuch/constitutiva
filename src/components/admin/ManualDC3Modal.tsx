import React, { useState, useEffect, useRef } from 'react';
import { X, Eye, Award, FileText, Sparkles, RefreshCw, Bookmark, CheckSquare, Square, Trash2, Plus, FileSpreadsheet, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DocumentInfo } from '../../types';
import Swal from 'sweetalert2';

interface ManualDC3ModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentInfo[];
  onGenerate: (data: any) => Promise<void>;
  onPreview: (data: any) => Promise<void>;
}

const LOCAL_STORAGE_KEY = 'dc3_persistent_data';

interface EmployeeRow {
  id: string;
  nombreCompleto: string;
  curp: string;
}

interface CourseConfig {
  id: string;
  selected: boolean;
  nombreCurso: string;
  duracionHoras: string;
}

export default function ManualDC3Modal({
  isOpen,
  onClose,
  documents,
  onGenerate,
  onPreview
}: ManualDC3ModalProps) {
  // Datos del agente, empresa y firmas
  const [formData, setFormData] = useState({
    razonSocial: '',
    actividadGiro: '',
    agenteCapacitador: 'SEPRISA S.A. DE C.V.',
    registroSTPS: 'SEP120304AA1-0013',
    instructor: 'JORGE H. MEZA',
    representanteEmpresa: '',
    representanteTrabajadores: ''
  });

  // Lista dinámica de trabajadores de la sucursal (simplificada sin Puesto)
  const [employees, setEmployees] = useState<EmployeeRow[]>([
    { id: '1', nombreCompleto: '', curp: '' }
  ]);

  // Nombre de archivo personalizado
  const [customFileName, setCustomFileName] = useState('');

  // Fechas globales para todos los cursos seleccionados
  const [globalDates, setGlobalDates] = useState({
    fechaInicio: '',
    fechaFin: ''
  });

  // Control para usar la misma fecha en inicio y fin
  const [sameDate, setSameDate] = useState(false);

  // Efecto para sincronizar fechaInicio con fechaFin si sameDate está activo
  useEffect(() => {
    if (sameDate && globalDates.fechaInicio) {
      setGlobalDates(prev => ({
        ...prev,
        fechaFin: globalDates.fechaInicio
      }));
    }
  }, [sameDate, globalDates.fechaInicio]);

  // Lista de cursos disponibles con las 4 brigadas estándar de Protección Civil
  const [courses, setCourses] = useState<CourseConfig[]>([
    {
      id: 'incendios',
      selected: true,
      nombreCurso: 'PREVENCIÓN Y COMBATE CONTRA INCENDIOS',
      duracionHoras: '3'
    },
    {
      id: 'evacuacion',
      selected: true,
      nombreCurso: 'EVACUACIÓN DE INMUEBLES',
      duracionHoras: '1'
    },
    {
      id: 'primeros_auxilios',
      selected: true,
      nombreCurso: 'PRIMEROS AUXILIOS',
      duracionHoras: '3'
    },
    {
      id: 'busqueda_rescate',
      selected: true,
      nombreCurso: 'BÚSQUEDA Y RESCATE',
      duracionHoras: '1'
    }
  ]);

  // Auxiliares para pegado múltiple de nombres y carga de archivos
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar datos persistentes de localStorage
  useEffect(() => {
    if (isOpen) {
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setFormData(prev => ({
            ...prev,
            actividadGiro: prev.actividadGiro || parsed.actividadGiro || '',
            agenteCapacitador: parsed.agenteCapacitador || prev.agenteCapacitador,
            registroSTPS: parsed.registroSTPS || prev.registroSTPS,
            instructor: parsed.instructor || prev.instructor,
            representanteEmpresa: parsed.representanteEmpresa || prev.representanteEmpresa,
            representanteTrabajadores: parsed.representanteTrabajadores || prev.representanteTrabajadores
          }));
        } catch (e) {
          console.error('Error cargando persistencia DC-3:', e);
        }
      }
    }
  }, [isOpen]);

  // Guardar datos persistentes
  const savePersistentFields = () => {
    const dataToSave = {
      actividadGiro: formData.actividadGiro,
      agenteCapacitador: formData.agenteCapacitador,
      registroSTPS: formData.registroSTPS,
      instructor: formData.instructor,
      representanteEmpresa: formData.representanteEmpresa,
      representanteTrabajadores: formData.representanteTrabajadores
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
  };

  // Manejo de carga de Excel / CSV (Mapea Columna A -> Nombre, Columna B -> CURP)
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const HEADER_KEYWORDS = ['nombre', 'name', 'names', 'nombres', 'empleado', 'employee', 'trabajador'];
        const extracted: EmployeeRow[] = [];

        rows.forEach((row, idx) => {
          // Omitir siempre la primera fila de encabezados
          if (idx === 0) return;

          let name = '';
          let curp = '';

          // Detectar formato: si la columna C (index 2) tiene contenido, asumimos 4 columnas (Paterno, Materno, Nombre, CURP)
          const hasColC = String(row[2] ?? '').trim() !== '';

          if (hasColC) {
            name = [row[0], row[1], row[2]]
              .map(val => String(val ?? '').trim())
              .filter(Boolean)
              .join(' ')
              .toUpperCase();
            curp = String(row[3] ?? '').trim().replace(/\s/g, '').toUpperCase();
          } else {
            // Formato de 2 columnas: Nombre Completo y CURP
            name = String(row[0] ?? '').trim().toUpperCase();
            curp = String(row[1] ?? '').trim().replace(/\s/g, '').toUpperCase();
          }

          if (!name || name.length < 2) return;

          // Limitar la CURP a 18 caracteres limpios oficiales
          const cleanCurp = curp.substring(0, 18);

          extracted.push({
            id: String(Math.random() + idx),
            nombreCompleto: name,
            curp: cleanCurp
          });
        });

        if (extracted.length === 0) {
          Swal.fire({
            icon: 'warning',
            title: 'Sin datos válidos',
            text: 'No se encontraron nombres en la columna A del archivo.',
            confirmButtonColor: '#722F37'
          });
          return;
        }

        setEmployees(prev => {
          const filtered = prev.filter(emp => emp.nombreCompleto.trim() !== '');
          return [...filtered, ...extracted];
        });

        Swal.fire({
          icon: 'success',
          title: `${extracted.length} trabajadores cargados`,
          text: 'Los nombres y CURPs fueron agregados desde el archivo.',
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Error al leer archivo',
          text: 'Asegúrate de subir un archivo .xlsx o .csv válido.',
          confirmButtonColor: '#722F37'
        });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Pegado de nombres por bloque
  const handleAddBulkNames = () => {
    const lines = bulkText.split('\n').map(l => l.trim().toUpperCase()).filter(l => l.length > 1);
    if (lines.length === 0) return;

    const newRows = lines.map((name, i) => ({
      id: String(Math.random() + i),
      nombreCompleto: name,
      curp: ''
    }));

    setEmployees(prev => {
      const filtered = prev.filter(emp => emp.nombreCompleto.trim() !== '');
      return [...filtered, ...newRows];
    });

    setBulkText('');
    setShowBulkPaste(false);

    Swal.fire({
      icon: 'success',
      title: `${newRows.length} nombres agregados`,
      text: 'Se agregaron a la lista. Recuerda capturar sus respectivas CURPs.',
      timer: 2500,
      showConfirmButton: false
    });
  };

  // Autocompletar Razón Social y Actividad desde acta
  const handleAutocompleteFromActa = async (docId: string) => {
    if (!docId) {
      setFormData(prev => ({ ...prev, razonSocial: '', actividadGiro: '' }));
      return;
    }
    const doc = documents.find(d => d.id.toString() === docId);
    if (doc) {
      // 1. Pre-llenar datos de la empresa y asegurar valores por defecto del agente
      setFormData(prev => ({
        ...prev,
        razonSocial: doc.company_name || doc.commercial_name || '',
        actividadGiro: doc.activity || '',
        agenteCapacitador: prev.agenteCapacitador || 'SEPRISA S.A. DE C.V.',
        registroSTPS: prev.registroSTPS || 'SEP120304AA1-0013'
      }));

      // 2. Consultar trabajadores de esta acta para autocompletar representantes
      try {
        const res = await fetch(`/api/documents/${docId}/employees`);
        if (res.ok) {
          const emps = await res.json();
          if (Array.isArray(emps) && emps.length > 0) {
            // Buscar Representante del Patrón
            const patronEmp = emps.find(e => {
              const r = String(e.role || '').toUpperCase();
              return r.includes('PATRÓN') || r.includes('PATRON') || r.includes('PROPIETARIO') || r.includes('REPRESENTANTE LEGAL') || r.includes('ADMINISTRADOR');
            });
            // Buscar Representante de los Trabajadores
            const trabEmp = emps.find(e => {
              const r = String(e.role || '').toUpperCase();
              return r.includes('TRABAJADORES') || r.includes('TRABAJADOR') || r.includes('COMISIÓN MIXTA') || r.includes('COMISION');
            });

            setFormData(prev => ({
              ...prev,
              representanteEmpresa: patronEmp ? patronEmp.name.toUpperCase() : prev.representanteEmpresa,
              representanteTrabajadores: trabEmp ? trabEmp.name.toUpperCase() : prev.representanteTrabajadores
            }));
          }
        }
      } catch (e) {
        console.error('Error autocompletando representantes:', e);
      }
    }
  };

  // Manejo de cambios estándar en inputs principales
  const handleInputChange = (field: keyof typeof formData, val: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: val
    }));
  };

  // Actualizar un trabajador de la lista dinámica
  const updateEmployeeRow = (id: string, field: keyof EmployeeRow, val: string) => {
    setEmployees(prev =>
      prev.map(emp => (emp.id === id ? { ...emp, [field]: val } : emp))
    );
  };

  // Agregar fila de trabajador vacía
  const handleAddEmployeeRow = () => {
    setEmployees(prev => [
      ...prev,
      { id: String(Math.random()), nombreCompleto: '', curp: '' }
    ]);
  };

  // Eliminar fila de trabajador
  const handleRemoveEmployeeRow = (id: string) => {
    if (employees.length === 1) {
      setEmployees([{ id: '1', nombreCompleto: '', curp: '' }]);
      return;
    }
    setEmployees(prev => prev.filter(emp => emp.id !== id));
  };

  // Actualizar un curso de la lista
  const updateCourseField = (id: string, field: keyof CourseConfig, value: any) => {
    setCourses(prev =>
      prev.map(c => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  // Obtener cursos seleccionados
  const getSelectedCoursesData = () => {
    return courses
      .filter(c => c.selected)
      .map(c => ({
        nombreCurso: c.nombreCurso.trim().toUpperCase(),
        duracionHoras: String(c.duracionHoras).trim(),
        fechaInicio: globalDates.fechaInicio,
        fechaFin: globalDates.fechaFin
      }));
  };

  // Obtener listado de trabajadores activos
  const getActiveEmployees = () => {
    return employees
      .filter(emp => emp.nombreCompleto.trim() !== '')
      .map(emp => ({
        nombreCompleto: emp.nombreCompleto.trim().toUpperCase(),
        curp: emp.curp.trim().replace(/\s/g, '').toUpperCase()
      }));
  };

  // Validación de campos
  const validateForm = () => {
    const { razonSocial } = formData;
    const activeEmps = getActiveEmployees();
    const selectedCourses = courses.filter(c => c.selected);

    if (activeEmps.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Sin trabajadores', text: 'Debes ingresar al menos un nombre de trabajador válido.', confirmButtonColor: '#722F37' });
      return false;
    }

    // Validar CURPs
    for (const emp of activeEmps) {
      if (emp.curp.length !== 18) {
        Swal.fire({
          icon: 'warning',
          title: 'CURP incorrecto',
          text: `La CURP de "${emp.nombreCompleto}" debe tener exactamente 18 caracteres.`,
          confirmButtonColor: '#722F37'
        });
        return false;
      }
    }

    if (!razonSocial.trim()) {
      Swal.fire({ icon: 'warning', title: 'Falta Razón Social', text: 'La Razón Social de la empresa es obligatoria.', confirmButtonColor: '#722F37' });
      return false;
    }
    if (selectedCourses.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Sin cursos', text: 'Selecciona al menos un curso para generar.', confirmButtonColor: '#722F37' });
      return false;
    }
    if (!globalDates.fechaInicio || !globalDates.fechaFin) {
      Swal.fire({ icon: 'warning', title: 'Faltan Fechas', text: 'El periodo de ejecución (Fecha Inicio y Fin) es obligatorio.', confirmButtonColor: '#722F37' });
      return false;
    }

    // Validar duraciones
    for (const c of selectedCourses) {
      if (!c.duracionHoras.trim() || isNaN(Number(c.duracionHoras))) {
        Swal.fire({ icon: 'warning', title: 'Duración inválida', text: `Especifica horas válidas para el curso "${c.nombreCurso}".`, confirmButtonColor: '#722F37' });
        return false;
      }
    }

    return true;
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    savePersistentFields();

    const selectedCourses = getSelectedCoursesData();
    const activeEmps = getActiveEmployees();

    const payload = {
      ...formData,
      razonSocial: formData.razonSocial.trim().toUpperCase(),
      actividadGiro: formData.actividadGiro.trim().toUpperCase(),
      agenteCapacitador: formData.agenteCapacitador.trim().toUpperCase(),
      registroSTPS: formData.registroSTPS.trim().toUpperCase(),
      instructor: formData.instructor.trim().toUpperCase(),
      representanteEmpresa: formData.representanteEmpresa.trim().toUpperCase(),
      representanteTrabajadores: formData.representanteTrabajadores.trim().toUpperCase(),
      courses: selectedCourses,
      employees: activeEmps,
      customFileName: customFileName.trim()
    };

    await onGenerate(payload);
  };

  const handlePreviewClick = async () => {
    if (!validateForm()) return;
    savePersistentFields();

    const selectedCourses = getSelectedCoursesData();
    const activeEmps = getActiveEmployees();

    const payload = {
      ...formData,
      razonSocial: formData.razonSocial.trim().toUpperCase(),
      actividadGiro: formData.actividadGiro.trim().toUpperCase(),
      agenteCapacitador: formData.agenteCapacitador.trim().toUpperCase(),
      registroSTPS: formData.registroSTPS.trim().toUpperCase(),
      instructor: formData.instructor.trim().toUpperCase(),
      representanteEmpresa: formData.representanteEmpresa.trim().toUpperCase(),
      representanteTrabajadores: formData.representanteTrabajadores.trim().toUpperCase(),
      courses: selectedCourses,
      employees: activeEmps,
      customFileName: customFileName.trim()
    };

    await onPreview(payload);
  };

  const handleLimpiar = () => {
    Swal.fire({
      title: '¿Limpiar formulario?',
      text: "Se borrarán los campos del trabajador, empresa y de los cursos. Tus firmas persistentes se mantendrán cargadas.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        setFormData(prev => ({
          ...prev,
          razonSocial: '',
          actividadGiro: ''
        }));
        setEmployees([{ id: '1', nombreCompleto: '', curp: '' }]);
        setGlobalDates({ fechaInicio: '', fechaFin: '' });
        setSameDate(false);
        setCustomFileName('');
        setBulkText('');
        setShowBulkPaste(false);
        setCourses([
          { id: 'incendios', selected: true, nombreCurso: 'PREVENCIÓN Y COMBATE CONTRA INCENDIOS', duracionHoras: '3' },
          { id: 'evacuacion', selected: true, nombreCurso: 'EVACUACIÓN DE INMUEBLES', duracionHoras: '1' },
          { id: 'primeros_auxilios', selected: true, nombreCurso: 'PRIMEROS AUXILIOS', duracionHoras: '3' },
          { id: 'busqueda_rescate', selected: true, nombreCurso: 'BÚSQUEDA Y RESCATE', duracionHoras: '1' }
        ]);
      }
    });
  };

  const handleSelectAllCourses = (selected: boolean) => {
    setCourses(prev => prev.map(c => ({ ...c, selected })));
  };

  if (!isOpen) return null;

  const totalPages = getActiveEmployees().length * courses.filter(c => c.selected).length * 2;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-0 md:p-4 z-50 transition-opacity">
      <div className="bg-white dark:bg-gray-800 shadow-2xl w-full h-full md:h-auto md:max-h-[92vh] md:max-w-2xl md:rounded-2xl overflow-hidden flex flex-col transition-transform">
        
        {/* Header */}
        <div className="bg-blue-900 px-6 py-4 text-white flex justify-between items-center shrink-0">
          <h3 className="font-extrabold flex items-center gap-2 text-lg tracking-tight">
            <FileText className="w-5 h-5 text-red-450" />
            Generador Oficial DC-3 STPS
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center bg-blue-800/40 hover:bg-blue-850 transition-colors rounded-full w-9 h-9 text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleGenerate} className="p-6 space-y-6 overflow-y-auto flex-1 dark:text-white">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Carga o captura los trabajadores de la sucursal, configura el periodo y los cursos. Se generará un solo archivo PDF con las constancias (anverso y reverso) de todos los trabajadores.
          </p>

          {/* ────────────────── SECCIÓN 1: TRABAJADORES DE LA SUCURSAL ────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-150 pb-1.5 dark:border-gray-700">
              <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 font-bold text-xs px-2.5 py-1 rounded-md">1</span>
              <h4 className="font-bold text-sm text-blue-900 dark:text-blue-300 uppercase tracking-wide">Trabajadores de la Sucursal</h4>
            </div>

            {/* Fila de Herramientas de Carga Masiva */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => handleAddEmployeeRow()}
                className="flex items-center gap-1.5 text-xs text-blue-700 font-bold hover:text-blue-900 transition-colors dark:text-blue-400 dark:hover:text-blue-300"
              >
                <Plus className="w-4 h-4" />
                Agregar Renglón
              </button>

              <button
                type="button"
                onClick={() => { setShowBulkPaste(v => !v); setBulkText(''); }}
                className="flex items-center gap-1.5 text-xs text-purple-700 font-bold hover:text-purple-900 transition-colors dark:text-purple-400 dark:hover:text-purple-300"
              >
                <Filter className="w-4 h-4" />
                {showBulkPaste ? 'Cancelar pegado' : 'Pegar lista de nombres'}
              </button>

              {/* Excel hidden input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={handleExcelUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold hover:text-emerald-900 transition-colors dark:text-emerald-450 dark:hover:text-emerald-350"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Subir Excel / CSV
              </button>
            </div>

            {/* Pegado Múltiple de Nombres */}
            {showBulkPaste && (
              <div className="p-3.5 bg-purple-50 dark:bg-purple-950/15 border border-purple-200 dark:border-purple-900/40 rounded-xl space-y-2">
                <p className="text-xs text-purple-800 dark:text-purple-400 font-medium">
                  Pega la lista de nombres completos (uno por renglón). Se añadirán a la lista actual de trabajadores.
                </p>
                <textarea
                  rows={4}
                  placeholder={"SÁNCHEZ RODRÍGUEZ MARÍA ISABEL\nGONZÁLEZ PÉREZ JUAN CARLOS\n..."}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full border border-purple-300 dark:border-purple-900 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 focus:ring-1 focus:ring-purple-500 uppercase resize-none"
                />
                <button
                  type="button"
                  onClick={handleAddBulkNames}
                  className="w-full py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Agregar {bulkText.split('\n').filter(n => n.trim()).length || 0} nombres a la lista
                </button>
              </div>
            )}

            {/* Tabla Dinámica de Captura de Trabajadores */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-750 text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3">Nombre Completo *</th>
                    <th className="p-3 w-56">CURP (18 Chars) *</th>
                    <th className="p-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, index) => (
                    <tr key={emp.id} className="border-t border-gray-100 dark:border-gray-700/60 hover:bg-gray-50/50 dark:hover:bg-gray-750/30">
                      <td className="p-2 text-center font-bold text-xs text-gray-400">
                        {index + 1}
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          required
                          value={emp.nombreCompleto}
                          onChange={(e) => updateEmployeeRow(emp.id, 'nombreCompleto', e.target.value)}
                          placeholder="Ej. SÁNCHEZ RODRÍGUEZ MARÍA"
                          className="w-full border-none focus:outline-none focus:ring-0 bg-transparent text-xs uppercase font-medium dark:text-white"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          required
                          maxLength={30}
                          value={emp.curp}
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(/\s/g, '').toUpperCase().substring(0, 18);
                            updateEmployeeRow(emp.id, 'curp', cleaned);
                          }}
                          placeholder="CURP (18 letras)"
                          className="w-full border-none focus:outline-none focus:ring-0 bg-transparent text-xs font-mono uppercase tracking-wider dark:text-white"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveEmployeeRow(emp.id)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              * Nota: Puedes subir un archivo Excel con dos columnas: **Nombre** y **CURP** para llenar la tabla de inmediato.
            </p>
          </div>

          {/* ────────────────── SECCIÓN 2: DATOS DE LA EMPRESA ────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-150 pb-1.5 dark:border-gray-700">
              <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 font-bold text-xs px-2.5 py-1 rounded-md">2</span>
              <h4 className="font-bold text-sm text-blue-900 dark:text-blue-300 uppercase tracking-wide">Datos de la Empresa</h4>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 border border-gray-200 dark:border-gray-700/60">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Autocompletar Datos desde Acta Guardada:</label>
              <select
                onChange={(e) => handleAutocompleteFromActa(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 focus:ring-blue-500"
                defaultValue=""
              >
                <option value="">-- Escribir Datos manualmente --</option>
                {documents.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.company_name || d.commercial_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nombre o Razón Social *</label>
                <input
                  type="text"
                  required
                  value={formData.razonSocial}
                  onChange={(e) => handleInputChange('razonSocial', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm uppercase dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Actividad o Giro Comercial *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. SERVICIOS DE SEGURIDAD PRIVADA"
                  value={formData.actividadGiro}
                  onChange={(e) => handleInputChange('actividadGiro', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm uppercase dark:bg-gray-700"
                />
              </div>
            </div>
          </div>

          {/* ────────────────── SECCIÓN 3: SELECCIÓN DE CURSOS Y FECHAS ────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-150 pb-1.5 dark:border-gray-700">
              <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 font-bold text-xs px-2.5 py-1 rounded-md">3</span>
              <h4 className="font-bold text-sm text-blue-900 dark:text-blue-300 uppercase tracking-wide">Selección de Cursos y Fechas</h4>
            </div>

            {/* Fechas de Ejecución Globales */}
            <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-450 uppercase tracking-wider mb-1">Periodo de Ejecución de la Capacitación</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Estas fechas se aplicarán automáticamente a todos los cursos seleccionados.</p>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sameDate}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSameDate(checked);
                      if (checked && globalDates.fechaInicio) {
                        setGlobalDates(prev => ({ ...prev, fechaFin: globalDates.fechaInicio }));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Misma fecha para ambos días</span>
                </label>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Fecha de Inicio *</label>
                <input
                  type="date"
                  required
                  value={globalDates.fechaInicio}
                  onChange={(e) => setGlobalDates(prev => ({ ...prev, fechaInicio: e.target.value }))}
                  className="w-full border border-gray-350 dark:border-gray-650 rounded-lg p-2.5 text-sm dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Fecha de Término *</label>
                <input
                  type="date"
                  required
                  disabled={sameDate}
                  value={sameDate ? globalDates.fechaInicio : globalDates.fechaFin}
                  onChange={(e) => setGlobalDates(prev => ({ ...prev, fechaFin: e.target.value }))}
                  className={`w-full border border-gray-350 dark:border-gray-650 rounded-lg p-2.5 text-sm dark:bg-gray-700 transition-all ${
                    sameDate ? 'opacity-60 bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : ''
                  }`}
                />
              </div>
            </div>

            {/* Controles de Selección Masiva */}
            <div className="flex gap-4 items-center justify-between text-xs font-semibold px-1">
              <span className="text-gray-600 dark:text-gray-400">
                Seleccionados: {courses.filter(c => c.selected).length} de {courses.length}
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectAllCourses(true)}
                  className="text-blue-700 hover:text-blue-900 transition-colors"
                >
                  Seleccionar Todos
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={() => handleSelectAllCourses(false)}
                  className="text-red-700 hover:text-red-950 transition-colors"
                >
                  Deseleccionar Todos
                </button>
              </div>
            </div>

            {/* Lista de Tarjetas de Cursos */}
            <div className="space-y-3">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 ${
                    course.selected
                      ? 'bg-blue-50/30 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/50 shadow-xs'
                      : 'bg-gray-50/40 border-gray-200 dark:bg-gray-750/10 dark:border-gray-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateCourseField(course.id, 'selected', !course.selected)}
                      className="text-blue-700 hover:scale-105 transition-transform"
                    >
                      {course.selected ? (
                        <CheckSquare className="w-5.5 h-5.5" />
                      ) : (
                        <Square className="w-5.5 h-5.5 text-gray-400" />
                      )}
                    </button>
                    <input
                      type="text"
                      value={course.nombreCurso}
                      onChange={(e) => updateCourseField(course.id, 'nombreCurso', e.target.value)}
                      className="flex-1 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 font-bold text-xs md:text-sm uppercase py-1 focus:outline-none dark:text-white"
                      title="Nombre del curso (editable)"
                    />
                  </div>

                  {course.selected && (
                    <div className="flex flex-wrap gap-4 pl-8 pt-1.5 border-t border-dashed border-gray-200 dark:border-gray-700/50">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 dark:text-gray-400 font-bold text-xs">Duración del Curso (Horas):</span>
                        <input
                          type="number"
                          value={course.duracionHoras}
                          onChange={(e) => updateCourseField(course.id, 'duracionHoras', e.target.value)}
                          className="w-20 border border-gray-300 dark:border-gray-600 rounded px-2.5 py-1 bg-white dark:bg-gray-750 text-center font-bold focus:ring-1 focus:ring-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Agente Capacitador */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nombre Agente Capacitador</label>
              <input
                type="text"
                placeholder="Ej. SEPRISA S.A. DE C.V."
                value={formData.agenteCapacitador}
                onChange={(e) => handleInputChange('agenteCapacitador', e.target.value)}
                className="w-full border border-gray-350 dark:border-gray-650 rounded-lg p-2.5 text-sm uppercase dark:bg-gray-700"
              />
            </div>
          </div>

          {/* ────────────────── SECCIÓN 4: FIRMAS Y VALIDACIÓN ────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-150 pb-1.5 dark:border-gray-700">
              <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 font-bold text-xs px-2.5 py-1 rounded-md">4</span>
              <h4 className="font-bold text-sm text-blue-900 dark:text-blue-300 uppercase tracking-wide flex items-center gap-1.5">
                Datos de Firmantes
                <span title="Se guardan automáticamente en memoria para futuros usos">
                  <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                </span>
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nombre del Instructor *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. JORGE H. MEZA"
                  value={formData.instructor}
                  onChange={(e) => handleInputChange('instructor', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm uppercase dark:bg-gray-700"
                />
              </div>
            </div>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              💡 El nombre del Instructor, la Actividad y el Agente Capacitador se guardarán de forma persistente en tu navegador al descargar o ver la vista previa.
            </p>
          </div>

          {/* ────────────────── SECCIÓN 5: CONFIGURACIÓN DEL ARCHIVO DE SALIDA ────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-150 pb-1.5 dark:border-gray-700">
              <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 font-bold text-xs px-2.5 py-1 rounded-md">5</span>
              <h4 className="font-bold text-sm text-blue-900 dark:text-blue-300 uppercase tracking-wide">Archivo de Salida</h4>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nombre Personalizado para el PDF (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. DC-3 SUCURSAL TULUM CENTRO"
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm uppercase dark:bg-gray-700 font-semibold"
              />
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                Deja este campo en blanco para usar el nombre genérico predeterminado por el sistema.
              </p>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0 bg-gray-50 dark:bg-gray-800 flex flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-bold text-sm min-h-[44px]"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={handleLimpiar}
            className="px-4 py-3 border border-orange-250 bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors font-bold text-sm min-h-[44px]"
            title="Limpiar datos"
          >
            Limpiar
          </button>

          <button
            type="button"
            onClick={handlePreviewClick}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold flex items-center justify-center gap-1.5 text-sm min-h-[44px]"
          >
            <Eye className="w-4 h-4" />
            Vista Previa
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={totalPages === 0}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-bold flex items-center justify-center gap-1.5 text-sm min-h-[44px] disabled:opacity-50"
          >
            <Award className="w-4 h-4" />
            Descargar {totalPages > 0 ? `(${totalPages} Pág)` : ''}
          </button>
        </div>

      </div>
    </div>
  );
}
