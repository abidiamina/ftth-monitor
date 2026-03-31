import { useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { AuthCard } from '../components/AuthCard'
import { AuthField } from '../components/AuthField'
import { Screen } from '../components/Screen'
import { useAuth } from '../context/AuthContext'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { colors } from '../theme/colors'

type RegisterScreenProps = NativeStackScreenProps<RootStackParamList, 'Register'>

export function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { register, isLoading } = useAuth()
  const [form, setForm] = useState({
    prenom: '',
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    motDePasse: '',
    confirmation: '',
  })
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (
      !form.nom.trim() ||
      !form.prenom.trim() ||
      !form.email.trim() ||
      !form.telephone.trim() ||
      !form.adresse.trim() ||
      !form.motDePasse.trim()
    ) {
      setLocalError('Tous les champs sont obligatoires.')
      return
    }

    if (form.motDePasse.length < 8) {
      setLocalError('Le mot de passe doit contenir au moins 8 caracteres.')
      return
    }

    if (form.motDePasse !== form.confirmation) {
      setLocalError('La confirmation du mot de passe ne correspond pas.')
      return
    }

    setLocalError(null)

    try {
      await register({
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        email: form.email.trim(),
        telephone: form.telephone.trim(),
        adresse: form.adresse.trim(),
        motDePasse: form.motDePasse,
      })
    } catch {
      // L alerte est deja geree dans le contexte d authentification.
    }
  }

  return (
    <Screen scrollable>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Inscription client</Text>
        <Text style={styles.title}>Cree ton acces mobile</Text>
        <Text style={styles.subtitle}>
          Le client peut creer son compte directement depuis le mobile puis se connecter aussitot.
        </Text>
      </View>

      <AuthCard
        title="Creer mon compte"
        subtitle="On reprend les memes informations que le formulaire web pour garder un parcours coherent."
      >
        <View style={styles.row}>
          <View style={styles.half}>
            <AuthField
              label="Prenom"
              value={form.prenom}
              placeholder="Ayari"
              autoCapitalize="words"
              onChangeText={(value) => setForm((current) => ({ ...current, prenom: value }))}
            />
          </View>
          <View style={styles.half}>
            <AuthField
              label="Nom"
              value={form.nom}
              placeholder="Hatem"
              autoCapitalize="words"
              onChangeText={(value) => setForm((current) => ({ ...current, nom: value }))}
            />
          </View>
        </View>

        <AuthField
          label="Email"
          value={form.email}
          placeholder="hatem@gmail.com"
          keyboardType="email-address"
          autoCapitalize="none"
          onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
        />
        <AuthField
          label="Telephone"
          value={form.telephone}
          placeholder="+21612345678"
          keyboardType="phone-pad"
          autoCapitalize="none"
          onChangeText={(value) => setForm((current) => ({ ...current, telephone: value }))}
        />
        <AuthField
          label="Adresse"
          value={form.adresse}
          placeholder="Rue les palmes 2 Jendouba"
          onChangeText={(value) => setForm((current) => ({ ...current, adresse: value }))}
        />
        <AuthField
          label="Mot de passe"
          value={form.motDePasse}
          placeholder="jendouba123"
          secureTextEntry
          autoCapitalize="none"
          onChangeText={(value) => setForm((current) => ({ ...current, motDePasse: value }))}
        />
        <AuthField
          label="Confirmer le mot de passe"
          value={form.confirmation}
          placeholder="jendouba123"
          secureTextEntry
          autoCapitalize="none"
          onChangeText={(value) =>
            setForm((current) => ({ ...current, confirmation: value }))
          }
        />

        {localError ? <Text style={styles.error}>{localError}</Text> : null}

        <Pressable style={styles.button} onPress={handleSubmit} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Creer mon compte</Text>
          )}
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>J'ai deja un compte</Text>
        </Pressable>
      </AuthCard>
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: {
    marginTop: 24,
    marginBottom: 24,
    gap: 10,
  },
  kicker: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  error: {
    marginTop: 8,
    color: colors.danger,
    lineHeight: 20,
    fontWeight: '600',
  },
  button: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 10,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
})
