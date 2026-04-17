import { useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { AuthCard } from '../components/AuthCard'
import { AuthField } from '../components/AuthField'
import { Screen } from '../components/Screen'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { colors } from '../theme/colors'
import { useAuth } from '../context/AuthContext'

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>

export function LoginScreen({ navigation }: LoginScreenProps) {
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('Password123')

  const handleLogin = async () => {
    try {
      await login({ email: email.trim(), motDePasse })
    } catch {
      // L alerte est deja geree dans le contexte d authentification.
    }
  }

  return (
    <Screen scrollable>
      <View style={styles.hero}>
        <Text style={styles.kicker}>FTTH Mobile</Text>
        <Text style={styles.title}>Plateforme Intelligente de Monitoring et d'Optimisation des Interventions FTTH</Text>
        <Text style={styles.subtitle}>Connexion client et technicien.</Text>
      </View>

      <AuthCard
        title="Connexion"
        subtitle="Accede a ton espace client ou a ton espace technicien avec le meme backend que le web."
      >
        <AuthField
          label="Email"
          value={email}
          placeholder="nom@gmail.com"
          keyboardType="email-address"
          autoCapitalize="none"
          onChangeText={setEmail}
        />
        <AuthField
          label="Mot de passe"
          value={motDePasse}
          placeholder="Password123"
          secureTextEntry
          autoCapitalize="none"
          onChangeText={setMotDePasse}
        />

        <Pressable
          style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Se connecter</Text>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed ? styles.secondaryButtonPressed : null,
          ]}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.secondaryButtonText}>Creer un compte client</Text>
        </Pressable>

        <Text style={styles.help}>Inscription reservee aux clients.</Text>
      </AuthCard>
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: {
    marginTop: 10,
    marginBottom: 20,
    gap: 8,
  },
  kicker: {
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    color: colors.primary,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 26,
    color: colors.muted,
  },
  button: {
    marginTop: 12,
    backgroundColor: colors.info,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    shadowColor: colors.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  buttonPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.95,
  },
  secondaryButton: {
    marginTop: 10,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#f8fbff',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButtonPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.95,
  },
  help: {
    marginTop: 8,
    color: colors.muted,
    lineHeight: 20,
    fontSize: 13,
  },
})
