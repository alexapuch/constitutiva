const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'AdminView.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add Imports
content = content.replace(
  "import { supabase } from '../utils/supabaseClient';",
  "import { supabase } from '../utils/supabaseClient';\nimport SideMenu from '../components/admin/SideMenu';\nimport DashboardView from '../components/admin/DashboardView';\nimport QuoteHistoryDrawer from '../components/admin/QuoteHistoryDrawer';\nimport PdfHistoryDrawer from '../components/admin/PdfHistoryDrawer';\nimport PdfPreviewModal from '../components/admin/PdfPreviewModal';\nimport CartaResponsivaView from '../components/admin/CartaResponsivaView';\nimport ManualConstanciaModal, { CONSTANCIA_TYPES } from '../components/admin/ManualConstanciaModal';"
);

// 2. Remove react-pdf
content = content.replace(/import \{ Document, Page, pdfjs \} from 'react-pdf';[\s\S]*?function LazyPage.*?\n\s\s\);\n\}\n/m, '');

// 3. Remove CONSTANCIA_TYPES array
content = content.replace(/const CONSTANCIA_TYPES = \[[\s\S]*?\];/m, '');

// 4. Cleanup Carta Responsiva states
content = content.replace(/const \[cartaDocId, setCartaDocId\][\s\S]*?try \{ const s = localStorage.getItem\('autosave_carta'\); if \(s\) return JSON.parse\(s\).fecha \?\? ''; \} catch \{\} return '';\n  \}\);/m, '');

// 5. Cleanup Autosave useeffect
content = content.replace(/\/\/ Autosave: carta responsiva form[\s\S]*?\}, \[cartaDocId, cartaFvu, cartaDictamenGas, cartaFecha\]\);/m, '');

// 6. Replace SideMenu JSX
content = content.replace(/\{\/\* Side Menu Drawer - portal level to cover full viewport \*\/\}\n\s*<AnimatePresence>[\s\S]*?<\/AnimatePresence>/m, 
`{/* Side Menu Drawer - portal level to cover full viewport */}
      <SideMenu
        isOpen={showSideMenu}
        onClose={() => setShowSideMenu(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        quotesCount={quotes.length}
        pdfHistoryCount={pdfHistory.length}
        onOpenQuoteHistory={() => { setShowQuoteDrawer(true); }}
        onOpenNewQuote={() => { setShowQuoteModal(true); }}
        onOpenManualConstancia={() => { handleOpenQuickModal(); }}
        onOpenCartaResponsiva={() => { setShowCartaResponsiva(true); }}
        onOpenPdfHistory={() => { setShowHistoryDrawer(true); }}
        onExportBackup={() => { handleExportBackup(); }}
        onLogout={() => { setIsAuthenticated(false); }}
      />`);

// 7. Replace QuoteHistoryDrawer JSX
content = content.replace(/\{\/\* Quote History Drawer \*\/\}\n\s*<AnimatePresence>[\s\S]*?<\/AnimatePresence>/m,
`{/* Quote History Drawer */}
        <QuoteHistoryDrawer
          isOpen={showQuoteDrawer}
          onClose={() => setShowQuoteDrawer(false)}
          quotes={quotes}
          searchTerm={quoteSearchTerm}
          onSearchChange={setQuoteSearchTerm}
          onEditQuote={(q) => { setQuoteToEdit(q); setShowQuoteModal(true); setShowQuoteDrawer(false); }}
          onDeleteQuote={handleDeleteQuote}
          onNewQuote={() => { setPreviewUrl(null); setPreviewType(''); setPreviewName(''); setShowQuoteDrawer(false); setShowQuoteModal(true); }}
        />`);

// 8. Replace CartaResponsivaView JSX
content = content.replace(/\{\/\* Carta Responsiva - Full Screen View \*\/\}\n\s*\{showCartaResponsiva && \([\s\S]*?\}\)\(\)\}\n\s*<\/div>\n\n\s*<div className="p-4 border-t border-gray-200 bg-gray-50 shrink-0 flex gap-0"[\s\S]*?<\/div>\n\s*<\/div>\n\s*\)\}/m,
`{/* Carta Responsiva - Full Screen View */}
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
               fechaFormateada = \`\${dy} DE \${meses[mo - 1]} DE \${yr}\`;
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
               fechaFormateada = \`\${dy} DE \${meses[mo - 1]} DE \${yr}\`;
             }
             await handlePreview(() => generateCartaResponsivaPDF({
               nombreComercial: doc.commercial_name || '',
               razonSocial: doc.company_name || '',
               direccion: doc.address || '',
               giroComercial: doc.activity || '',
               fecha: fechaFormateada,
               fvu: fvu,
               dictamenGas: dictamenGas,
             }, true), 'Carta Responsiva', \`CARTA RESPONSIVA - \${(doc.commercial_name || '').toUpperCase()} - \${fechaFormateada}\`.replace(/[\\/\\\\?%*:|"<>]/g, '-'));
          }}
        />`);

