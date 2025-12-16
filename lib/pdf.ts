import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

type LabelInput = {
  trackingCode: string;
  origin: string;
  destination: string;
  customerEmail?: string | null;
};

type InvoiceInput = {
  invoiceNumber: string;
  trackingCode: string;
  origin: string;
  destination: string;
  amount: number;
  currency: string;
  issuedAt: Date;
  customerEmail?: string | null;
};

async function embedQr(pdf: PDFDocument, content: string) {
  const pngDataUrl = await QRCode.toDataURL(content, { errorCorrectionLevel: "M", margin: 1, scale: 6 });
  const bytes = Uint8Array.from(atob(pngDataUrl.split(",")[1]), c => c.charCodeAt(0));
  const img = await pdf.embedPng(bytes);
  return img;
}

export async function createLabelPdf(input: LabelInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([400, 600]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawText("ATLAS PARCEL EUROPE", { x: 30, y: 560, size: 16, font: bold, color: rgb(0.1,0.1,0.1) });
  page.drawText("Shipping Label", { x: 30, y: 540, size: 12, font, color: rgb(0.35,0.35,0.35) });

  page.drawRectangle({ x: 30, y: 470, width: 340, height: 55, borderWidth: 1, borderColor: rgb(0.85,0.85,0.85) });
  page.drawText("Tracking", { x: 40, y: 510, size: 10, font, color: rgb(0.4,0.4,0.4) });
  page.drawText(input.trackingCode, { x: 40, y: 488, size: 16, font: bold });

  page.drawText("From", { x: 30, y: 445, size: 10, font, color: rgb(0.4,0.4,0.4) });
  page.drawText(input.origin || "—", { x: 30, y: 425, size: 14, font: bold });

  page.drawText("To", { x: 30, y: 395, size: 10, font, color: rgb(0.4,0.4,0.4) });
  page.drawText(input.destination || "—", { x: 30, y: 375, size: 14, font: bold });

  page.drawText("Customer", { x: 30, y: 345, size: 10, font, color: rgb(0.4,0.4,0.4) });
  page.drawText(input.customerEmail || "—", { x: 30, y: 328, size: 11, font });

  const qr = await embedQr(pdf, input.trackingCode);
  page.drawImage(qr, { x: 250, y: 300, width: 120, height: 120 });

  page.drawText("Scan for tracking", { x: 250, y: 290, size: 9, font, color: rgb(0.4,0.4,0.4) });

  page.drawRectangle({ x: 30, y: 40, width: 340, height: 230, borderWidth: 1, borderColor: rgb(0.85,0.85,0.85) });
  page.drawText("Notes", { x: 40, y: 255, size: 10, font, color: rgb(0.4,0.4,0.4) });
  page.drawText("Handle with care. Keep label visible.", { x: 40, y: 235, size: 11, font });

  const bytes = await pdf.save();
  return bytes;
}

export async function createInvoicePdf(input: InvoiceInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const money = (n: number) => `${n.toFixed(2)} ${input.currency}`;

  page.drawText("ATLAS PARCEL EUROPE", { x: 50, y: 790, size: 18, font: bold });
  page.drawText("INVOICE", { x: 50, y: 765, size: 12, font, color: rgb(0.35,0.35,0.35) });

  page.drawText(`Invoice #: ${input.invoiceNumber}`, { x: 50, y: 730, size: 11, font });
  page.drawText(`Issued: ${input.issuedAt.toLocaleDateString()}`, { x: 50, y: 712, size: 11, font });
  page.drawText(`Tracking: ${input.trackingCode}`, { x: 50, y: 694, size: 11, font });

  page.drawText("Bill to", { x: 50, y: 660, size: 10, font, color: rgb(0.4,0.4,0.4) });
  page.drawText(input.customerEmail || "—", { x: 50, y: 642, size: 11, font: bold });

  page.drawText("Route", { x: 50, y: 610, size: 10, font, color: rgb(0.4,0.4,0.4) });
  page.drawText(`${input.origin} → ${input.destination}`, { x: 50, y: 592, size: 12, font: bold });

  // Table header
  page.drawRectangle({ x: 50, y: 520, width: 495, height: 30, color: rgb(0.96,0.96,0.96), borderWidth: 1, borderColor: rgb(0.9,0.9,0.9) });
  page.drawText("Description", { x: 60, y: 530, size: 10, font: bold });
  page.drawText("Amount", { x: 470, y: 530, size: 10, font: bold });

  // Row
  page.drawRectangle({ x: 50, y: 490, width: 495, height: 30, borderWidth: 1, borderColor: rgb(0.9,0.9,0.9) });
  page.drawText("Parcel shipping service", { x: 60, y: 500, size: 10, font });
  page.drawText(money(input.amount), { x: 470, y: 500, size: 10, font });

  // Total
  page.drawText("Total", { x: 400, y: 450, size: 12, font: bold });
  page.drawText(money(input.amount), { x: 470, y: 450, size: 12, font: bold });

  const qr = await embedQr(pdf, input.trackingCode);
  page.drawImage(qr, { x: 450, y: 760, width: 90, height: 90 });

  page.drawText("Scan to track", { x: 462, y: 750, size: 9, font, color: rgb(0.4,0.4,0.4) });

  page.drawText("Thank you for your business.", { x: 50, y: 120, size: 11, font, color: rgb(0.35,0.35,0.35) });

  const bytes = await pdf.save();
  return bytes;
}
