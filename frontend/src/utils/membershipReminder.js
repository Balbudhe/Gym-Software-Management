const daysUntil = (expiryDate) => {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry - today) / 86400000);
};

export const canSendMembershipReminder = (member) => {
  if (!member || member.status === 'inactive') return false;
  if (!member.email && !member.phone) return false;
  const days =
    typeof member.daysUntilExpiry === 'number' ? member.daysUntilExpiry : daysUntil(member.expiryDate);
  if (typeof days !== 'number') {
    return member.membershipStatus === 'expired' || member.status === 'expired';
  }
  return days <= 7;
};
