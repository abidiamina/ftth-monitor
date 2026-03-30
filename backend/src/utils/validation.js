const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9\s\-()]{8,20}$/;
const INTERVENTION_PRIORITIES = ['BASSE', 'NORMALE', 'HAUTE', 'URGENTE'];
const INTERVENTION_STATUSES = ['EN_ATTENTE', 'EN_COURS', 'TERMINEE', 'ANNULEE'];

const normalizeText = (value) => value?.toString().trim() ?? '';

const isValidEmail = (value) => EMAIL_PATTERN.test(normalizeText(value).toLowerCase());

const isValidPhone = (value) => PHONE_PATTERN.test(normalizeText(value));

const validateRequiredText = (label, value, min = 2, max = 120) => {
  const normalized = normalizeText(value);

  if (!normalized) return `${label} est obligatoire.`;
  if (normalized.length < min) return `${label} doit contenir au moins ${min} caracteres.`;
  if (normalized.length > max) return `${label} ne doit pas depasser ${max} caracteres.`;
  return null;
};

const validateRegisterPayload = ({ nom, prenom, email, telephone, adresse, motDePasse }) => {
  const nameError =
    validateRequiredText('Le prenom', prenom, 2, 60) ??
    validateRequiredText('Le nom', nom, 2, 60);

  if (nameError) return nameError;
  if (!isValidEmail(email)) return 'Adresse email invalide.';
  if (!isValidPhone(telephone)) return 'Numero de telephone invalide.';

  const addressError = validateRequiredText('L adresse', adresse, 8, 255);
  if (addressError) return addressError;

  if (normalizeText(motDePasse).length < 8) {
    return 'Le mot de passe doit contenir au moins 8 caracteres.';
  }

  return null;
};

const validateLoginPayload = ({ email, motDePasse }) => {
  if (!normalizeText(email) || !normalizeText(motDePasse)) {
    return 'Email et mot de passe sont obligatoires.';
  }

  if (!isValidEmail(email)) {
    return 'Adresse email invalide.';
  }

  return null;
};

const validateEmployeePayload = ({ nom, prenom, email, telephone, role }, managedRoles) => {
  const nameError =
    validateRequiredText('Le prenom', prenom, 2, 60) ??
    validateRequiredText('Le nom', nom, 2, 60);

  if (nameError) return nameError;
  if (!isValidEmail(email)) return 'Adresse email invalide.';
  if (normalizeText(telephone) && !isValidPhone(telephone)) return 'Numero de telephone invalide.';
  if (!managedRoles.includes(normalizeText(role).toUpperCase())) {
    return 'Le role doit etre ADMIN, RESPONSABLE ou TECHNICIEN.';
  }

  return null;
};

const validateUserProfilePayload = ({ nom, prenom, email, telephone, adresse }, options = {}) => {
  const nameError =
    validateRequiredText('Le prenom', prenom, 2, 60) ??
    validateRequiredText('Le nom', nom, 2, 60);

  if (nameError) return nameError;
  if (email !== undefined && !isValidEmail(email)) return 'Adresse email invalide.';
  if (normalizeText(telephone) && !isValidPhone(telephone)) return 'Numero de telephone invalide.';

  if (options.requireAddress || adresse !== undefined) {
    const addressError = validateRequiredText('L adresse', adresse, 8, 255);
    if (addressError) return addressError;
  }

  return null;
};

const validatePasswordChangePayload = ({ motDePasseActuel, nouveauMotDePasse }) => {
  if (!normalizeText(motDePasseActuel) || !normalizeText(nouveauMotDePasse)) {
    return 'Le mot de passe actuel et le nouveau mot de passe sont obligatoires.';
  }

  if (normalizeText(nouveauMotDePasse).length < 8) {
    return 'Le nouveau mot de passe doit contenir au moins 8 caracteres.';
  }

  if (motDePasseActuel === nouveauMotDePasse) {
    return 'Le nouveau mot de passe doit etre different de l ancien.';
  }

  return null;
};

const validateInterventionPayload = (
  { titre, description, adresse, priorite, statut, datePlanifiee, clientId, technicienId },
  options = {}
) => {
  if (!options.partial || titre !== undefined) {
    const titleError = validateRequiredText('Le titre', titre, 5, 120);
    if (titleError) return titleError;
  }

  if (!options.partial || description !== undefined) {
    const descriptionError = validateRequiredText('La description', description, 15, 1500);
    if (descriptionError) return descriptionError;
  }

  if (!options.partial || adresse !== undefined) {
    const addressError = validateRequiredText('L adresse', adresse, 8, 255);
    if (addressError) return addressError;
  }

  if (priorite !== undefined && priorite !== null && !INTERVENTION_PRIORITIES.includes(priorite)) {
    return 'Priorite invalide.';
  }

  if (statut !== undefined && statut !== null && !INTERVENTION_STATUSES.includes(statut)) {
    return 'Statut invalide.';
  }

  if (options.requireClient && !normalizeText(clientId)) {
    return 'Le client cible est obligatoire.';
  }

  if (datePlanifiee !== undefined && datePlanifiee !== null && normalizeText(datePlanifiee)) {
    const parsed = new Date(datePlanifiee);
    if (Number.isNaN(parsed.getTime())) {
      return 'Date planifiee invalide.';
    }
  }

  if (technicienId !== undefined && technicienId !== null && normalizeText(technicienId)) {
    if (!Number.isInteger(Number(technicienId))) {
      return 'Technicien invalide.';
    }
  }

  if (clientId !== undefined && clientId !== null && normalizeText(clientId)) {
    if (!Number.isInteger(Number(clientId))) {
      return 'Client invalide.';
    }
  }

  return null;
};

module.exports = {
  normalizeText,
  validateRegisterPayload,
  validateLoginPayload,
  validateEmployeePayload,
  validateUserProfilePayload,
  validatePasswordChangePayload,
  validateInterventionPayload,
};
