import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { Modal, Button } from '../ui';
import { formatCurrency } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

interface ReceiptData {
  receiptNo: string;
  studentName: string;
  studentAdmissionNo: string;
  className?: string;
  payerName?: string;
  amountInFigures: number;
  amountInWords: string;
  paymentDate: string;
  paymentMethod: string;
  transactionRef?: string;
  invoiceAllocations?: string;
  issuedById?: string;
  issuedAt: string;
  reprintCount?: number;
  isCancelled?: boolean;
}

interface ReceiptViewerProps {
  receipt: ReceiptData | null;
  open: boolean;
  onClose: () => void;
}

/**
 * ReceiptViewer — renders an official, printable payment receipt with
 * school branding. Opens in a modal with a "Print" button that triggers
 * the browser's print dialog (which can save as PDF).
 *
 * The receipt includes:
 *   - School name, logo, address
 *   - Unique receipt number
 *   - Student name + admission number
 *   - Amount in figures AND words
 *   - Payment method, date, transaction reference
 *   - Invoice allocation summary
 *   - Cancellation stamp if receipt was cancelled
 */
export function ReceiptViewer({ receipt, open, onClose }: ReceiptViewerProps) {
  const { user } = useAuthStore();
  const schoolName =
    receipt?.schoolName ||
    receipt?.school?.name ||
    receipt?.school?.tenant?.name ||
    user?.tenant?.name ||
    user?.school?.name ||
    'School';
  const schoolLogo =
    receipt?.schoolLogo ||
    receipt?.school?.logo ||
    receipt?.school?.tenant?.logo ||
    user?.tenant?.logo ||
    user?.school?.logo;
  const primaryColor =
    receipt?.school?.tenant?.primaryColor ||
    user?.tenant?.primaryColor ||
    '#1a56db';

  if (!receipt) return null;

  let allocations: { invoiceNo: string; amount: number }[] = [];
  try {
    allocations = receipt.invoiceAllocations ? JSON.parse(receipt.invoiceAllocations) : [];
  } catch {
    allocations = [];
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Official Payment Receipt"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-slate-400 font-mono">
            {receipt.reprintCount ? `Reprint #${receipt.reprintCount}` : 'Original'}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} icon={<X size={14} />}>Close</Button>
            <Button icon={<Printer size={14} />} onClick={() => window.print()} disabled={receipt.isCancelled}>
              Print Receipt
            </Button>
          </div>
        </div>
      }
    >
      <div id="printable-receipt" className="bg-white p-6 rounded-xl font-sans text-slate-900 text-sm relative">
        {receipt.isCancelled && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-25deg] pointer-events-none z-10">
            <div className="border-4 border-red-500 text-red-500 font-black text-3xl px-8 py-2 rounded-xl opacity-60">
              CANCELLED
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center pb-4 border-b-2" style={{ borderColor: primaryColor }}>
          <div className="flex items-center justify-center gap-3 mb-2">
            {schoolLogo ? (
              <img src={schoolLogo} alt={schoolName} className="w-14 h-14 object-contain rounded-lg" />
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl"
                style={{ background: primaryColor }}>
                {schoolName[0]}
              </div>
            )}
            <div>
              <h1 className="text-xl font-black uppercase tracking-wider">{schoolName}</h1>
              <p className="text-xs italic text-slate-500">Bursary Division — Official Payment Receipt</p>
            </div>
          </div>
          <div className="inline-block border-2 border-dashed rounded-xl px-6 py-1 mt-2" style={{ borderColor: primaryColor }}>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: primaryColor }}>
              Receipt No: {receipt.receiptNo}
            </p>
          </div>
        </div>

        {/* Verification badge */}
        <div className="flex items-center justify-center gap-2 my-3">
          <CheckCircle2 size={16} className="text-emerald-500" />
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Verified & Posted Payment</span>
        </div>

        {/* Payment details */}
        <div className="grid grid-cols-2 gap-4 my-4 p-4 bg-slate-50 rounded-lg text-xs">
          <div>
            <p><span className="text-slate-400">Student: </span><strong className="text-slate-900">{receipt.studentName}</strong></p>
            <p className="mt-1"><span className="text-slate-400">Adm. No: </span><strong className="font-mono">{receipt.studentAdmissionNo}</strong></p>
            {receipt.className && <p className="mt-1"><span className="text-slate-400">Class: </span><strong>{receipt.className}</strong></p>}
            {receipt.payerName && <p className="mt-1"><span className="text-slate-400">Payer: </span>{receipt.payerName}</p>}
          </div>
          <div>
            <p><span className="text-slate-400">Date: </span><strong>{new Date(receipt.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</strong></p>
            <p className="mt-1"><span className="text-slate-400">Method: </span><strong>{receipt.paymentMethod.replace('_', ' ')}</strong></p>
            {receipt.transactionRef && <p className="mt-1"><span className="text-slate-400">Ref: </span><strong className="font-mono">{receipt.transactionRef}</strong></p>}
            <p className="mt-1"><span className="text-slate-400">Issued: </span>{new Date(receipt.issuedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          </div>
        </div>

        {/* Amount box */}
        <div className="border-2 rounded-xl p-4 mb-4" style={{ borderColor: primaryColor }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Amount (Figures)</p>
              <p className="text-2xl font-black" style={{ color: primaryColor }}>{formatCurrency(receipt.amountInFigures)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Amount (Words)</p>
              <p className="text-sm font-semibold italic text-slate-700 leading-tight mt-1">{receipt.amountInWords}</p>
            </div>
          </div>
        </div>

        {/* Invoice allocations */}
        {allocations.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Invoice Allocation</p>
            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-50">
                <tr><th className="p-2 text-left font-semibold text-slate-600">Invoice No</th><th className="p-2 text-right font-semibold text-slate-600">Amount</th></tr>
              </thead>
              <tbody>
                {allocations.map((a, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="p-2 font-mono">{a.invoiceNo}</td>
                    <td className="p-2 text-right font-semibold">{formatCurrency(a.amount)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300 bg-slate-50">
                  <td className="p-2 font-bold text-slate-900">Total</td>
                  <td className="p-2 text-right font-black" style={{ color: primaryColor }}>{formatCurrency(receipt.amountInFigures)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-slate-300 text-center text-xs">
          <div>
            <div className="border-t border-slate-800 w-44 mx-auto pt-1 font-bold">School Accountant</div>
            <p className="text-[10px] text-slate-500 mt-0.5">Authorized Signature</p>
          </div>
          <div>
            <div className="border border-slate-300 rounded-lg p-2 text-[10px] text-slate-400">Official School Seal</div>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-400 mt-4">
          This receipt was electronically generated by {schoolName} Bursary System.
          {receipt.reprintCount ? ` Reprint #${receipt.reprintCount}.` : ''} Verify at {window.location.origin}.
        </p>
      </div>
    </Modal>
  );
}
