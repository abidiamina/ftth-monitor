const prisma = require('../config/prisma');

const listNotifications = async (req, res) => {
  try {
    const lu = req.query.lu;
    const where = {
      userId: req.user.id,
    };

    if (lu === 'true' || lu === 'false') {
      where.lu = lu === 'true';
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: notifications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la recuperation des notifications.' });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ success: false, message: 'ID notification invalide.' });
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Notification introuvable.' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { lu: true },
    });

    res.json({ success: true, data: updated, message: 'Notification marquee comme lue.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise a jour de la notification.' });
  }
};

module.exports = {
  listNotifications,
  markNotificationAsRead,
};
