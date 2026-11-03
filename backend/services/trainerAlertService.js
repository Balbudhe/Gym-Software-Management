const { sendOwnerAlertEmail } = require('./emailService');
const { safeSendSms, isSmsConfigured } = require('./smsService');
const { isTextbeeConfigured, safeSendTextbeeSms } = require('./textbeeService');
const { locationLabel, mapsUrl, GEOFENCE_METERS } = require('../utils/geoLocation');

const formatWhen = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const ownerEmail = (gym) => gym?.email || '';
const ownerPhone = (gym) => String(gym?.phone || '').trim();

const sendOwnerSms = async ({ gym, message }) => {
  const to = ownerPhone(gym);
  if (!to) {
    console.warn('Owner SMS skipped: gym phone is not set');
    return false;
  }
  if (isTextbeeConfigured()) {
    const result = await safeSendTextbeeSms({ to, message });
    return Boolean(result?.sent);
  }
  if (isSmsConfigured()) {
    return safeSendSms({ to, message });
  }
  console.warn('Owner SMS skipped: TextBee / SMS provider is not configured');
  return false;
};

const notifyTrainerLeftGym = async ({ gym, trainer, attendance, currentLocation, distance }) => {
  const name = trainer?.name || 'A trainer';
  const meters = distance != null ? `${Math.round(distance)} m` : 'an unknown distance';
  const checkInPlace = locationLabel(attendance.checkInLocation);
  const currentPlace = locationLabel(currentLocation);
  const subject = `Alert: ${name} left the gym during shift`;
  const text = `${name} moved away from their check-in location.\n\nCheck-in: ${formatWhen(attendance.checkInTime)}\nCheck-in location: ${checkInPlace}\nCurrent location: ${currentPlace}\nDistance: ${meters}\nDetected at: ${formatWhen(new Date())}\n`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      <p><strong>${name}</strong> moved away from their check-in location during an open shift.</p>
      <p><strong>Check-in:</strong> ${formatWhen(attendance.checkInTime)}<br/>
      <strong>Check-in location:</strong> ${checkInPlace}<br/>
      ${mapsUrl(attendance.checkInLocation) ? `<a href="${mapsUrl(attendance.checkInLocation)}">View check-in on map</a><br/>` : ''}
      <strong>Current location:</strong> ${currentPlace}<br/>
      ${mapsUrl(currentLocation) ? `<a href="${mapsUrl(currentLocation)}">View current location on map</a><br/>` : ''}
      <strong>Distance:</strong> ${meters}<br/>
      <strong>Detected at:</strong> ${formatWhen(new Date())}</p>
    </div>
  `;
  const sms = `${name} left check-in area (>${GEOFENCE_METERS}m). Distance now: ${meters}. Location: ${currentPlace}. ${mapsUrl(currentLocation) || ''}`.trim();

  await Promise.all([
    sendOwnerAlertEmail({ to: ownerEmail(gym), subject, html, text }).catch((error) => {
      console.error('Owner leave-gym email failed:', error.message);
    }),
    sendOwnerSms({ gym, message: sms }),
  ]);
};

const notifyTrainerLoggedOutDuringShift = async ({ gym, trainer, attendance, reason }) => {
  const name = trainer?.name || 'A trainer';
  const subject = `Alert: ${name} logged out during shift`;
  const reasonLabel = reason === 'session-expired' ? 'session ended or expired' : 'logged out without checking out';
  const text = `${name} ${reasonLabel}.\n\nCheck-in: ${formatWhen(attendance.checkInTime)}\nCheck-in location: ${locationLabel(attendance.checkInLocation)}\nTime: ${formatWhen(new Date())}\n`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
      <p><strong>${name}</strong> ${reasonLabel} while still checked in.</p>
      <p><strong>Check-in:</strong> ${formatWhen(attendance.checkInTime)}<br/>
      <strong>Check-in location:</strong> ${locationLabel(attendance.checkInLocation)}<br/>
      ${mapsUrl(attendance.checkInLocation) ? `<a href="${mapsUrl(attendance.checkInLocation)}">View check-in on map</a><br/>` : ''}
      <strong>Time:</strong> ${formatWhen(new Date())}</p>
      <p>They have not checked out yet.</p>
    </div>
  `;
  const sms = `${name} ${reasonLabel} while still checked in (${formatWhen(new Date())}).`;

  await Promise.all([
    sendOwnerAlertEmail({ to: ownerEmail(gym), subject, html, text }).catch((error) => {
      console.error('Owner logout email failed:', error.message);
    }),
    sendOwnerSms({ gym, message: sms }),
  ]);
};

const safeNotify = async (fn) => {
  try {
    await fn();
  } catch (error) {
    console.error('Trainer owner alert failed:', error.message);
  }
};

module.exports = {
  notifyTrainerLeftGym,
  notifyTrainerLoggedOutDuringShift,
  safeNotify,
};
