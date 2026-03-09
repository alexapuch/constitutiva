import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, FileText, Settings, Calculator } from 'lucide-react';
import { generateQuotePDF, QuoteData, QuoteItem } from '../utils/generateQuotePDF';

interface QuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    quoteToEdit?: any | null;
    onQuoteSaved?: () => void;
}

export default function QuoteModal({ isOpen, onClose, quoteToEdit, onQuoteSaved }: QuoteModalProps) {
    const [clientName, setClientName] = useState('');
    const [date, setDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });

    // Admin Info
    const [adminName, setAdminName] = useState('JORGE HUMBERTO MEZA CONTRERAS');
    const [adminRegistration, setAdminRegistration] = useState('MPDC/SPCPRyB/AUT-DT/RPS/028/2026');
    const [adminEmail, setAdminEmail] = useState('jorgehmeza@yahoo.com.mx');
    const [adminPhone, setAdminPhone] = useState('984 87 3 47 43');
    const [companyName, setCompanyName] = useState('SEPRISA');
    const [showAdminSettings, setShowAdminSettings] = useState(false);

    // Items
    const [items, setItems] = useState<QuoteItem[]>([
        { description: '', quantity: 1, unitPrice: 0, total: 0 }
    ]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            if (quoteToEdit) {
                // Prefill form for editing
                setClientName(quoteToEdit.client_name || '');
                // Date back to YYYY-MM-DD if possible or leave it formatted if we can't parse easily
                // The DB stores it formatted (e.g. '9 DE MARZO DEL 2026'). We'll leave the date input as is today unless we parse it.
                // For simplicity, let's keep today's date for editing, or let the user pick.
                setAdminName(quoteToEdit.admin_name || 'JORGE HUMBERTO MEZA CONTRERAS');
                setAdminRegistration(quoteToEdit.admin_registration || 'MPDC/SPCPRyB/AUT-DT/RPS/028/2026');
                setAdminEmail(quoteToEdit.admin_email || 'jorgehmeza@yahoo.com.mx');
                setAdminPhone(quoteToEdit.admin_phone || '984 87 3 47 43');
                setCompanyName(quoteToEdit.company_name || 'SEPRISA');
                if (quoteToEdit.items && Array.isArray(quoteToEdit.items)) {
                    setItems(quoteToEdit.items);
                }
            } else {
                // Reset to default
                setClientName('');
                setItems([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
            }
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen, quoteToEdit]);

    const handleItemChange = (index: number, field: keyof QuoteItem, value: any) => {
        const newItems = [...items];
        const item = { ...newItems[index], [field]: value };

        // Auto-calculate total
        if (field === 'quantity' || field === 'unitPrice') {
            const qty = parseFloat(item.quantity as any) || 0;
            const price = parseFloat(item.unitPrice as any) || 0;
            item.total = qty * price;
        }

        newItems[index] = item;
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const iva = subtotal * 0.16;
        const total = subtotal + iva;
        return { subtotal, iva, total };
    };

    const handleGenerateQuote = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate
        if (items.some(i => !i.description.trim())) {
            alert('Por favor, ingresa una descripción para todos los conceptos.');
            return;
        }

        // Format Date nicely
        const dateObj = new Date(date + 'T00:00:00');
        const formattedDate = isNaN(dateObj.getTime()) ? date : dateObj.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const { subtotal, iva, total } = calculateTotals();

        const quoteData: QuoteData = {
            clientName: clientName.trim(),
            date: formattedDate,
            adminName: adminName.trim(),
            adminRegistration: adminRegistration.trim(),
            adminEmail: adminEmail.trim(),
            adminPhone: adminPhone.trim(),
            companyName: companyName.trim(),
            items,
            subtotal,
            iva,
            total
        };

        try {
            // Save to DB
            const method = quoteToEdit ? 'PUT' : 'POST';
            const url = quoteToEdit ? `/api/quotes/${quoteToEdit.id}` : '/api/quotes';

            // Map variables to DB column names for the API payload
            const dbPayload = {
                client_name: quoteData.clientName,
                company_name: quoteData.companyName,
                date: quoteData.date,
                admin_name: quoteData.adminName,
                admin_registration: quoteData.adminRegistration,
                admin_email: quoteData.adminEmail,
                admin_phone: quoteData.adminPhone,
                items: quoteData.items,
                subtotal: quoteData.subtotal,
                iva: quoteData.iva,
                total: quoteData.total
            };

            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dbPayload)
            });

            if (onQuoteSaved) onQuoteSaved();

            await generateQuotePDF(quoteData);
            onClose();

            // Reset basic fields for next time
            setClientName('');
            setItems([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
        } catch (error) {
            console.error('Error saving quote', error);
            alert('Hubo un error al guardar la cotización.');
        }
    };

    if (!isOpen) return null;

    const { subtotal, iva, total } = calculateTotals();

    const formatCurrency = (val: number) => {
        return '$ ' + val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 flex flex-col relative">
                <div className="bg-blue-900 p-5 text-white flex justify-between items-center rounded-t-xl shrink-0">
                    <h3 className="font-extrabold flex items-center gap-2 text-xl">
                        <Calculator className="w-6 h-6 text-blue-300" />
                        {quoteToEdit ? 'Editar Cotización' : 'Nueva Cotización'}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/80 hover:text-white p-2 bg-blue-800/50 hover:bg-blue-800 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleGenerateQuote} className="p-6 flex flex-col gap-8 max-h-[80vh] overflow-y-auto w-full">

                    {/* General Data */}
                    <section className="space-y-4">
                        <h4 className="text-lg font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            Datos Generales
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Cliente / Empresa *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej. Hotel Paraiso"
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value.toUpperCase())}
                                    className="w-full border border-gray-300 rounded-md p-3 focus:ring-blue-600 focus:border-blue-600 bg-gray-50 uppercase"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Fecha de Cotización *</label>
                                <input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md p-3 focus:ring-blue-600 focus:border-blue-600 bg-gray-50"
                                />
                            </div>
                        </div>

                        {/* Admin Settings Toggle */}
                        <div className="mt-2">
                            <button
                                type="button"
                                onClick={() => setShowAdminSettings(!showAdminSettings)}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                            >
                                <Settings className="w-4 h-4" />
                                {showAdminSettings ? 'Ocultar datos del Emisor' : 'Configurar datos del Emisor (Administrador)'}
                            </button>

                            {showAdminSettings && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3 p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                                        <input type="text" value={adminName} onChange={e => setAdminName(e.target.value)} className="w-full border-gray-300 rounded p-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Registro</label>
                                        <input type="text" value={adminRegistration} onChange={e => setAdminRegistration(e.target.value)} className="w-full border-gray-300 rounded p-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Empresa</label>
                                        <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full border-gray-300 rounded p-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Correo</label>
                                        <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full border-gray-300 rounded p-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                                        <input type="tel" value={adminPhone} onChange={e => setAdminPhone(e.target.value)} className="w-full border-gray-300 rounded p-2 text-sm" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Table Items */}
                    <section className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Calculator className="w-5 h-5 text-blue-600" />
                                Conceptos
                            </h4>
                            <button
                                type="button"
                                onClick={addItem}
                                className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold px-3 py-1.5 rounded flex items-center gap-1 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Agregar Fila
                            </button>
                        </div>

                        <div className="hidden md:grid grid-cols-12 gap-3 text-sm font-bold text-gray-500 uppercase px-2">
                            <div className="col-span-6">Descripción</div>
                            <div className="col-span-2 text-center">Cantidad</div>
                            <div className="col-span-2 text-right">Precio Unitario</div>
                            <div className="col-span-2 text-right pr-8">Total</div>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={index} className="flex flex-col md:grid md:grid-cols-12 gap-3 items-center bg-gray-50 md:bg-transparent p-3 md:p-0 rounded-lg border border-gray-200 md:border-none relative group">

                                    {/* Remove Button for Mobile (top right) */}
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        disabled={items.length === 1}
                                        className="md:hidden absolute top-2 right-2 text-red-400 hover:text-red-600 disabled:opacity-30 p-1"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>

                                    <div className="w-full md:col-span-6">
                                        <label className="md:hidden block text-xs font-bold text-gray-500 mb-1">Descripción</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej. Elaboración de Programa Interno"
                                            value={item.description}
                                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                            className="w-full border border-gray-300 rounded p-2 focus:ring-1 focus:ring-blue-500 text-sm"
                                        />
                                    </div>

                                    <div className="w-full md:col-span-2 flex justify-between md:block items-center">
                                        <label className="md:hidden ext-xs font-bold text-gray-500">Cantidad</label>
                                        <input
                                            type="number"
                                            required
                                            min="0.1"
                                            step="0.1"
                                            value={item.quantity === 0 ? '' : item.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                            className="w-24 md:w-full border border-gray-300 rounded p-2 text-center focus:ring-1 focus:ring-blue-500 text-sm"
                                        />
                                    </div>

                                    <div className="w-full md:col-span-2 flex justify-between md:block items-center">
                                        <label className="md:hidden ext-xs font-bold text-gray-500">Precio Unitario</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-500 font-medium">$</span>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                step="0.01"
                                                value={item.unitPrice === 0 ? '' : item.unitPrice}
                                                onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                                                className="w-32 md:w-full border border-gray-300 rounded p-2 pl-7 text-right focus:ring-1 focus:ring-blue-500 text-sm font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="w-full md:col-span-2 flex justify-between md:justify-end items-center md:pr-10 relative">
                                        <label className="md:hidden ext-xs font-bold text-gray-500">Total Fila</label>
                                        <span className="font-mono font-bold text-gray-800 bg-gray-100 px-3 py-1.5 rounded w-32 md:w-full text-right block">
                                            {formatCurrency(item.total)}
                                        </span>

                                        {/* Remove button PC */}
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            disabled={items.length === 1}
                                            className="hidden md:block absolute right-0 text-gray-400 hover:text-red-500 disabled:opacity-0 transition-colors p-1"
                                            title="Eliminar fila"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Totals Calculation */}
                    <section className="border-t pt-5 flex flex-col items-end gap-2 text-gray-800">
                        <div className="w-full md:w-64 flex justify-between items-center text-sm">
                            <span className="font-bold text-gray-600">Subtotal:</span>
                            <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="w-full md:w-64 flex justify-between items-center text-sm">
                            <span className="font-bold text-gray-600">IVA (16%):</span>
                            <span className="font-mono font-medium">{formatCurrency(iva)}</span>
                        </div>
                        <div className="w-full md:w-64 flex justify-between items-center mt-2 pt-2 border-t-2 border-blue-900">
                            <span className="font-bold text-lg text-blue-900">TOTAL:</span>
                            <span className="font-mono font-extrabold text-lg text-blue-900">{formatCurrency(total)}</span>
                        </div>
                    </section>

                    <div className="mt-4 pt-6 flex justify-end gap-4 border-t sticky bottom-0 bg-white shadow-[0_-10px_10px_-10px_rgba(0,0,0,0.1)]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 border-2 border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 font-bold transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-200 font-bold transition-all flex items-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            <FileText className="w-5 h-5" />
                            Generar Cotización
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
