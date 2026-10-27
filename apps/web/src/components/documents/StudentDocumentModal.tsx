import React, { useRef } from 'react';
import { Button, Modal } from '../ui';
import { AdmissionLetter, AdmissionLetterData } from './AdmissionLetter';
import { EnrollmentFormDocument, EnrollmentFormData } from './EnrollmentForm';
import { Printer, FileText, Award, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface DocumentModalProps {
  open: boolean;
  onClose: () => void;
  student: any;
  school: any;
  defaultDocType?: 'admission' | 'enrollment';
}

export const StudentDocumentModal: React.FC<DocumentModalProps> = ({
  open,
  onClose,
  student,
  school,
  defaultDocType = 'admission',
}) => {
  const [docType, setDocType] = React.useState<'admission' | 'enrollment'>(defaultDocType);
  const docRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (defaultDocType) setDocType(defaultDocType);
  }, [defaultDocType]);

  if (!open || !student) return null;

  const schoolName = school?.name || 'EduNest School';
  const schoolLogo = school?.logo;
  const primaryColor = school?.primaryColor || '#2563eb';
  const sessionName = '2026/2027';
  const termName = 'First Term';

  const handlePrint = () => {
    if (!docRef.current) { toast.error('Document not ready'); return; }
    const html = docRef.current.outerHTML;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) { toast.error('Please allow pop-ups'); return; }
    printWindow.document.write(`
<!DOCTYPE html><html><head><title>${docType === 'admission' ? 'Admission Letter' : 'Enrollment Form'}</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>body{margin:0;font-family:'Plus Jakarta Sans',system-ui,sans-serif;}</style>
</head><body>${html}
<script>window.onload=function(){setTimeout(function(){window.print();setTimeout(function(){window.close();},500);},300);};</script>
</body></html>`);
    printWindow.document.close();
    toast.success('Opening print dialog…');
  };

  // Build admission letter data
  const admissionData: AdmissionLetterData = {
    schoolName, schoolLogo,
    schoolAddress: school?.address, schoolPhone: school?.phone, schoolEmail: school?.email,
    primaryColor,
    studentId: student.id,
    admissionNumber: student.admissionNumber,
    firstName: student.firstName, lastName: student.lastName,
    otherName: student.otherName || student.middleName,
    gender: student.gender,
    dateOfBirth: student.dateOfBirth,
    className: student.classEnrollments?.[0]?.class?.name || student.className,
    sessionName, termName,
    admissionDate: student.admissionDate,
    parentName: student.guardians?.[0] ? `${student.guardians[0].firstName} ${student.guardians[0].lastName}` : undefined,
    parentPhone: student.guardians?.[0]?.phone,
    photo: student.photo,
    issueDate: new Date().toISOString(),
  };

  // Build enrollment form data
  const enrollmentData: EnrollmentFormData = {
    schoolName, schoolLogo,
    schoolAddress: school?.address, schoolPhone: school?.phone, schoolEmail: school?.email,
    primaryColor,
    studentId: student.id,
    admissionNumber: student.admissionNumber,
    firstName: student.firstName, lastName: student.lastName,
    otherName: student.otherName || student.middleName,
    gender: student.gender, dateOfBirth: student.dateOfBirth,
    bloodGroup: student.bloodGroup, stateOfOrigin: student.stateOfOrigin,
    lga: student.lga, nationality: student.nationality, religion: student.religion,
    address: student.address, photo: student.photo,
    className: student.classEnrollments?.[0]?.class?.name,
    sessionName, termName, admissionDate: student.admissionDate,
    guardianName: student.guardians?.[0] ? `${student.guardians[0].firstName} ${student.guardians[0].lastName}` : undefined,
    guardianPhone: student.guardians?.[0]?.phone,
    guardianEmail: student.guardians?.[0]?.email,
    guardianOccupation: student.guardians?.[0]?.occupation,
    guardianRelationship: student.guardians?.[0]?.relationship,
    guardianAddress: student.guardians?.[0]?.address,
  };

  return (
    <Modal open={open} onClose={onClose} title="Student Documents" size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setDocType('admission')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${docType === 'admission' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              Admission Letter
            </button>
            <button onClick={() => setDocType('enrollment')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${docType === 'enrollment' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              Enrollment Form
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose} icon={<X size={14} />}>Close</Button>
            <Button onClick={handlePrint} icon={<Printer size={14} />}>Print / Save as PDF</Button>
          </div>
        </div>
      }
    >
      <div className="max-h-[70vh] overflow-y-auto bg-slate-50 rounded-xl">
        <div ref={docRef}>
          {docType === 'admission' ? (
            <AdmissionLetter data={admissionData} />
          ) : (
            <EnrollmentFormDocument data={enrollmentData} />
          )}
        </div>
      </div>
    </Modal>
  );
};
