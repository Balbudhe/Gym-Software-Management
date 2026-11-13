import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  CreditCard,
  Dumbbell,
  MapPin,
  UserRound,
  ClipboardList,
  TriangleAlert,
  Check,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import FormField from '../../components/forms/FormField';
import CameraCapture from '../../components/attendance/CameraCapture';
import AuthImage from '../../components/common/AuthImage';
import { statusBadge } from '../../components/common/Badge';
import EditMemberModal from '../../components/members/EditMemberModal';
import { cn } from '../../utils/format';
import { trainerOptionLabel } from '../../utils/batches';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_PATTERN = /^(?:\+91[\s-]?)?[6-9]\d{9}$/;

const isValidPhone = (value) => PHONE_PATTERN.test(String(value || '').trim());
const isValidEmail = (value) => EMAIL_PATTERN.test(String(value || '').trim());

function ExistingMemberCard({ member, matchedOn, onEdit }) {
  if (!member) return null;
  return (
    <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50/90 p-3 text-sm">
      <div className="mb-2 flex items-start gap-2 text-amber-900">
        <TriangleAlert size={16} className="mt-0.5 shrink-0" />
        <p className="text-xs font-medium leading-5 sm:text-sm">
          This {matchedOn} already exists. Tap below to update instead of adding again.
        </p>
      </div>
      <button
        type="button"
        onClick={() => onEdit?.(member)}
        className="flex w-full gap-3 rounded-xl border border-amber-100 bg-white p-3 text-left active:bg-amber-50/50"
      >
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-14 sm:w-14">
          {member.profilePhoto ? (
            <AuthImage src={member.profilePhoto} alt={member.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-slate-400">No photo</div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">{member.name}</p>
            {statusBadge(member.status === 'inactive' ? 'inactive' : member.membershipStatus || member.status)}
          </div>
          <p className="text-xs text-slate-500">
            {member.memberCode}
            {member.branchId?.name ? ` · ${member.branchId.name}` : ''}
          </p>
          <p className="truncate text-xs text-slate-600">
            {member.phone || '—'}
            {member.email ? ` · ${member.email}` : ''}
          </p>
          <p className="text-xs font-medium text-brand-700">Update details →</p>
        </div>
      </button>
    </div>
  );
}

function Section({ icon: Icon, step, title, description, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Step {step}
          </p>
          <h2 className="text-sm font-semibold text-slate-900 sm:text-base">{title}</h2>
          {description ? (
            <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="space-y-3.5 p-4 sm:space-y-4 sm:p-5">{children}</div>
    </section>
  );
}

function FieldGrid({ children }) {
  return <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">{children}</div>;
}

export default function NewAdmission({ trainerMode = false }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: { startDate: new Date().toISOString().slice(0, 10) },
    mode: 'onBlur',
  });
  const [branches, setBranches] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingByPhone, setExistingByPhone] = useState(null);
  const [existingByEmail, setExistingByEmail] = useState(null);
  const [checkingContact, setCheckingContact] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  const openExistingMember = (member) => {
    if (trainerMode) {
      const memberBranch = String(member.branchId?._id || member.branchId || '');
      const trainerBranch = String(user.branchId || '');
      if (memberBranch && trainerBranch && memberBranch !== trainerBranch) {
        toast.push('This member is in another branch. Only that branch can update them.', 'error');
        return;
      }
    }
    setEditingMember(member);
  };

  const applyUpdatedMember = () => {
    setValue('phone', '');
    setValue('email', '');
    setExistingByPhone(null);
    setExistingByEmail(null);
  };

  const branchId = watch('branchId');
  const membershipPlanId = watch('membershipPlanId');
  const assignedTrainerId = watch('assignedTrainerId');
  const createdByTrainerId = watch('createdByTrainerId');
  const memberName = watch('name');
  const startDate = watch('startDate');
  const paymentMethod = watch('paymentMethod');
  const phoneValue = watch('phone');
  const emailValue = watch('email');
  const paymentsEnabled = Boolean(user?.paymentsEnabled);

  const debouncedPhone = useDebounce(phoneValue, 400);
  const debouncedEmail = useDebounce(emailValue, 400);
  const duplicateBlocked = Boolean(existingByPhone || existingByEmail);

  const activePlans = useMemo(() => plans.filter((p) => p.status === 'active'), [plans]);
  const selectedPlan = activePlans.find((p) => p._id === membershipPlanId);
  const selectedBranch = branches.find((b) => b._id === branchId);
  const assignedTrainer = trainers.find((t) => t._id === assignedTrainerId);
  const addedByTrainer = trainers.find((t) => t._id === createdByTrainerId);

  useEffect(() => {
    if (selectedPlan && paymentsEnabled) {
      setValue('paymentAmount', selectedPlan.price);
    }
  }, [selectedPlan, paymentsEnabled, setValue]);

  useEffect(() => {
    api.get('/membership-plans').then(({ data }) => setPlans(data.items || []));
    if (!trainerMode) {
      api.get('/branches').then(({ data }) => setBranches(data.items || []));
    }
  }, [trainerMode]);

  useEffect(() => {
    const loadTrainers = async () => {
      if (trainerMode) {
        const { data } = await api.get('/trainers', { params: { limit: 100, status: 'active' } });
        setTrainers(data.items || []);
        setValue('assignedTrainerId', user.trainerId || '');
        return;
      }
      if (!branchId) {
        setTrainers([]);
        return;
      }
      const { data } = await api.get('/trainers', {
        params: { limit: 100, status: 'active' },
        headers: { 'X-Branch-Id': branchId },
      });
      setTrainers(data.items || []);
    };
    loadTrainers();
  }, [branchId, trainerMode, user, setValue]);

  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview]
  );

  useEffect(() => {
    const phone = String(debouncedPhone || '').trim();
    const email = String(debouncedEmail || '').trim();
    const phoneOk = isValidPhone(phone);
    const emailOk = isValidEmail(email);

    if (!phoneOk && !emailOk) {
      setExistingByPhone(null);
      setExistingByEmail(null);
      setCheckingContact(false);
      return undefined;
    }

    let cancelled = false;
    const lookup = async () => {
      setCheckingContact(true);
      try {
        const params = {};
        if (phoneOk) params.phone = phone;
        if (emailOk) params.email = email;
        const { data } = await api.get('/members/lookup', { params });
        if (cancelled) return;
        setExistingByPhone(phoneOk ? data.byPhone || null : null);
        setExistingByEmail(emailOk ? data.byEmail || null : null);
      } catch {
        if (!cancelled) {
          setExistingByPhone(null);
          setExistingByEmail(null);
        }
      } finally {
        if (!cancelled) setCheckingContact(false);
      }
    };

    lookup();
    return () => {
      cancelled = true;
    };
  }, [debouncedPhone, debouncedEmail]);

  const handlePhotoCapture = (blob) => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    const file = new File([blob], `member-${Date.now()}.jpg`, { type: 'image/jpeg' });
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(blob));
    setPhotoError('');
    setCameraOpen(false);
  };

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    setPhotoPreview(null);
    setPhotoError('Profile photo is required');
  };

  const onInvalid = () => {
    if (!photo) setPhotoError('Profile photo is required');
    toast.push('Please fix the highlighted fields before saving', 'error');
  };

  const onSubmit = async (values) => {
    if (!photo) {
      setPhotoError('Profile photo is required');
      toast.push('Please capture a profile photo', 'error');
      return;
    }
    if (duplicateBlocked) {
      toast.push('This phone or email already belongs to an existing member', 'error');
      return;
    }

    setSaving(true);
    try {
      const form = new FormData();
      Object.entries(values).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') form.append(k, v);
      });
      form.append('profilePhoto', photo);
      await api.post('/admissions', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.push('Admission created');
      navigate(trainerMode ? '/trainer/members' : '/owner/members');
    } catch (error) {
      const data = error.response?.data;
      if (error.response?.status === 409) {
        if (data?.byPhone) setExistingByPhone(data.byPhone);
        if (data?.byEmail) setExistingByEmail(data.byEmail);
      }
      toast.push(data?.message || 'Could not create admission', 'error');
    } finally {
      setSaving(false);
    }
  };

  const backTo = trainerMode ? '/trainer/members' : '/owner/members';
  const canSubmit = !saving && !duplicateBlocked && !checkingContact;

  return (
    <div className="mx-auto max-w-3xl pb-[calc(7.5rem+env(safe-area-inset-bottom))] lg:max-w-6xl lg:pb-8">
      <div className="mb-4">
        <Link
          to={backTo}
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500"
        >
          <ArrowLeft size={15} />
          Back
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Add new member
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {trainerMode
            ? `${user.branchName || 'Your branch'} · * required`
            : 'Fill each step · * required'}
        </p>
      </div>

      {/* Live summary strip — mobile */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:hidden">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
            {photoPreview ? (
              <img src={photoPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-300">
                <Camera size={18} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{memberName || 'New member'}</p>
            <p className="truncate text-xs text-slate-500">
              {selectedPlan ? `${selectedPlan.name} · ₹${selectedPlan.price}` : 'No plan yet'}
              {' · '}
              {trainerMode ? user.branchName || 'Branch' : selectedBranch?.name || 'No branch'}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Photo: {photoPreview ? 'Ready' : 'Needed'}
              {assignedTrainer?.name ? ` · ${assignedTrainer.name}` : ''}
            </p>
          </div>
        </div>
      </div>

      <form
        id="admission-form"
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6"
        noValidate
      >
        <div className="space-y-4">
          {/* Photo — first on mobile */}
          <Section icon={Camera} step="01" title="Profile photo" description="Clear front-facing portrait.">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-dashed bg-slate-50 sm:h-28 sm:w-28',
                  photoError ? 'border-red-400' : 'border-slate-300'
                )}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Member preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center">
                    <Camera size={18} className="text-slate-400" />
                    <p className="text-[10px] font-medium text-slate-500">Required</p>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-xs leading-5 text-slate-500">
                  Tap open camera, capture a clear face photo, then confirm.
                </p>
                {photoError ? <p className="text-xs text-red-600">{photoError}</p> : null}
                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white"
                >
                  <Camera size={16} />
                  {photoPreview ? 'Retake photo' : 'Open camera'}
                </button>
                {photoPreview ? (
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-200 text-sm font-medium text-slate-600"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </Section>

          <Section
            icon={UserRound}
            step="02"
            title="Personal details"
            description="Identity and contact details."
          >
            <FieldGrid>
              <div className="sm:col-span-2">
                <FormField label="Full name" required error={errors.name?.message}>
                  <input
                    placeholder="Rahul Sharma"
                    autoComplete="name"
                    {...register('name', {
                      required: 'Full name is required',
                      minLength: { value: 2, message: 'Enter at least 2 characters' },
                    })}
                  />
                </FormField>
              </div>

              <div>
                <FormField
                  label="Mobile"
                  required
                  error={errors.phone?.message || (existingByPhone ? 'Already registered' : undefined)}
                >
                  <input
                    placeholder="9876543210"
                    inputMode="tel"
                    autoComplete="tel"
                    {...register('phone', {
                      required: 'Mobile number is required',
                      validate: (value) =>
                        isValidPhone(value) || 'Enter a valid 10-digit Indian mobile number',
                    })}
                  />
                </FormField>
                <ExistingMemberCard
                  member={existingByPhone}
                  matchedOn="mobile number"
                  onEdit={openExistingMember}
                />
              </div>

              <div>
                <FormField
                  label="Email"
                  required
                  error={errors.email?.message || (existingByEmail ? 'Already registered' : undefined)}
                >
                  <input
                    type="email"
                    placeholder="member@email.com"
                    inputMode="email"
                    autoComplete="email"
                    {...register('email', {
                      required: 'Email is required',
                      validate: (value) => isValidEmail(value) || 'Enter a valid email address',
                    })}
                  />
                </FormField>
                {existingByEmail &&
                (!existingByPhone || String(existingByEmail._id) !== String(existingByPhone._id)) ? (
                  <ExistingMemberCard
                    member={existingByEmail}
                    matchedOn="email"
                    onEdit={openExistingMember}
                  />
                ) : existingByEmail &&
                  existingByPhone &&
                  String(existingByEmail._id) === String(existingByPhone._id) ? (
                  <p className="mt-2 text-xs text-amber-700">
                    Same member matches this email.{' '}
                    <button
                      type="button"
                      className="font-medium text-brand-700 underline"
                      onClick={() => openExistingMember(existingByEmail)}
                    >
                      Update
                    </button>
                  </p>
                ) : null}
              </div>

              <FormField label="Date of birth">
                <input type="date" {...register('dateOfBirth')} />
              </FormField>

              <FormField label="Gender">
                <select {...register('gender')}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </FormField>

              <FormField label="Emergency contact" error={errors.emergencyContact?.message}>
                <input
                  placeholder="Parent / guardian phone"
                  inputMode="tel"
                  {...register('emergencyContact', {
                    validate: (value) =>
                      !value ||
                      isValidPhone(value) ||
                      'Enter a valid 10-digit Indian mobile number',
                  })}
                />
              </FormField>

              <div className="sm:col-span-2">
                <FormField label="Address">
                  <input placeholder="Street, city, pincode" {...register('address')} />
                </FormField>
              </div>
            </FieldGrid>
          </Section>

          <Section
            icon={CreditCard}
            step="03"
            title="Membership"
            description="Choose a plan. Expiry can auto-calculate."
          >
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                Plan <span className="text-red-600">*</span>
              </p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
                {activePlans.map((plan) => {
                  const selected = membershipPlanId === plan._id;
                  return (
                    <button
                      key={plan._id}
                      type="button"
                      onClick={() => setValue('membershipPlanId', plan._id, { shouldValidate: true })}
                      className={cn(
                        'w-full rounded-2xl border px-3.5 py-3.5 text-left transition',
                        selected
                          ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-500/20'
                          : 'border-slate-200 bg-white'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">{plan.name}</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">₹{plan.price}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {plan.durationValue} {plan.durationUnit}
                          </p>
                        </div>
                        {selected ? (
                          <Check size={16} className="mt-0.5 shrink-0 text-brand-700" />
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
              <input
                type="hidden"
                {...register('membershipPlanId', { required: 'Select a membership plan' })}
              />
              {errors.membershipPlanId?.message ? (
                <p className="mt-2 text-xs text-red-600">{errors.membershipPlanId.message}</p>
              ) : null}
            </div>

            <FieldGrid>
              <FormField label="Start date" required error={errors.startDate?.message}>
                <input type="date" {...register('startDate', { required: 'Start date is required' })} />
              </FormField>
              <FormField label="Expiry (optional)">
                <input type="date" {...register('expiryDate')} />
              </FormField>
            </FieldGrid>

            {paymentsEnabled ? (
              <FieldGrid>
                <FormField label="Payment method" required error={errors.paymentMethod?.message}>
                  <select
                    {...register('paymentMethod', {
                      required: paymentsEnabled ? 'Select cash or online' : false,
                    })}
                  >
                    <option value="">Select payment</option>
                    <option value="cash">Cash</option>
                    <option value="online">Online</option>
                  </select>
                </FormField>
                <FormField label="Amount (₹)">
                  <input type="number" min="0" step="1" inputMode="numeric" {...register('paymentAmount')} />
                </FormField>
                {paymentMethod === 'online' ? (
                  <div className="sm:col-span-2">
                    <FormField label="Online reference / UPI (optional)">
                      <input placeholder="UPI txn ID or last 4 of card" {...register('paymentReference')} />
                    </FormField>
                  </div>
                ) : null}
                <p className="text-xs text-slate-500 sm:col-span-2">
                  Payment records are visible only to the gym owner.
                </p>
              </FieldGrid>
            ) : null}
          </Section>

          <Section
            icon={MapPin}
            step="04"
            title="Branch & trainer"
            description={
              trainerMode
                ? 'Branch is fixed. Choose who will coach this member.'
                : 'Select branch first, then trainers.'
            }
          >
            <FieldGrid>
              {trainerMode ? (
                <FormField label="Branch" required>
                  <input value={user.branchName || 'Assigned branch'} disabled className="bg-slate-50" />
                </FormField>
              ) : (
                <FormField label="Branch" required error={errors.branchId?.message}>
                  <select {...register('branchId', { required: 'Branch is required' })}>
                    <option value="">Select branch</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}

              <FormField label="Added by">
                <input
                  value={trainerMode ? user.name : addedByTrainer?.name || 'Owner'}
                  disabled
                  className="bg-slate-50"
                />
              </FormField>

              {!trainerMode ? (
                <FormField label="Added by trainer">
                  <select {...register('createdByTrainerId')} disabled={!branchId}>
                    <option value="">Owner</option>
                    {trainers.map((t) => (
                      <option key={t._id} value={t._id}>
                        {trainerOptionLabel(t)}
                      </option>
                    ))}
                  </select>
                </FormField>
              ) : null}

              <FormField label="Assigned trainer">
                <select {...register('assignedTrainerId')} disabled={!trainerMode && !branchId}>
                  <option value="">Select trainer</option>
                  {trainers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {trainerOptionLabel(t)}
                    </option>
                  ))}
                </select>
              </FormField>
            </FieldGrid>
          </Section>

          <Section
            icon={ClipboardList}
            step="05"
            title="Fitness profile"
            description="Helps trainers personalize coaching."
          >
            <FieldGrid>
              <FormField label="Height">
                <input placeholder="e.g. 175 cm" {...register('height')} />
              </FormField>
              <FormField label="Weight">
                <input placeholder="e.g. 72 kg" {...register('weight')} />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Fitness goal">
                  <input placeholder="Weight loss, strength, flexibility..." {...register('fitnessGoal')} />
                </FormField>
              </div>
              <div className="sm:col-span-2">
                <FormField label="Health issue" required error={errors.healthIssue?.message}>
                  <input
                    placeholder="None, asthma, diabetes, knee pain..."
                    {...register('healthIssue', { required: 'Health issue is required' })}
                  />
                </FormField>
              </div>
              <div className="sm:col-span-2">
                <FormField label="Remarks">
                  <input placeholder="Any medical notes or preferences" {...register('remarks')} />
                </FormField>
              </div>
            </FieldGrid>
          </Section>
        </div>

        {/* Desktop sidebar summary */}
        <aside className="hidden space-y-4 lg:block lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Admission summary
              </p>
              <h2 className="text-base font-semibold text-slate-900">Quick review</h2>
            </div>
            <div className="space-y-3 p-5 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Member</span>
                <span className="text-right font-medium text-slate-900">{memberName || '—'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Branch</span>
                <span className="text-right font-medium text-slate-900">
                  {trainerMode ? user.branchName || 'Assigned branch' : selectedBranch?.name || '—'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Plan</span>
                <span className="text-right font-medium text-slate-900">
                  {selectedPlan ? `${selectedPlan.name} · ₹${selectedPlan.price}` : '—'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Start</span>
                <span className="text-right font-medium text-slate-900">{startDate || '—'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Trainer</span>
                <span className="inline-flex items-center gap-1 font-medium text-slate-900">
                  <Dumbbell size={14} className="text-slate-400" />
                  {assignedTrainer?.name || '—'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Photo</span>
                <span className={cn('font-medium', photoPreview ? 'text-brand-700' : 'text-red-600')}>
                  {photoPreview ? 'Captured' : 'Required'}
                </span>
              </div>
            </div>
            <div className="border-t border-slate-100 p-4">
              <button
                type="submit"
                disabled={!canSubmit}
                className="min-h-11 w-full rounded-xl bg-slate-900 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? 'Saving admission...' : 'Create admission'}
              </button>
              <Link
                to={backTo}
                className="mt-2 flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
              >
                Cancel
              </Link>
            </div>
          </div>
        </aside>
      </form>

      {/* Mobile sticky actions — above bottom nav */}
      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Link
            to={backTo}
            className="flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700"
          >
            Cancel
          </Link>
          <button
            type="submit"
            form="admission-form"
            disabled={!canSubmit}
            className="flex min-h-12 flex-[1.5] items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save member'}
          </button>
        </div>
      </div>

      <CameraCapture
        open={cameraOpen}
        title="Capture member photo"
        onClose={() => setCameraOpen(false)}
        onCapture={handlePhotoCapture}
      />

      <EditMemberModal
        open={!!editingMember}
        member={editingMember}
        allowAssignTrainer
        onClose={() => setEditingMember(null)}
        onSaved={applyUpdatedMember}
      />
    </div>
  );
}
