import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../services/api';
import { CheckCircle, Upload, ArrowLeft, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

const NIGERIAN_STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];
const CLASSES = ['Creche','Nursery 1','Nursery 2','KG 1','KG 2','Primary 1','Primary 2','Primary 3','Primary 4','Primary 5','Primary 6','JSS 1','JSS 2','JSS 3','SSS 1','SSS 2','SSS 3'];
const RELIGIONS = ['Christianity','Islam','Traditional','Other'];
const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

export default function AdmissionApplicationPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState<any>(null);

  const { data: school } = useQuery({
    queryKey: ['school-public', slug],
    queryFn: () => api.get(`/saas/school/${slug}`).then(r => r.data.data),
  });

  const [form, setForm] = useState({
    firstName: '', lastName: '', otherName: '', gender: '', dateOfBirth: '',
    bloodGroup: '', genotype: '', stateOfOrigin: '', lga: '', religion: '', tribe: '',
    applyingForClass: '', boardingDay: 'Day', medicalCondition: '',
    previousSchool: '', previousClass: '',
    parentName: '', parentPhone: '', parentEmail: '', parentOccupation: '',
    email: '', phone: '',
    emergencyContact: '', emergencyPhone: '',
    // EDN-001: honeypot field — real users never see this; bots will fill it
    website: '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submitMut = useMutation({
    mutationFn: (data: any) => api.post(`/saas/school/${slug}/apply`, data),
    onSuccess: (res) => {
      setSubmitted(res.data.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Submission failed. Please try again.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.gender || !form.dateOfBirth || !form.applyingForClass || !form.parentName || !form.parentPhone) {
      toast.error('Please fill all required fields marked with *');
      return;
    }
    submitMut.mutate(form);
  };

  const primary = school?.primaryColor || '#1a56db';

  if (submitted) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-lg w-full text-center border border-gray-100">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: `${primary}20` }}>
          <CheckCircle size={40} style={{ color: primary }} />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Application Submitted!</h1>
        <p className="text-gray-500 mb-6">Your child's admission application has been received. Please save your application number for reference.</p>
        <div className="bg-gray-50 border-2 border-dashed rounded-2xl p-6 mb-6" style={{ borderColor: primary }}>
          <p className="text-sm text-gray-500 mb-1">Application Number</p>
          <p className="text-3xl font-black" style={{ color: primary }}>{submitted.applicationNo}</p>
        </div>
        <p className="text-sm text-gray-400 mb-8">The school will contact you regarding screening and further processes. Check your email for confirmation.</p>
        <div className="flex gap-3">
          <button onClick={() => navigate(`/school/${slug}`)} className="flex-1 border-2 font-semibold py-3 rounded-xl transition-colors hover:bg-gray-50" style={{ borderColor: primary, color: primary }}>
            Back to School
          </button>
          <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-xl" style={{ background: primary }}>
            <Printer size={16} /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );

  const Field = ({ label, required, children }: any) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );

  const Input = ({ k, ...props }: any) => (
    <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-colors" style={{ '--tw-ring-color': primary } as any}
      value={(form as any)[k]} onChange={e => set(k, e.target.value)} {...props} />
  );

  const Sel = ({ k, options, placeholder }: { k: string; options: string[]; placeholder?: string }) => (
    <select className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-white"
      value={(form as any)[k]} onChange={e => set(k, e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  const Section = ({ title, children }: any) => (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-0.5 flex-1 bg-gray-200" />
        <span className="text-xs font-black uppercase tracking-widest text-gray-500 px-2">{title}</span>
        <div className="h-0.5 flex-1 bg-gray-200" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Back */}
        <button onClick={() => navigate(`/school/${slug}`)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to School Portal
        </button>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Official Header */}
          <div className="p-8 text-center border-b-4" style={{ borderColor: primary, background: `linear-gradient(to bottom, ${primary}12, white)` }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-left">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Application No.</p>
                <p className="text-sm font-bold text-gray-500">AUTO-GENERATED</p>
              </div>
              {school?.logo ? (
                <img src={school.logo} alt={school.name} className="w-20 h-20 object-contain rounded-xl shadow" />
              ) : (
                <div className="w-20 h-20 rounded-xl flex items-center justify-center text-white text-2xl font-black shadow-lg" style={{ background: `linear-gradient(135deg, ${primary}, ${school?.secondaryColor || '#7e3af2'})` }}>
                  {school?.name?.[0]}
                </div>
              )}
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Academic Session</p>
                <p className="text-sm font-bold text-gray-500">{new Date().getFullYear()}/{new Date().getFullYear() + 1}</p>
              </div>
            </div>
            <h1 className="text-2xl font-black text-gray-900 uppercase tracking-wide">{school?.name || 'School'}</h1>
            {school?.address && <p className="text-sm text-gray-500 mt-1">{school.address}{school.city ? `, ${school.city}` : ''}{school.state ? `, ${school.state} State` : ''}</p>}
            {school?.motto && <p className="text-sm italic text-gray-500 mt-1">"{school.motto}"</p>}
            <div className="mt-4 inline-block border-2 border-dashed rounded-xl px-8 py-2" style={{ borderColor: primary }}>
              <p className="text-sm font-black uppercase tracking-widest" style={{ color: primary }}>
                Application for Admission — {new Date().getFullYear()}/{new Date().getFullYear() + 1} Session
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-10">
            {/* Section A */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg text-white text-sm font-black flex items-center justify-center flex-shrink-0" style={{ background: primary }}>A</div>
                <h2 className="text-lg font-black text-gray-800 uppercase tracking-wide">Pupil/Student Information</h2>
              </div>
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Surname" required><Input k="lastName" placeholder="e.g. Adeleke" required /></Field>
                  <Field label="First Name" required><Input k="firstName" placeholder="e.g. Oluwaseun" required /></Field>
                  <Field label="Other Names"><Input k="otherName" placeholder="e.g. Blessing" /></Field>
                  <Field label="Gender" required>
                    <Sel k="gender" options={['MALE', 'FEMALE']} placeholder="Select Gender" />
                  </Field>
                  <Field label="Date of Birth" required><Input k="dateOfBirth" type="date" required /></Field>
                  <Field label="Blood Group"><Sel k="bloodGroup" options={BLOOD_GROUPS} placeholder="Select" /></Field>
                  <Field label="Genotype"><Sel k="genotype" options={['AA','AS','SS','AC','SC']} placeholder="Select" /></Field>
                  <Field label="State of Origin"><Sel k="stateOfOrigin" options={NIGERIAN_STATES} placeholder="Select State" /></Field>
                  <Field label="LGA"><Input k="lga" placeholder="Local Government Area" /></Field>
                  <Field label="Religion"><Sel k="religion" options={RELIGIONS} placeholder="Select Religion" /></Field>
                  <Field label="Tribe/Ethnicity"><Input k="tribe" placeholder="e.g. Yoruba" /></Field>
                  <Field label="Class Applying For" required>
                    <Sel k="applyingForClass" options={CLASSES} placeholder="Select Class" />
                  </Field>
                  <Field label="Day/Boarding"><Sel k="boardingDay" options={['Day','Boarding','Weekly Boarding']} /></Field>
                  <Field label="Previous School"><Input k="previousSchool" placeholder="Last school attended" /></Field>
                  <Field label="Previous Class"><Input k="previousClass" placeholder="Class last attended" /></Field>
                  <div className="md:col-span-2 lg:col-span-3">
                    <Field label="Known Medical Condition / Disability">
                      <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none resize-none" rows={2}
                        placeholder="State any medical condition, allergy, or special needs (if none, write NONE)"
                        value={form.medicalCondition} onChange={e => set('medicalCondition', e.target.value)} />
                    </Field>
                  </div>
                </div>
                {/* Passport Photo Box */}
                <div className="flex-shrink-0">
                  <div className="w-32 h-40 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-center p-3 bg-gray-50">
                    <Upload size={20} className="text-gray-300 mb-2" />
                    <p className="text-xs text-gray-400 font-medium">Passport</p>
                    <p className="text-xs text-gray-400">Photograph</p>
                    <p className="text-[10px] text-gray-300 mt-1">2×2 white bg</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section B */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg text-white text-sm font-black flex items-center justify-center flex-shrink-0" style={{ background: primary }}>B</div>
                <h2 className="text-lg font-black text-gray-800 uppercase tracking-wide">Parent / Guardian Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Parent/Guardian Full Name" required><Input k="parentName" placeholder="Full name of father/guardian" required /></Field>
                <Field label="Parent Phone Number" required><Input k="parentPhone" type="tel" placeholder="e.g. 08012345678" required /></Field>
                <Field label="Parent Email"><Input k="parentEmail" type="email" placeholder="parent@email.com" /></Field>
                <Field label="Parent Occupation"><Input k="parentOccupation" placeholder="e.g. Civil Servant" /></Field>
                <Field label="Child's Contact Phone"><Input k="phone" type="tel" placeholder="Child's phone (if any)" /></Field>
                <Field label="Child's Email"><Input k="email" type="email" placeholder="Child's email (if any)" /></Field>
              </div>
            </div>

            {/* Section C */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg text-white text-sm font-black flex items-center justify-center flex-shrink-0" style={{ background: primary }}>C</div>
                <h2 className="text-lg font-black text-gray-800 uppercase tracking-wide">Emergency Contact</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Emergency Contact Name"><Input k="emergencyContact" placeholder="Full name" /></Field>
                <Field label="Emergency Contact Phone"><Input k="emergencyPhone" type="tel" placeholder="08012345678" /></Field>
              </div>
            </div>

            {/* Section D */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg text-white text-sm font-black flex items-center justify-center flex-shrink-0" style={{ background: primary }}>D</div>
                <h2 className="text-lg font-black text-gray-800 uppercase tracking-wide">Documents</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Birth Certificate / Age Declaration', required: true },
                  { label: 'Passport Photograph (3 copies)', required: true },
                  { label: 'Last School Report Card', required: false },
                  { label: 'Immunization Card', required: false },
                ].map(({ label, required }) => (
                  <div key={label} className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-gray-300 transition-colors bg-gray-50">
                    <Upload size={20} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-xs text-gray-500 font-medium leading-tight">{label}</p>
                    {required && <span className="text-xs text-red-400 mt-1 block">Required</span>}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">Physical documents will be required during screening. Please bring originals and photocopies.</p>
            </div>

            {/* Section E — Declaration */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg text-white text-sm font-black flex items-center justify-center flex-shrink-0" style={{ background: primary }}>E</div>
                <h2 className="text-lg font-black text-gray-800 uppercase tracking-wide">Declaration</h2>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                <p className="text-sm text-gray-700 leading-relaxed mb-4">
                  I/We, the parent(s)/guardian(s) of the above-named applicant, hereby declare that all information provided in this application form is true, complete, and accurate to the best of my/our knowledge. I/We understand that any false information may result in the cancellation of the application or withdrawal of admission.
                </p>
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="declaration" required className="mt-1 w-4 h-4 rounded" style={{ accentColor: primary }} />
                  <label htmlFor="declaration" className="text-sm text-gray-600 font-medium cursor-pointer">
                    I agree to the above declaration and the school's terms and conditions.
                  </label>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200">
              <button type="button" onClick={() => navigate(`/school/${slug}`)}
                className="flex-1 border-2 font-semibold py-4 rounded-2xl text-base transition-colors hover:bg-gray-50"
                style={{ borderColor: primary, color: primary }}>
                Cancel
              </button>
              <button type="submit" disabled={submitMut.isPending}
                className="flex-2 text-white font-bold py-4 px-10 rounded-2xl text-base shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                style={{ background: `linear-gradient(135deg, ${primary}, ${school?.secondaryColor || '#7e3af2'})` }}>
                {submitMut.isPending ? 'Submitting Application...' : 'SUBMIT APPLICATION →'}
              </button>
            </div>

            {/* EDN-001: honeypot — hidden from humans, filled by spam bots */}
            <input
              type="text"
              name="website"
              value={form.website}
              onChange={e => set('website', e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', top: 'auto', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
            />
          </form>
        </div>
      </div>
    </div>
  );
}
