import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';
import { FIRMA_JORGE_BASE64 } from './firmaJorge';

export interface QuoteItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface QuoteData {
    clientName: string;
    date: string;
    adminName: string;
    adminRegistration: string;
    adminEmail: string;
    adminPhone: string;
    companyName: string;
    items: QuoteItem[];
    subtotal: number;
    iva: number;
    total: number;
}

export const generateQuotePDF = async (quoteData: QuoteData) => {
    try {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter'
        });

        const docWidth = doc.internal.pageSize.getWidth();
        // const docHeight = doc.internal.pageSize.getHeight();

        // 1. Load Logo
        let logoData = null;
        try {
            logoData = await fetch('/seprisa-logo.png')
                .then(res => {
                    if (!res.ok) throw new Error('Logo no encontrado');
                    return res.blob();
                })
                .then(blob => new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                }));
        } catch (e) {
            console.warn("No se pudo cargar el logo:", e);
        }

        // Header Colors
        const primaryColor = [11, 21, 42]; // #0B152A (Dark Blue)
        const accentColor = [114, 47, 55]; // #722F37 (Wine Red)

        // Add Logo
        if (logoData) {
            doc.addImage(logoData, 'PNG', 15, 10, 35, 35, 'logo', 'FAST');
        }

        // Company Header
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFontSize(24);
        doc.text(quoteData.companyName.toUpperCase(), 55, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const headerDetails = [
            `Fecha: ${quoteData.date}`,
            ``,
            `Emitido por: ${quoteData.adminName}`,
            `Registro: ${quoteData.adminRegistration}`,
            `Correo: ${quoteData.adminEmail}`,
            `Teléfono: ${quoteData.adminPhone}`,
        ];

        doc.text(headerDetails, 55, 26);

        // Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.text('COTIZACIÓN DE SERVICIOS', docWidth / 2, 60, { align: 'center' });

        // Client Table Setup
        autoTable(doc, {
            startY: 65,
            body: [[`DIRIGIDO A: ${quoteData.clientName.toUpperCase()}`]],
            theme: 'plain',
            styles: {
                fillColor: [240, 240, 240], // Light gray background
                textColor: primaryColor as [number, number, number],
                fontSize: 11,
                fontStyle: 'bold',
                cellPadding: 4,
                halign: 'center' // Center align inside table
            },
            margin: { left: 15, right: 15 } // Make it width of page layout
        });

        // Format currency
        const formatCurrency = (val: number) => {
            return '$ ' + val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };

        // Table
        const tableData = quoteData.items.map(item => [
            item.description,
            item.quantity.toString(),
            formatCurrency(item.unitPrice),
            formatCurrency(item.total)
        ]);

        const itemsStartY = (doc as any).lastAutoTable.finalY + 5;

        // Dynamic scale to force 1 page
        let scaleFactor = 1;
        if (quoteData.items.length > 5) {
            scaleFactor = Math.max(0.5, 5 / quoteData.items.length); // Max shrink 50%
        }

        const tableFontSize = Math.max(6, Math.floor(10 * scaleFactor));
        const tableCellPadding = Math.max(1.5, 4 * scaleFactor);

        autoTable(doc, {
            startY: itemsStartY,
            head: [['Descripción del Concepto', 'Cantidad', 'Precio Unitario', 'Total']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: primaryColor as [number, number, number],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center',
                fontSize: Math.max(7, Math.floor(10 * scaleFactor))
            },
            columnStyles: {
                0: { cellWidth: 'auto' }, // Descripción
                1: { cellWidth: 25, halign: 'center' }, // Cantidad
                2: { cellWidth: 35, halign: 'right' }, // P.U.
                3: { cellWidth: 35, halign: 'right' }  // Total
            },
            styles: {
                fontSize: tableFontSize,
                cellPadding: tableCellPadding
            },
            alternateRowStyles: {
                fillColor: [245, 247, 250] // Light blue-gray
            }
        });

        // Totals Section
        const finalY = (doc as any).lastAutoTable.finalY + 10;

        const totalsLeftX = docWidth - 75; // Align to the right side

        // Subtotal
        doc.setFontSize(11);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont('helvetica', 'bold');
        doc.text('Subtotal:', totalsLeftX, finalY);
        doc.setFont('helvetica', 'normal');
        doc.text(formatCurrency(quoteData.subtotal), docWidth - 15, finalY, { align: 'right' });

        // IVA
        doc.setFont('helvetica', 'bold');
        doc.text('IVA (16%):', totalsLeftX, finalY + 8);
        doc.setFont('helvetica', 'normal');
        doc.text(formatCurrency(quoteData.iva), docWidth - 15, finalY + 8, { align: 'right' });

        // Total final
        doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.setLineWidth(0.5);
        doc.line(totalsLeftX, finalY + 12, docWidth - 15, finalY + 12);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.text('TOTAL:', totalsLeftX, finalY + 18);
        doc.text(formatCurrency(quoteData.total), docWidth - 15, finalY + 18, { align: 'right' });

        const pageHeight = doc.internal.pageSize.getHeight();
        let currentY = finalY + 25; // Base Y after the TOTAL section (which ends around finalY + 18)

        // Force single page (No adding pages)

        // Adjust footer scale based on space remaining
        const maxExpectedY = pageHeight - 15;
        let footerScale = 1;
        if (currentY + 50 > maxExpectedY) {
            // we are very low, compress the gaps
            footerScale = Math.max(0.45, (maxExpectedY - currentY) / 50);
        }

        // Disclaimer Text
        doc.setFontSize(Math.max(6, Math.floor(9 * footerScale)));
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');

        const disclaimerText = "TODO TRABAJO REQUIERE EL 50% DE ANTICIPO Y EL SALDO RESTANTE CUANDO SE ENTREGUE EL TRABAJO, EN CASO DE APROBAR FAVOR DE ENVIAR CÉDULA FISCAL EN CASO DE QUE REQUIERA FACTURA.";
        const wrappedDisclaimer = doc.splitTextToSize(disclaimerText, docWidth - 30);

        const disclaimerY = currentY + (5 * footerScale);
        doc.text(wrappedDisclaimer, 15, disclaimerY, { align: 'left' });

        // Signature Area
        const signatureY = disclaimerY + (10 * footerScale); // Space for signature image

        // Add Signature Image
        // Scale signature image down if footerScale is small
        const signW = 40 * footerScale;
        const signH = 20 * footerScale;
        doc.addImage(FIRMA_JORGE_BASE64, 'PNG', 15, signatureY, signW, signH);

        // Name and title under signature
        doc.setFontSize(Math.max(7, Math.floor(10 * footerScale)));
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont('helvetica', 'bold');
        doc.text('ATENTAMENTE', 15, signatureY + signH + (4 * footerScale), { align: 'left' });
        doc.text('JORGE HUMBERTO MEZA CONTRERAS', 15, signatureY + signH + (9 * footerScale), { align: 'left' });

        // Footer Note (Print on FIRST PAGE)
        const footerY = doc.internal.pageSize.getHeight() - 10;
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'normal');
        doc.text('Este documento es una cotización y no tiene validez fiscal ni representa una factura.', docWidth / 2, footerY, { align: 'center' });
        doc.text(`Documento generado electrónicamente por ${quoteData.companyName}.`, docWidth / 2, footerY + 4, { align: 'center' });


        // Generate Output and save/share
        const safeName = quoteData.clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'cliente';

        // Format date as DDMMYYYY
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;

        const fileName = `cotizacion_${safeName}_${dateStr}.pdf`;

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile && navigator.canShare) {
            const pdfBlob = doc.output('blob');
            const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
            if (navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: `Cotización - ${quoteData.clientName}`,
                    });
                    return; // Success, exit
                } catch (error) {
                    console.log('Share canceled or failed:', error);
                    // Fallthrough on failure unless overriding tab on iOS is bad, but generally we just return.
                    return;
                }
            }
        }

        doc.save(fileName);
    } catch (error: any) {
        console.error('Error al generar cotización:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error al generar cotización',
            text: `Hubo un error al crear el PDF. Detalles: ${error.message}`,
            confirmButtonColor: '#722F37'
        });
    }
};
