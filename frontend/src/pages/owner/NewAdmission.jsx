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
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import FormField from '../../components/forms/FormField';
import CameraCapture from '../../components/attendance/CameraCapture';
import { cn } from '../../utils/format';
import { trainerOptionLabel } from '../../utils/batches';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_PATTERN = /^(?:\+91[\s-]?)?[6-9]\d{9}$/;

const isValidPhone = (value) => PHONE_PATTERN.test(String(value || '').trim());
const isValidEmail = (value) => EMAIL_PATTERN.test(String(value || '').trim());

function Section({ icon: Icon, step, title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Step {step}
          </p>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
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

  const branchId = watch('branchId');
  const membershipPlanId = watch('membershipPlanId');
  const assignedTrainerId = watch('assignedTrainerId');
  const createdByTrainerId = watch('createdByTrainerId');
  const memberName = watch('name');
  const startDate = watch('startDate');
  const paymentMethod = watch('paymentMethod');
  const paymentsEnabled = Boolean(user?.paymentsEnabled);

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
      toast.push(error.response?.data?.message || 'Could not create admission', 'error');
    } finally {
      setSaving(false);
    }
  };

  const backTo = trainerMode ? '/trainer/members' : '/owner/members';

  return (
    <div className="mx-auto max-w-6xl pb-28 lg:pb-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to={backTo}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={15} />
            Back to members
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">New member admission</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            {trainerMode
              ? `Admitting into ${user.branchName || 'your assigned branch'}. Fields marked * are required.`
              : 'Fields marked * are required. Use a valid email, phone, and capture a profile photo.'}
          </p>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <Link
            to={backTo}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
          >
            Cancel
          </Link>
          <button
            type="submit"
            form="admission-form"
            disabled={saving}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            {saving ? 'Saving admission...' : 'Create admission'}
          </button>
        </div>
      </div>

      <form
        id="admission-form"
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
        noValidate
      >
        <div className="space-y-5">
          <Section
            icon={UserRound}
            step="01"
            title="Personal information"
            description="Identity and contact details for the new member."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Full name" required error={errors.name?.message}>
                <input
                  placeholder="Rahul Sharma"
                  {...register('name', {
                    required: 'Full name is required',
                    minLength: { value: 2, message: 'Enter at least 2 characters' },
                  })}
                />
              </FormField>
              <FormField label="Mobile" required error={errors.phone?.message}>
                <input
                  placeholder="9876543210"
                  inputMode="tel"
                  {...register('phone', {
                    required: 'Mobile number is required',
                    validate: (value) =>
                      isValidPhone(value) || 'Enter a valid 10-digit Indian mobile number',
                  })}
                />
              </FormField>
              <FormField label="Email" required error={errors.email?.message}>
                <input
                  type="email"
                  placeholder="member@email.com"
                  {...register('email', {
                    required: 'Email is required',
                    validate: (value) => isValidEmail(value) || 'Enter a valid email address',
                  })}
                />
              </FormField>
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
            </div>
          </Section>

          <Section
            icon={CreditCard}
            step="02"
            title="Membership"
            description="Pick a gym-wide plan. Expiry can be left blank to calculate automatically."
          >
            <p className="mb-3 text-sm font-medium text-slate-700">
              Membership plan <span className="text-red-600">*</span>
            </p>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              {activePlans.map((plan) => {
                const selected = membershipPlanId === plan._id;
                return (
                  <button
                    key={plan._id}
                    type="button"
                    onClick={() => setValue('membershipPlanId', plan._id, { shouldValidate: true })}
                    className={cn(
                      'rounded-xl border px-4 py-4 text-left transition',
                      selected
                        ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    )}
                  >
                    <p className="text-sm font-semibold text-slate-900">{plan.name}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">₹{plan.price}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {plan.durationValue} {plan.durationUnit}
                    </p>
                  </button>
                );
              })}
            </div>
            <input
              type="hidden"
              {...register('membershipPlanId', { required: 'Select a membership plan' })}
            />
            {errors.membershipPlanId?.message ? (
              <p className="mb-3 text-xs text-red-600">{errors.membershipPlanId.message}</p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Start date" required error={errors.startDate?.message}>
                <input type="date" {...register('startDate', { required: 'Start date is required' })} />
              </FormField>
              <FormField label="Expiry date (optional)">
                <input type="date" {...register('expiryDate')} />
              </FormField>
            </div>
            {paymentsEnabled ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                  <input type="number" min="0" step="1" {...register('paymentAmount')} />
                </FormField>
                {paymentMethod === 'online' ? (
                  <div className="sm:col-span-2">
                    <FormField label="Online reference / UPI ID (optional)">
                      <input placeholder="UPI txn ID or last 4 of card" {...register('paymentReference')} />
                    </FormField>
                  </div>
                ) : null}
                <p className="sm:col-span-2 text-xs text-slate-500">
                  Payment records are visible only to the gym owner.
                </p>
              </div>
            ) : null}
          </Section>

          <Section
            icon={MapPin}
            step="03"
            title="Branch & trainers"
            description={
              trainerMode
                ? 'Branch is fixed to your assignment. Choose who will coach this member.'
                : 'Select a branch first. Only trainers from that branch can be assigned.'
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
          </Section>

          <Section
            icon={ClipboardList}
            step="04"
            title="Fitness profile"
            description="Optional details that help trainers personalize coaching."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Height">
                <input placeholder="e.g. 175 cm" {...register('height')} />
              </FormField>
              <FormField label="Weight">
                <input placeholder="e.g. 72 kg" {...register('weight')} />
              </FormField>
              <FormField label="Fitness goal">
                <input placeholder="Weight loss, strength, flexibility..." {...register('fitnessGoal')} />
              </FormField>
              <FormField label="Health issue" required error={errors.healthIssue?.message}>
                <input
                  placeholder="None, asthma, diabetes, knee pain..."
                  {...register('healthIssue', { required: 'Health issue is required' })}
                />
              </FormField>
              <FormField label="Remarks">
                <input placeholder="Any medical notes or preferences" {...register('remarks')} />
              </FormField>
            </div>
          </Section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Member photo
              </p>
              <h2 className="text-base font-semibold text-slate-900">
                Profile capture <span className="text-red-600">*</span>
              </h2>
            </div>
            <div className="p-5">
              <div
                className={cn(
                  'relative mx-auto aspect-[3/4] max-w-[220px] rounded-2xl border border-dashed bg-slate-50',
                  photoError ? 'border-red-400' : 'border-slate-300'
                )}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Member preview" className="h-full w-full rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                      <Camera size={20} />
                    </div>
                    <p className="text-sm font-medium text-slate-700">Photo required</p>
                    <p className="text-xs text-slate-500">Capture a clear front-facing portrait</p>
                  </div>
                )}
              </div>
              {photoError ? <p className="mt-2 text-center text-xs text-red-600">{photoError}</p> : null}
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
                >
                  <Camera size={16} />
                  {photoPreview ? 'Retake photo' : 'Open camera'}
                </button>
                {photoPreview ? (
                  <button
                    type="button"
                    onClick={clearPhoto}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600"
                  >
                    Remove photo
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Admission summary
              </p>
              <h2 className="text-base font-semibold text-slate-900">Quick review</h2>
            </div>
            <div className="space-y-3 p-5 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500">Member</span>
                <span className="text-right font-medium text-slate-900">{memberName || '—'}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500">Branch</span>
                <span className="text-right font-medium text-slate-900">
                  {trainerMode ? user.branchName || 'Assigned branch' : selectedBranch?.name || '—'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500">Plan</span>
                <span className="text-right font-medium text-slate-900">
                  {selectedPlan ? `${selectedPlan.name} · ₹${selectedPlan.price}` : '—'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500">Start</span>
                <span className="text-right font-medium text-slate-900">{startDate || '—'}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500">Assigned trainer</span>
                <span className="inline-flex items-center gap-1 text-right font-medium text-slate-900">
                  <Dumbbell size={14} className="text-slate-400" />
                  {assignedTrainer?.name || '—'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500">Photo</span>
                <span className={cn('font-medium', photoPreview ? 'text-brand-700' : 'text-red-600')}>
                  {photoPreview ? 'Captured' : 'Required'}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </form>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl gap-2">
          <Link
            to={backTo}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700"
          >
            Cancel
          </Link>
          <button
            type="submit"
            form="admission-form"
            disabled={saving}
            className="flex-[1.4] rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
          >
            {saving ? 'Saving...' : 'Create admission'}
          </button>
        </div>
      </div>

      <CameraCapture
        open={cameraOpen}
        title="Capture member photo"
        onClose={() => setCameraOpen(false)}
        onCapture={handlePhotoCapture}
      />
    </div>
  );
}
