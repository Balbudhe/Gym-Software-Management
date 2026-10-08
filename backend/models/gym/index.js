const branchSchema = require('./Branch');
const userSchema = require('./User');
const trainerSchema = require('./Trainer');
const memberSchema = require('./Member');
const membershipPlanSchema = require('./MembershipPlan');
const membershipSchema = require('./Membership');
const trainerAttendanceSchema = require('./TrainerAttendance');
const membershipPaymentSchema = require('./MembershipPayment');
const auditLogSchema = require('./AuditLog');

const registerGymModels = (connection) => ({
  Branch: connection.models.Branch || connection.model('Branch', branchSchema),
  User: connection.models.User || connection.model('User', userSchema),
  Trainer: connection.models.Trainer || connection.model('Trainer', trainerSchema),
  Member: connection.models.Member || connection.model('Member', memberSchema),
  MembershipPlan:
    connection.models.MembershipPlan ||
    connection.model('MembershipPlan', membershipPlanSchema),
  Membership:
    connection.models.Membership || connection.model('Membership', membershipSchema),
  TrainerAttendance:
    connection.models.TrainerAttendance ||
    connection.model('TrainerAttendance', trainerAttendanceSchema),
  MembershipPayment:
    connection.models.MembershipPayment ||
    connection.model('MembershipPayment', membershipPaymentSchema),
  AuditLog: connection.models.AuditLog || connection.model('AuditLog', auditLogSchema),
});

module.exports = { registerGymModels };
