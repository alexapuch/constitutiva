import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Trash2, FileText, Settings, Calculator } from 'lucide-react';
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
    const [adminPhone, setAdminPhone] = useState('984 87 6 47 43');
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
                setClientName(quoteToEdit.client_name || '');
                setAdminName(quoteToEdit.admin_name || 'JORGE HUMBERTO MEZA CONTRERAS');
                setAdminRegistration(quoteToEdit.admin_registration || 'MPDC/SPCPRyB/AUT-DT/RPS/028/2026');
                setAdminEmail(quoteToEdit.admin_email || 'jorgehmeza@yahoo.com.mx');
                setAdminPhone(quoteToEdit.admin_phone || '984 87 6 47 43');
                setCompanyName(quoteToEdit.company_name || 'SEPRISA');
                if (quoteToEdit.items && Array.isArray(quoteToEdit.items)) {
                    setItems(quoteToEdit.items);
                }
            } else {
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

        if (items.some(i => !i.description.trim())) {
            alert('Por favor, ingresa una descripción para todos los conceptos.');
            return;
        }

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
            const method = quoteToEdit ? 'PUT' : 'POST';
            const url = quoteToEdit ? `/api/quotes/${quoteToEdit.id}` : '/api/quotes';

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
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
            style={{ overscrollBehavior: 'contain' }}
        >
            <div
                className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-3xl md:rounded-xl md:shadow-2xl md:m-4 flex flex-col overflow-hidden"
                style={{ overscrollBehavior: 'contain' }}
            >
                {/* Header */}
                <div className="bg-blue-900 px-4 py-4 sm:p-5 text-white flex justify-between items-center shrink-0">
                    <h3 className="font-extrabold flex items-center gap-2 text-lg">
                        <Calculator className="w-5 h-5 text-blue-300" />
                        {quoteToEdit ? 'Editar Cotización' : 'Nueva Cotización'}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/80 hover:text-white p-2 bg-blue-800/50 hover:bg-blue-800 rounded-lg"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Scrollable form */}
                <form
                    onSubmit={handleGenerateQuote}
                    className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6 space-y-6"
                    style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
                >
                    {/* General Data */}
                    <section className="space-y-3">
                        <h4 className="text-base font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            Datos Generales
                        </h4>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Cliente / Empresa *</label>
                            <input
                                type="text"
                                required
                                placeholder="Ej. Hotel Paraiso"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value.toUpperCase())}
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 uppercase text-base"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Fecha *</label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-base"
                            />
                        </div>

                        {/* Admin Settings Toggle */}
                        <button
                            type="button"
                            onClick={() => setShowAdminSettings(!showAdminSettings)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                            <Settings className="w-4 h-4" />
                            {showAdminSettings ? 'Ocultar datos del Emisor' : 'Configurar datos del Emisor'}
                        </button>

                        {showAdminSettings && (
                            <div className="space-y-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                                    <input type="text" value={adminName} onChange={e => setAdminName(e.target.value)} className="w-full border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Registro</label>
                                    <input type="text" value={adminRegistration} onChange={e => setAdminRegistration(e.target.value)} className="w-full border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Empresa</label>
                                    <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Correo</label>
                                    <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                                    <input type="tel" value={adminPhone} onChange={e => setAdminPhone(e.target.value)} className="w-full border-gray-300 rounded-lg p-2.5 text-sm" />
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Conceptos */}
                    <section className="space-y-3">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h4 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                <Calculator className="w-4 h-4 text-blue-600" />
                                Conceptos
                            </h4>
                            <button
                                type="button"
                                onClick={addItem}
                                className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" />
                                Agregar
                            </button>
                        </div>

                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div key={index} className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-3 relative">
                                    {/* Delete button */}
                                    {items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Descripción</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej. Elaboración de Programa Interno"
                                            value={item.description}
                                            onChange={(e) => handleItemChange(index, 'description', e.target.value.toUpperCase())}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 text-base"
                                        />
                                    </div>

                                    {/* Quantity stepper */}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Cantidad</label>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const current = parseFloat(item.quantity as any) || 0;
                                                    if (current > 1) handleItemChange(index, 'quantity', current - 1);
                                                }}
                                                className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 font-bold text-xl shrink-0"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                required
                                                value={item.quantity === 0 ? '' : item.quantity}
                                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                className="flex-1 border border-gray-300 rounded-lg p-2.5 text-center focus:ring-2 focus:ring-blue-500 text-base font-bold"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const current = parseFloat(item.quantity as any) || 0;
                                                    handleItemChange(index, 'quantity', current + 1);
                                                }}
                                                className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-100 hover:bg-blue-200 active:bg-blue-300 text-blue-700 font-bold text-xl shrink-0"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Precio Unitario</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    required
                                                    placeholder="0.00"
                                                    value={item.unitPrice === 0 ? '' : item.unitPrice}
                                                    onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                                                    className="w-full border border-gray-300 rounded-lg p-2.5 pl-7 text-right focus:ring-2 focus:ring-blue-500 text-base font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Total</label>
                                            <div className="font-mono font-bold text-gray-800 bg-gray-100 px-2.5 py-2.5 rounded-lg text-right text-base border border-gray-200">
                                                {formatCurrency(item.total)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Totals */}
                    <section className="border-t pt-4 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-gray-600">Subtotal:</span>
                            <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-gray-600">IVA (16%):</span>
                            <span className="font-mono font-medium">{formatCurrency(iva)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t-2 border-blue-900">
                            <span className="font-bold text-lg text-blue-900">TOTAL:</span>
                            <span className="font-mono font-extrabold text-lg text-blue-900">{formatCurrency(total)}</span>
                        </div>
                    </section>

                    {/* Spacer for sticky footer */}
                    <div className="h-2" />
                </form>

                {/* Fixed footer buttons */}
                <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-t bg-white flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-bold text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            const form = (e.target as HTMLElement).closest('.flex.flex-col')?.querySelector('form');
                            if (form) form.requestSubmit();
                        }}
                        className="flex-[2] py-3 bg-[#722F37] text-white rounded-lg hover:bg-[#5a252c] font-bold text-sm flex items-center justify-center gap-2"
                    >
                        <FileText className="w-4 h-4" />
                        Generar Cotización
                    </button>
                </div>
            </div>
        </div>
    );
}
