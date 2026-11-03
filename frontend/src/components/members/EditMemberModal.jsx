import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../common/Modal';
import FormField from '../forms/FormField';
import { statusBadge } from '../common/Badge';
import { formatDate } from '../../utils/format';
import { trainerOptionLabel } from '../../utils/batches';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_PATTERN = /^(?:\+91[\s-]?)?[6-9]\d{9}$/;

const isValidPhone = (value) => PHONE_PATTERN.test(String(value || '').trim());
const isValidEmail = (value) => EMAIL_PATTERN.test(String(value || '').trim());

const toDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

export default function EditMemberModal({
  open,
  member,
  onClose,
  onSaved,
  allowAssignTrainer = false,
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [trainers, setTrainers] = useState([]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (!open || !member) return;
    reset({
      name: member.name || '',
      phone: member.phone || '',
      email: member.email || '',
      dateOfBirth: toDateInput(member.dateOfBirth),
      gender: member.gender || '',
      address: member.address || '',
      emergencyContact: member.emergencyContact || '',
      height: member.height || '',
      weight: member.weight || '',
      fitnessGoal: member.fitnessGoal || '',
      healthIssue: member.healthIssue || '',
      remarks: member.remarks || '',
      assignedTrainerId: member.assignedTrainerId?._id || member.assignedTrainerId || '',
      status: member.status || 'active',
    });
  }, [open, member, reset]);

  useEffect(() => {
    if (!open || !member || !allowAssignTrainer) {
      setTrainers([]);
      return;
    }
    const branchId = member.branchId?._id || member.branchId;
    if (!branchId) return;
    api
      .get('/trainers', {
        params: { limit: 100, status: 'active' },
        headers: { 'X-Branch-Id': branchId },
      })
      .then(({ data }) => setTrainers(data.items || []))
      .catch(() => setTrainers([]));
  }, [open, member, allowAssignTrainer]);

  const onSubmit = async (values) => {
    if (!member?._id) return;
    setSaving(true);
    try {
      const payload = {
        name: values.name,
        phone: values.phone,
        email: values.email,
        dateOfBirth: values.dateOfBirth || null,
        gender: values.gender || '',
        address: values.address || '',
        emergencyContact: values.emergencyContact || '',
        height: values.height || '',
        weight: values.weight || '',
        fitnessGoal: values.fitnessGoal || '',
        healthIssue: values.healthIssue,
        remarks: values.remarks || '',
        status: values.status,
      };
      if (allowAssignTrainer) {
        payload.assignedTrainerId = values.assignedTrainerId || null;
      }

      const { data } = await api.put(`/members/${member._id}`, payload);
      toast.push('Member updated');
      onSaved?.(data.item);
      onClose?.();
    } catch (error) {
      toast.push(error.response?.data?.message || 'Could not update member', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!member) return null;

  return (
    <Modal open={open} title="Update member" onClose={onClose} wide>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span className="font-medium text-slate-900">{member.memberCode}</span>
        <span>·</span>
        <span>{member.branchId?.name || 'Branch'}</span>
        <span>·</span>
        {statusBadge(member.status === 'inactive' ? 'inactive' : member.membershipStatus || member.status)}
        <span className="text-slate-400">Expiry {formatDate(member.expiryDate)}</span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full name" required error={errors.name?.message}>
            <input
              {...register('name', {
                required: 'Full name is required',
                minLength: { value: 2, message: 'Enter at least 2 characters' },
              })}
            />
          </FormField>
          <FormField label="Mobile" required error={errors.phone?.message}>
            <input
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
              inputMode="tel"
              {...register('emergencyContact', {
                validate: (value) =>
                  !value || isValidPhone(value) || 'Enter a valid 10-digit Indian mobile number',
              })}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Address">
              <input {...register('address')} />
            </FormField>
          </div>
          <FormField label="Height">
            <input {...register('height')} />
          </FormField>
          <FormField label="Weight">
            <input {...register('weight')} />
          </FormField>
          <FormField label="Fitness goal">
            <input {...register('fitnessGoal')} />
          </FormField>
          <FormField label="Health issue" required error={errors.healthIssue?.message}>
            <input {...register('healthIssue', { required: 'Health issue is required' })} />
          </FormField>
          <FormField label="Remarks">
            <input {...register('remarks')} />
          </FormField>
          <FormField label="Status">
            <select {...register('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FormField>
          {allowAssignTrainer ? (
            <FormField label="Assigned trainer">
              <select {...register('assignedTrainerId')}>
                <option value="">Select trainer</option>
                {trainers.map((t) => (
                  <option key={t._id} value={t._id}>
                    {trainerOptionLabel(t)}
                  </option>
                ))}
              </select>
            </FormField>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-[1.4] rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
