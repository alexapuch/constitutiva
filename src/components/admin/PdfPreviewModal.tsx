import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, Printer } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import Swal from 'sweetalert2';


pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function LazyPage({
  pageNumber,
  containerWidth,
  isLandscape,
  isMobile
}: {
  pageNumber: number;
  containerWidth: number;
  isLandscape: boolean;
  isMobile: boolean;
}) {
  const [isVisible, setIsVisible] = useState(pageNumber <= 2);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          // En móvil/iOS Safari es indispensable desmontar los <canvas> que quedan lejos del viewport
          // para no rebasar el límite de ~280 MB de memoria de canvas de WebKit al deslizar 84 páginas.
          setIsVisible(entry.isIntersecting);
        }
      },
      { rootMargin: '650px 0px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const ratio = isLandscape ? 0.7727 : 1.2941;
  const pageHeight = Math.round(containerWidth * ratio) || (isLandscape ? 460 : 600);
  const dpr =
    typeof window !== 'undefined'
      ? isMobile
        ? Math.min(window.devicePixelRatio || 1, 1.5)
        : Math.min(window.devicePixelRatio || 1, 2)
      : 1.5;

  return (
    <div
      ref={ref}
      className="mb-4 shadow-lg flex items-center justify-center bg-white relative"
      style={{ minHeight: pageHeight, width: containerWidth || '100%' }}
    >
      {isVisible ? (
        <Page
          pageNumber={pageNumber}
          width={containerWidth}
          devicePixelRatio={dpr}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          loading={
            <div className="text-xs text-gray-400 font-semibold">
              Página {pageNumber}...
            </div>
          }
        />
      ) : (
        <div className="text-xs text-gray-400 font-semibold select-none">
          Página {pageNumber}
        </div>
      )}
    </div>
  );
}

interface PdfPreviewModalProps {
  previewUrl: string | null;
  previewName: string;
  previewType: string;
  selectedDocId: number | null;
  onClose: () => void;
}

export default function PdfPreviewModal({
  previewUrl, previewName, previewType, onClose
}: PdfPreviewModalProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const isMobileScreen = typeof window !== 'undefined' && window.innerWidth < 640;
  const [zoom, setZoom] = useState(isMobileScreen ? 1.0 : 0.40);
  const [zoomInput, setZoomInput] = useState(isMobileScreen ? '100' : '40');
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const isLandscape = previewType === 'Constancia' || previewType === 'Constancias (Lote)';
  const pdfWidth = Math.max(containerWidth * zoom, 240);

  const applyZoom = (value: number) => {
    const clamped = Math.min(Math.max(value, 20), 300);
    setZoom(clamped / 100);
    setZoomInput(String(clamped));
  };

  useEffect(() => {
    if (previewUrl && pdfContainerRef.current) {
       const mobile = window.innerWidth < 640;
       setZoom(mobile ? 1.0 : 0.40);
       setZoomInput(mobile ? '100' : '40');
       setTimeout(() => {
          if (pdfContainerRef.current) {
            setContainerWidth(Math.max(pdfContainerRef.current.offsetWidth - (window.innerWidth < 640 ? 16 : 32), 260));
          }
       }, 100);

       const handleResize = () => {
         if (pdfContainerRef.current) {
           const nextW = Math.max(pdfContainerRef.current.offsetWidth - (window.innerWidth < 640 ? 16 : 32), 260);
           setContainerWidth(prev => (Math.abs(prev - nextW) > 6 ? nextW : prev));
         }
       };
       window.addEventListener('resize', handleResize);
       return () => window.removeEventListener('resize', handleResize);
    } else {
       setNumPages(null);
    }
  }, [previewUrl]);

  if (!previewUrl) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex flex-col z-[10000]">
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-900 text-white shrink-0" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <h3 className="font-bold text-sm sm:text-lg truncate min-w-0 flex-1">{previewName}</h3>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => applyZoom(Math.round(zoom * 100) - 15)}
            className="flex items-center justify-center bg-gray-700 hover:bg-gray-600 transition-colors rounded-lg w-9 h-9 sm:w-11 sm:h-11 text-white/80 hover:text-white touch-manipulation"
            title="Reducir zoom"
          >
            <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="flex items-center bg-gray-700 rounded-lg px-1.5 sm:px-2 h-9 sm:h-11">
            <input
              type="number"
              value={zoomInput}
              onChange={e => setZoomInput(e.target.value)}
              onBlur={e => applyZoom(Number(e.target.value))}
              onKeyDown={e => { if (e.key === 'Enter') applyZoom(Number(zoomInput)); }}
              className="w-9 sm:w-12 bg-transparent text-white text-xs sm:text-sm text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-white/60 text-xs sm:text-sm">%</span>
          </div>
          <button
            onClick={() => applyZoom(Math.round(zoom * 100) + 15)}
            className="flex items-center justify-center bg-gray-700 hover:bg-gray-600 transition-colors rounded-lg w-9 h-9 sm:w-11 sm:h-11 text-white/80 hover:text-white touch-manipulation"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          <button
            onClick={() => {
              const iframe = document.createElement('iframe');
              iframe.style.display = 'none';
              iframe.src = previewUrl;
              document.body.appendChild(iframe);
              
              iframe.onload = () => {
                try {
                  const win = iframe.contentWindow;
                  if (win) {
                    win.addEventListener('afterprint', () => {
                      setTimeout(() => {
                        if (document.body.contains(iframe)) {
                          document.body.removeChild(iframe);
                        }
                      }, 500);
                    });
                    win.focus();
                    win.print();
                  }
                } catch (e) {
                  console.error('Error al imprimir:', e);
                  window.open(previewUrl, '_blank');
                  if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                  }
                }
                
                // Fallback cleanup after 5 minutes in case afterprint is not supported
                setTimeout(() => {
                  if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                  }
                }, 300000);
              };
            }}
            className="hidden sm:flex items-center justify-center bg-gray-700 hover:bg-gray-600 transition-colors rounded-lg w-11 h-11 text-white/80 hover:text-white"
            title="Imprimir documento"
          >
            <Printer className="w-5 h-5" />
          </button>
          <button
            onClick={() => { URL.revokeObjectURL(previewUrl); onClose(); }}
            className="flex items-center justify-center bg-gray-700 hover:bg-gray-600 transition-colors rounded-lg w-9 h-9 sm:w-11 sm:h-11 text-white/80 hover:text-white touch-manipulation"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>
      <div ref={pdfContainerRef} className="flex-1 w-full bg-gray-200 overflow-auto p-2 sm:p-4 flex flex-col items-center">
        <Document
          key={previewUrl}
          file={previewUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<div className="text-gray-500 py-10 font-bold">Cargando documento...</div>}
          className="flex flex-col items-center"
        >
          {Array.from(new Array(numPages || 0), (_, index) => (
            <LazyPage
              key={`${previewUrl}_page_${index + 1}`}
              pageNumber={index + 1}
              containerWidth={pdfWidth}
              isLandscape={isLandscape}
              isMobile={isMobileScreen}
            />
          ))}
        </Document>
      </div>
    </div>
  );
}
