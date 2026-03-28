const prisma = require('../config/prisma');

const buildNotificationPayload = ({ titre, message, interventionId, userId }) => ({
  titre,
  message,
  interventionId,
  userId,
});

const createNotification = async (payload) => {
  return prisma.notification.create({
    data: buildNotificationPayload(payload),
  });
};

const createNotifications = async (payloads = []) => {
  if (!Array.isArray(payloads) || payloads.length === 0) {
    return;
  }

  await prisma.notification.createMany({
    data: payloads.map(buildNotificationPayload),
  });
};

module.exports = {
  createNotification,
  createNotifications,
};
