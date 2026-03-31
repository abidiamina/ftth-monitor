const prisma = require('../config/prisma');
const { sendPushNotifications } = require('./pushNotificationService');

const buildNotificationPayload = ({ titre, message, interventionId, userId }) => ({
  titre,
  message,
  interventionId,
  userId,
});

const createNotification = async (payload) => {
  const notification = await prisma.notification.create({
    data: buildNotificationPayload(payload),
  });

  const user = await prisma.utilisateur.findUnique({
    where: { id: payload.userId },
    select: { pushToken: true },
  });

  await sendPushNotifications([
    {
      to: user?.pushToken,
      title: payload.titre,
      body: payload.message,
      data: {
        interventionId: payload.interventionId ?? null,
        screen: 'Dashboard',
      },
    },
  ]);

  return notification;
};

const createNotifications = async (payloads = []) => {
  if (!Array.isArray(payloads) || payloads.length === 0) {
    return;
  }

  await prisma.notification.createMany({
    data: payloads.map(buildNotificationPayload),
  });

  const users = await prisma.utilisateur.findMany({
    where: {
      id: { in: [...new Set(payloads.map((payload) => payload.userId))] },
    },
    select: { id: true, pushToken: true },
  });

  const pushTokenByUserId = new Map(users.map((user) => [user.id, user.pushToken]));

  await sendPushNotifications(
    payloads.map((payload) => ({
      to: pushTokenByUserId.get(payload.userId),
      title: payload.titre,
      body: payload.message,
      data: {
        interventionId: payload.interventionId ?? null,
        screen: 'Dashboard',
      },
    }))
  );
};

module.exports = {
  createNotification,
  createNotifications,
};
