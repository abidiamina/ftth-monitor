const axios = require('axios');

const expoPushEndpoint = 'https://exp.host/--/api/v2/push/send';

const isExpoPushToken = (value) =>
  typeof value === 'string' &&
  (value.startsWith('ExponentPushToken[') || value.startsWith('ExpoPushToken['));

const sendPushNotifications = async (messages = []) => {
  const validMessages = messages.filter(
    (message) => isExpoPushToken(message.to) && message.title && message.body
  );

  if (validMessages.length === 0) {
    return;
  }

  try {
    await axios.post(expoPushEndpoint, validMessages, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 10000,
    });
  } catch (error) {
    console.error('Erreur lors de l envoi des notifications push.', error.message);
  }
};

module.exports = {
  isExpoPushToken,
  sendPushNotifications,
};
