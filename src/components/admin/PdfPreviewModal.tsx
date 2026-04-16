import React, { useState, useEffect, useRef } from 'react';
import { Download, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import Swal from 'sweetalert2';


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

interface PdfPreviewModalProps {
  previewUrl: string | null;
  previewName: string;
  previewType: string;
  selectedDocId: number | null;
  onClose: () => void;
}

export default function PdfPreviewModal({
  previewUrl, previewName, onClose
}: PdfPreviewModalProps) {
  const [savingVersion, setSavingVersion] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [zoom, setZoom] = useState(0.40);
  const [zoomInput, setZoomInput] = useState('40');
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const pdfWidth = Math.max(containerWidth * zoom, 300);

  const applyZoom = (value: number) => {
    const clamped = Math.min(Math.max(value, 10), 300);
    setZoom(clamped / 100);
    setZoomInput(String(clamped));
  };

  useEffect(() => {
    if (previewUrl && pdfContainerRef.current) {
       setTimeout(() => {
          if (pdfContainerRef.current) {
            setContainerWidth(Math.max(pdfContainerRef.current.offsetWidth - 32, 300));
          }
       }, 100);

       const handleResize = () => {
         if (pdfContainerRef.current) {
           setContainerWidth(Math.max(pdfContainerRef.current.offsetWidth - 32, 300));
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
    <div className="fixed inset-0 bg-black/70 flex flex-col z-50">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white shrink-0" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <h3 className="font-bold text-lg truncate">{previewName}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => applyZoom(Math.round(zoom * 100) - 15)}
            className="flex items-center justify-center bg-gray-700 hover:bg-gray-600 transition-colors rounded-lg w-11 h-11 text-white/80 hover:text-white"
            title="Reducir zoom"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <div className="flex items-center bg-gray-700 rounded-lg px-2 h-11">
            <input
              type="number"
              value={zoomInput}
              onChange={e => setZoomInput(e.target.value)}
              onBlur={e => applyZoom(Number(e.target.value))}
              onKeyDown={e => { if (e.key === 'Enter') applyZoom(Number(zoomInput)); }}
              className="w-12 bg-transparent text-white text-sm text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-white/60 text-sm">%</span>
          </div>
          <button
            onClick={() => applyZoom(Math.round(zoom * 100) + 15)}
            className="flex items-center justify-center bg-gray-700 hover:bg-gray-600 transition-colors rounded-lg w-11 h-11 text-white/80 hover:text-white"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            disabled={savingVersion}
            onClick={async () => {
              setSavingVersion(true);
              const fileName = `${previewName}.pdf`;
              const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
              
              try {
                const res = await fetch(previewUrl);
                const blob = await res.blob();
                
                // Auto-upload in background removed
                
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
            onClick={() => { URL.revokeObjectURL(previewUrl); onClose(); }}
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
  );
}
