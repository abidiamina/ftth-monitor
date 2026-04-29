/**
 * Weather Service (Mock for Sprint 4)
 * In a real scenario, this would call OpenWeatherMap or a similar API.
 */
const getWeatherData = async (latitude, longitude) => {
  // Mock data based on coordinates
  // If no coords provided, use a default (e.g. Paris or some location in France)
  const lat = latitude || 48.8566;
  const lon = longitude || 2.3522;

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Return realistic looking data
  // We can "generate" some variability based on coordinates
  const tempBase = 15 + (Math.sin(lat) * 10);
  const isRaining = (lat + lon) % 3 > 2;

  return {
    location: { lat, lon },
    temperature: Math.round(tempBase),
    condition: isRaining ? 'Pluie' : 'Dégagé',
    riskLevel: isRaining ? 'Moyen' : 'Faible',
    description: isRaining ? 'Risque de glissade et retards possibles.' : 'Conditions idéales pour les interventions.',
    icon: isRaining ? 'cloud-rain' : 'sun',
  };
};

module.exports = { getWeatherData };
