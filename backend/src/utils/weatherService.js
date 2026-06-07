const axios = require('axios');

const OPENWEATHER_GEOCODE_URL = 'https://api.openweathermap.org/geo/1.0/direct';
const OPENWEATHER_CURRENT_URL = 'https://api.openweathermap.org/data/2.5/weather';
const OPENWEATHER_TIMEOUT_MS = Number(process.env.OPENWEATHER_TIMEOUT_MS || 6000);
const DEFAULT_COUNTRY = process.env.OPENWEATHER_COUNTRY || 'FR';

const normalizeCondition = (weatherMain = '', weatherDescription = '') => {
  const main = String(weatherMain || '').toLowerCase();
  const desc = String(weatherDescription || '').toLowerCase();
  const text = `${main} ${desc}`;
  if (text.includes('thunderstorm') || text.includes('orage')) return 'Orage';
  if (text.includes('rain') || text.includes('drizzle') || text.includes('pluie')) return 'Pluie';
  if (text.includes('snow') || text.includes('neige')) return 'Neige';
  if (text.includes('wind') || text.includes('vent')) return 'Venteux';
  return 'Degage';
};

const buildWeatherPayload = ({ lat, lon, temperature, condition, windSpeedKmh, precipitationMm }) => {
  const storm = condition === 'Orage' || windSpeedKmh >= 65;
  const raining = condition === 'Pluie';
  return {
    location: { lat, lon },
    temperature: Math.round(temperature),
    condition,
    riskLevel: storm ? 'Eleve' : (raining ? 'Moyen' : 'Faible'),
    description: storm
      ? 'Orages et rafales: risque fort de retard et incident.'
      : (raining ? 'Risque de glissade et retards possibles.' : 'Conditions ideales pour les interventions.'),
    icon: storm ? 'cloud-lightning' : (raining ? 'cloud-rain' : 'sun'),
    windSpeedKmh,
    precipitationMm,
    storm,
    source: 'openweather',
  };
};

const zoneToPseudoCoords = (zone) => {
  const text = String(zone || 'PARIS');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  const lat = 36 + (Math.abs(hash) % 1200) / 100; // 36.00 -> 47.99
  const lon = -8 + (Math.abs(hash >> 3) % 1800) / 100; // -8.00 -> 9.99
  return { lat, lon };
};

const buildMockWeather = ({ zone, latitude, longitude }) => {
  const pseudo = zoneToPseudoCoords(zone);
  const lat = Number.isFinite(latitude) ? latitude : pseudo.lat;
  const lon = Number.isFinite(longitude) ? longitude : pseudo.lon;
  const tempBase = 15 + (Math.sin(lat) * 10);
  const isRaining = (lat + lon) % 3 > 2;
  const windSpeedKmh = Math.round(10 + (Math.abs(Math.cos(lon)) * 55));
  const precipitationMm = isRaining ? Math.round((2 + Math.abs(Math.sin(lat + lon)) * 18) * 10) / 10 : 0;
  const condition = isRaining && windSpeedKmh >= 45 ? 'Orage' : (isRaining ? 'Pluie' : 'Degage');
  const payload = buildWeatherPayload({
    lat,
    lon,
    temperature: tempBase,
    condition,
    windSpeedKmh,
    precipitationMm,
  });
  return { ...payload, source: 'mock' };
};

const resolveInput = (arg1, arg2) => {
  if (typeof arg1 === 'object' && arg1 !== null) {
    return {
      zone: arg1.zone || null,
      latitude: Number(arg1.latitude),
      longitude: Number(arg1.longitude),
      country: arg1.country || DEFAULT_COUNTRY,
    };
  }
  return {
    zone: null,
    latitude: Number(arg1),
    longitude: Number(arg2),
    country: DEFAULT_COUNTRY,
  };
};

/**
 * GET WEATHER DATA (Récupération Météo)
 * Objectif : Fournir les données météorologiques pour le modèle de Machine Learning IA.
 * 
 * Logique pour la soutenance :
 * 1. Géolocalisation : Transforme le nom de la ville ou l'adresse en Coordonnées GPS (Lat/Lon) via l'API de Géocodage OpenWeather.
 * 2. Appel API Externe : Récupère les données météo réelles en temps réel (Température, Vitesse du Vent, Pluviométrie).
 * 3. Sécurité (Fallback) : Si l'API Météo est indisponible, bascule automatiquement sur un générateur mock (buildMockWeather) pour ne pas bloquer le système d'IA.
 * 4. Harmonisation : Formate les données pour l'algorithme "Random Forest" des pannes.
 */
const getWeatherData = async (arg1, arg2) => {
  const { zone, latitude, longitude, country } = resolveInput(arg1, arg2);
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return buildMockWeather({ zone, latitude, longitude });
  }

  try {
    let lat = latitude;
    let lon = longitude;

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      const q = zone ? `${zone},${country}` : `Paris,${country}`;
      const geoResponse = await axios.get(OPENWEATHER_GEOCODE_URL, {
        params: { q, limit: 1, appid: apiKey },
        timeout: OPENWEATHER_TIMEOUT_MS,
      });
      const geo = Array.isArray(geoResponse.data) ? geoResponse.data[0] : null;
      if (!geo) throw new Error(`No geocode result for ${q}`);
      lat = geo.lat;
      lon = geo.lon;
    }

    const weatherResponse = await axios.get(OPENWEATHER_CURRENT_URL, {
      params: { lat, lon, appid: apiKey, units: 'metric', lang: 'fr' },
      timeout: OPENWEATHER_TIMEOUT_MS,
    });

    const data = weatherResponse.data || {};
    const main = data.main || {};
    const wind = data.wind || {};
    const rain = data.rain || {};
    const snow = data.snow || {};
    const weather0 = Array.isArray(data.weather) ? data.weather[0] || {} : {};
    const condition = normalizeCondition(weather0.main, weather0.description);
    const windSpeedKmh = Number.isFinite(wind.speed) ? Math.round(wind.speed * 3.6) : 10;
    const precipitationMm = Number.isFinite(rain['1h']) ? rain['1h'] : (Number.isFinite(snow['1h']) ? snow['1h'] : 0);

    return buildWeatherPayload({
      lat,
      lon,
      temperature: Number.isFinite(main.temp) ? main.temp : 18,
      condition,
      windSpeedKmh,
      precipitationMm,
    });
  } catch (error) {
    return buildMockWeather({ zone, latitude, longitude });
  }
};

module.exports = { getWeatherData };
