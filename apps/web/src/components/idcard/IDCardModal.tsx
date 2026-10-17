import React, { useRef, useState } from 'react';
import { StudentIDCard, StudentIDCardData } from './StudentIDCard';
import { StaffIDCard, StaffIDCardData } from './StaffIDCard';
import { Button, Modal } from '../ui';
import { X, Printer, Download, RotateCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

type CardType = 'student' | 'staff';

interface IDCardModalProps {
  open: boolean;
  onClose: () => void;
  type: CardType;
  // For student cards
  studentData?: StudentIDCardData;
  // For staff cards
  staffData?: StaffIDCardData;
  // RBAC context: can the current user PRINT this card?
  canPrint: boolean;
  // RBAC context label e.g. "School Admin" / "Class Teacher" / "Parent"
  viewerRoleLabel?: string;
}

/**
 * Unified ID Card modal:
 * - Shows front and back of the ID card
 * - Toggle between front / back / both
 * - Print button (visible only if canPrint)
 * - Download as PNG button (uses html-to-image approach via canvas)
 *
 * RBAC:
 * - If canPrint=false, shows a "view only" notice instead of print button
 * - Subject Teachers see the card but cannot print (per requirement)
 */
export const IDCardModal: React.FC<IDCardModalProps> = ({
  open,
  onClose,
  type,
  studentData,
  staffData,
  canPrint,
  viewerRoleLabel,
}) => {
  const [view, setView] = useState<'front' | 'back' | 'both'>('front');
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!canPrint) {
      toast.error('You do not have permission to print this ID card.');
      return;
    }
    if (!cardRef.current) {
      toast.error('ID card not ready for printing.');
      return;
    }

    // Get the card HTML
    const cardHtml = cardRef.current.outerHTML;

    // Open print window with proper sizing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print ID cards.');
      return;
    }

    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>${type === 'student' ? 'Student' : 'Staff'} ID Card — Print</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page { size: 85.6mm 54mm; margin: 0; }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      background: white;
    }
    .card-wrapper { page-break-after: always; }
    .card-wrapper:last-child { page-break-after: auto; }
    @media screen {
      body { background: #f1f5f9; padding: 16px; }
      .card-wrapper { margin-bottom: 16px; }
    }
  </style>
</head>
<body>
  <div class="card-wrapper">${cardHtml}</div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() { window.close(); }, 500);
      }, 500);
    };
  </script>
</body>
</html>
    `);
    printWindow.document.close();
    toast.success('Opening print dialog…');
  };

  const handleDownloadPNG = async () => {
    if (!canPrint) {
      toast.error('You do not have permission to download this ID card.');
      return;
    }
    if (!cardRef.current) {
      toast.error('ID card not ready for download.');
      return;
    }

    // Use the SVG-to-canvas approach to render the card as a PNG
    // We use the browser's built-in XMLSerializer + canvas
    try {
      const node = cardRef.current;
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(node);

      // Use a simple html-to-canvas approach via SVG foreignObject
      const width = node.offsetWidth;
      const height = node.offsetHeight;

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject x="0" y="0" width="100%" height="100%">
          ${svgString.replace(/<svg/g, '<div xmlns="http://www.w3.org/1999/xhtml"').replace(/<\/svg>/g, '</div>')}
        </foreignObject>
      </svg>`;

      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width * 2;  // 2x for retina
        canvas.height = height * 2;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(2, 2);
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((pngBlob) => {
            if (pngBlob) {
              const pngUrl = URL.createObjectURL(pngBlob);
              const a = document.createElement('a');
              const fname = type === 'student' && studentData
                ? `IDCard_${studentData.firstName}_${studentData.lastName}_${studentData.admissionNumber}.png`
                : staffData
                  ? `StaffIDCard_${staffData.firstName}_${staffData.lastName}_${staffData.staffIdNumber}.png`
                  : 'IDCard.png';
              a.href = pngUrl;
              a.download = fname;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
              toast.success('ID card downloaded');
            }
          }, 'image/png');
        }
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        toast.error('Could not generate PNG — please use the Print button and choose "Save as PDF" instead.');
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch (e) {
      toast.error('Download failed — please use the Print button.');
    }
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${type === 'student' ? 'Student' : 'Staff'} Identity Card`}
      className="max-w-3xl"
    >
      <div className="space-y-4">
        {/* RBAC notice */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${
          canPrint
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            : 'bg-amber-50 border border-amber-200 text-amber-700'
        }`}>
          {canPrint ? (
            <>
              <ShieldCheck size={14} className="flex-shrink-0" />
              <span>
                <strong>{viewerRoleLabel || 'Authorized User'}</strong> — You can view, print, and download this ID card.
              </span>
            </>
          ) : (
            <>
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>
                <strong>View only</strong> — You can view this ID card but do not have permission to print or download it. Printing is restricted to School Admins, Principals, Class Teachers (for their class), and Parents (for their child).
              </span>
            </>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {(['front', 'back', 'both'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {v === 'both' ? 'Front + Back' : `${v} side`}
            </button>
          ))}
        </div>

        {/* Card preview */}
        <div className="flex flex-col items-center gap-4 py-4 bg-slate-50 rounded-2xl p-4 overflow-x-auto">
          <div ref={cardRef}>
            {type === 'student' && studentData && (
              <StudentIDCard data={studentData} variant={view} />
            )}
            {type === 'staff' && staffData && (
              <StaffIDCard data={staffData} variant={view} />
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} icon={<X size={14} />}>
            Close
          </Button>
          {canPrint && (
            <>
              <Button
                variant="secondary"
                onClick={handleDownloadPNG}
                icon={<Download size={14} />}
              >
                Download PNG
              </Button>
              <Button onClick={handlePrint} icon={<Printer size={14} />}>
                Print ID Card
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