// 9. Replace Dashboard View JSX
content = content.replace(/\{\/\* Dashboard View \*\/\}\n\s*\{activeTab === 'dashboard' && \([\s\S]*?<\/div>\n\s*\)\}/m,
`{/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <DashboardView documents={documents} quotes={quotes} pdfHistory={pdfHistory} />
        )}`);

// 10. ManualConstanciaModal JSX
content = content.replace(/\{showQuickModal && \([\s\S]*?\{\/\* PDF History Drawer \*\/\}/m,
`<ManualConstanciaModal
        isOpen={showQuickModal}
        onClose={handleCloseQuickModal}
        documents={documents}
        onGenerate={async (qd) => {
           const names = qd.employeeNames.filter((n) => n.trim() !== '');
           const fakeDocInfo = {
             id: 0, commercial_name: qd.commercial_name.toUpperCase(), company_name: '',
             date: qd.date, time_start: '', time_end: '', address: qd.address.toUpperCase(), is_active: 1
           };
           const selectedType = CONSTANCIA_TYPES.find(t => t.id === qd.constanciaType);
           const templateImage = selectedType?.image || '/constancia_vacia.png';
           
           if (names.length === 1) {
             const fakeEmployee = { id: 0, document_id: 0, name: names[0].toUpperCase(), role: '', brigade: '', signature: '' };
             await generateConstanciaPDF(fakeDocInfo, fakeEmployee as any, templateImage);
             addToHistory('Constancia', generatePdfName('CONSTANCIA', qd.commercial_name, fakeDocInfo.date));
           } else {
             const fakeEmployees = names.map((name, i) => ({ id: i, document_id: 0, name: name.toUpperCase(), role: '', brigade: '', signature: '' }));
             await generateBatchConstanciasPDF(fakeDocInfo, fakeEmployees as any, templateImage);
             addToHistory('Constancias (Lote)', generatePdfName('CONSTANCIAS', qd.commercial_name, fakeDocInfo.date));
           }
        }}
        onPreview={async (qd) => {
           const names = qd.employeeNames.filter((n) => n.trim() !== '');
           const fakeDocInfo = {
             id: 0, commercial_name: qd.commercial_name.toUpperCase(), company_name: '',
             date: qd.date, time_start: '', time_end: '', address: qd.address.toUpperCase(), is_active: 1
           };
           const selectedType = CONSTANCIA_TYPES.find(t => t.id === qd.constanciaType);
           const templateImage = selectedType?.image || '/constancia_vacia.png';
           if (names.length === 1) {
             const fakeEmp = { id: 0, document_id: 0, name: names[0].toUpperCase(), role: '', brigade: '', signature: '' };
             await handlePreview(() => generateConstanciaPDF(fakeDocInfo, fakeEmp as any, templateImage, true), 'Constancia', generatePdfName('CONSTANCIA', qd.commercial_name, fakeDocInfo.date));
           } else {
             const fakeEmps = names.map((name, i) => ({ id: i, document_id: 0, name: name.toUpperCase(), role: '', brigade: '', signature: '' }));
             await handlePreview(() => generateBatchConstanciasPDF(fakeDocInfo, fakeEmps as any, templateImage, true), 'Constancias (Lote)', generatePdfName('CONSTANCIAS', qd.commercial_name, fakeDocInfo.date));
           }
        }}
      />

      {/* PDF History Drawer */}`);

// 11. Replace PdfHistoryDrawer JSX
content = content.replace(/\{\/\* PDF History Drawer \*\/\}\n\s*\{showHistoryDrawer && \([\s\S]*?\}\)\(\)\}\n\s*<\/div>\n\s*\)\}\n\s*<\/motion\.div>\n\s*<\/>\n\s*\)\}/m,
`{/* PDF History Drawer */}
      <PdfHistoryDrawer
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        pdfHistory={pdfHistory}
        onClearHistory={() => {
          setPdfHistory([]);
          localStorage.removeItem('pdfHistory');
          fetch('/api/pdf-history-clear', { method: 'DELETE' }).catch(() => {});
        }}
      />`);

// 12. Replace PdfPreviewModal JSX
content = content.replace(/\{\/\* PDF Preview Modal \*\/\}\n\s*\{previewUrl && \([\s\S]*?<\/Document>\n\s*<\/div>\n\s*<\/div>\n\s*\)\}/m,
`{/* PDF Preview Modal */}
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
      />`);


fs.writeFileSync(filePath, content, 'utf-8');
console.log('Refactoring completed successfully.');
