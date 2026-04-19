const prisma = require('../config/prisma');

async function getConfig(cle, defaultValue = null) {
  try {
    const config = await prisma.configuration.findUnique({
      where: { cle },
    });
    return config ? config.valeur : defaultValue;
  } catch (err) {
    console.error(`Error fetching config ${cle}:`, err);
    return defaultValue;
  }
}

async function getConfigAsBoolean(cle, defaultValue = false) {
  const value = await getConfig(cle);
  if (value === null) return defaultValue;
  return value === 'true';
}

async function getConfigAsInt(cle, defaultValue = 0) {
  const value = await getConfig(cle);
  if (value === null) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

module.exports = {
  getConfig,
  getConfigAsBoolean,
  getConfigAsInt,
};
