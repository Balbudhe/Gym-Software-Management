const { sendOwnerAlertEmail } = require('./emailService');
const { locationLabel, mapsUrl } = require('../utils/geoLocation');

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
  await sendOwnerAlertEmail({ to: ownerEmail(gym), subject, html, text });
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
  await sendOwnerAlertEmail({ to: ownerEmail(gym), subject, html, text });
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
