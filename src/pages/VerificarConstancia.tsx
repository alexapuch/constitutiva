import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { slugToFolio } from '../utils/generateFolio';

interface ConstanciaData {
    folio: string;
    employee_name: string;
    created_at: string;
    commercial_name: string | null;
}

export default function VerificarConstancia() {
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<ConstanciaData | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        const fetchDoc = async () => {
            if (!id) { setNotFound(true); setLoading(false); return; }
            try {
                const folio = slugToFolio(id);
                console.log('[Verificar] buscando folio:', folio);
                const { data: result, error } = await supabase
                    .from('constancias')
                    .select('folio, employee_name, created_at, commercial_name')
                    .eq('folio', folio)
                    .maybeSingle();
                console.log('[Verificar] result:', result, 'error:', error);
                if (error || !result) {
                    setNotFound(true);
                } else {
                    setData(result as ConstanciaData);
                }
            } catch (e) {
                console.error('[Verificar] excepción:', e);
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };
        fetchDoc();
    }, [id]);

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleDateString('es-MX', {
            day: 'numeric', month: 'long', year: 'numeric'
        }).toUpperCase();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-10 h-10 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
                    <div className="text-6xl mb-4">❌</div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Documento no encontrado</h1>
                    <p className="text-gray-500">Este documento no existe o no es válido. Verifica que el código QR esté en buen estado.</p>
                </div>
            </div>
        );
    }

    const companyName = data!.commercial_name || '—';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
            {/* Card de validez */}
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mb-6">
                <div className="flex flex-col items-center mb-6">
                    <div className="text-6xl mb-3">✅</div>
                    <h1 className="text-2xl font-bold text-green-600">Constancia Válida</h1>
                    <p className="text-gray-400 text-sm mt-1">Documento verificado exitosamente</p>
                </div>

                <div className="space-y-4 border-t pt-5">
                    <div>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Folio</span>
                        <p className="text-gray-800 font-bold text-lg mt-0.5">{data!.folio}</p>
                    </div>
                    <div>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Acredita a</span>
                        <p className="text-gray-800 font-semibold mt-0.5">{data!.employee_name}</p>
                    </div>
                    <div>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Empresa</span>
                        <p className="text-gray-800 font-semibold mt-0.5">{companyName}</p>
                    </div>
                    <div>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fecha de Emisión</span>
                        <p className="text-gray-800 font-semibold mt-0.5">{formatDate(data!.created_at)}</p>
                    </div>
                </div>
            </div>

            {/* Card de renovación */}
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full border-l-4 border-yellow-400">
                <h2 className="text-base font-bold text-gray-800 mb-2">
                    ⚠️ ¿Esta constancia está próxima a vencer o necesitas capacitar a nuevo personal?
                </h2>
                <p className="text-gray-500 text-sm mb-5">
                    Renueva tus documentos y cumple con la normatividad. Contáctanos para más información.
                </p>
                <a
                    href="https://wa.me/529848764743"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors w-full"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.555 4.122 1.528 5.855L.057 23.386a.75.75 0 00.926.926l5.53-1.471A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.716 9.716 0 01-4.95-1.357l-.355-.21-3.676.977.978-3.588-.229-.368A9.718 9.718 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
                    </svg>
                    Contactar por WhatsApp
                </a>
            </div>
        </div>
    );
}
