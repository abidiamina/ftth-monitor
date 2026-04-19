import type {
  ChangePasswordRequest,
  CreateEmployeeRequest,
  CreateInterventionRequest,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  UpdateUserRequest,
} from '@/types/auth.types'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^\+?[0-9\s\-()]{8,20}$/

const normalizeText = (value: string | null | undefined) => value?.trim() ?? ''

export const isValidEmail = (value: string) => emailPattern.test(normalizeText(value).toLowerCase())

export const isValidPhone = (value: string) => phonePattern.test(normalizeText(value))

const validateRequiredText = (label: string, value: string, min = 2, max = 120) => {
  const normalized = normalizeText(value)

  if (!normalized) return `${label} est obligatoire.`
  if (normalized.length < min) return `${label} doit contenir au moins ${min} caracteres.`
  if (normalized.length > max) return `${label} ne doit pas depasser ${max} caracteres.`
  return null
}

export const validateLoginForm = (payload: LoginRequest) => {
  if (!normalizeText(payload.email) || !normalizeText(payload.motDePasse)) {
    return 'Renseigne ton email et ton mot de passe.'
  }

  if (!isValidEmail(payload.email)) {
    return 'Renseigne une adresse email valide.'
  }

  return null
}

export const validateRegisterForm = (
  payload: RegisterRequest & { confirmation: string }
) => {
  const nameError =
    validateRequiredText('Le prenom', payload.prenom, 2, 60) ??
    validateRequiredText('Le nom', payload.nom, 2, 60)

  if (nameError) return nameError

  if (!isValidEmail(payload.email)) {
    return 'Renseigne une adresse email valide.'
  }

  if (!isValidPhone(payload.telephone)) {
    return 'Renseigne un numero de telephone valide.'
  }

  const addressError = validateRequiredText('L adresse', payload.adresse, 8, 255)
  if (addressError) return addressError

  if (payload.motDePasse.trim().length < 8) {
    return 'Le mot de passe doit contenir au moins 8 caracteres.'
  }

  if (payload.motDePasse !== payload.confirmation) {
    return 'La confirmation du mot de passe ne correspond pas.'
  }

  return null
}

export const validateEmployeeForm = (payload: CreateEmployeeRequest) => {
  const nameError =
    validateRequiredText('Le prenom', payload.prenom, 2, 60) ??
    validateRequiredText('Le nom', payload.nom, 2, 60)

  if (nameError) return nameError

  if (!isValidEmail(payload.email)) {
    return 'Renseigne une adresse email valide.'
  }

  if (normalizeText(payload.telephone) && !isValidPhone(payload.telephone ?? '')) {
    return 'Renseigne un numero de telephone valide.'
  }

  return null
}

export const validateUserUpdateForm = (payload: UpdateUserRequest | UpdateProfileRequest) => {
  const nameError =
    validateRequiredText('Le prenom', payload.prenom, 2, 60) ??
    validateRequiredText('Le nom', payload.nom, 2, 60)

  if (nameError) return nameError

  if ('email' in payload && !isValidEmail(payload.email)) {
    return 'Renseigne une adresse email valide.'
  }

  if (normalizeText(payload.telephone) && !isValidPhone(payload.telephone ?? '')) {
    return 'Renseigne un numero de telephone valide.'
  }

  if ('role' in payload && payload.role === 'CLIENT' && !normalizeText(payload.telephone ?? '')) {
    return 'Le telephone est obligatoire pour un client.'
  }

  if ('role' in payload && payload.role === 'CLIENT') {
    const addressError = validateRequiredText('L adresse', payload.adresse ?? '', 8, 255)
    if (addressError) return addressError
  }

  return null
}

export const validatePasswordChangeForm = (payload: ChangePasswordRequest) => {
  if (!normalizeText(payload.motDePasseActuel) || !normalizeText(payload.nouveauMotDePasse)) {
    return 'Le mot de passe actuel et le nouveau mot de passe sont obligatoires.'
  }

  if (payload.nouveauMotDePasse.trim().length < 8) {
    return 'Le nouveau mot de passe doit contenir au moins 8 caracteres.'
  }

  if (payload.motDePasseActuel === payload.nouveauMotDePasse) {
    return 'Le nouveau mot de passe doit etre different de l ancien.'
  }

  return null
}

export const validateInterventionForm = (
  payload: CreateInterventionRequest,
  options?: { requireClient?: boolean }
) => {
  const titleError = validateRequiredText('Le titre', payload.titre, 5, 120)
  if (titleError) return titleError

  const descriptionError = validateRequiredText('La description', payload.description, 15, 1500)
  if (descriptionError) return descriptionError

  const addressError = validateRequiredText('L adresse', payload.adresse, 8, 255)
  if (addressError) return addressError

  if (options?.requireClient && !normalizeText(String(payload.clientId ?? ''))) {
    return 'Selectionne un client.'
  }

  return null
}

