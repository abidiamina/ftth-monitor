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
    await login({ email: email.trim(), motDePasse })
  }

  return (
    <Screen scrollable>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Application mobile</Text>
        <Text style={styles.title}>Clients et techniciens FTTH</Text>
        <Text style={styles.subtitle}>
          Le mobile sert aux clients pour suivre leurs demandes et aux techniciens pour gerer les
          interventions terrain.
        </Text>
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

        <Pressable style={styles.button} onPress={handleLogin} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Se connecter</Text>
          )}
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.secondaryButtonText}>Creer un compte client</Text>
        </Pressable>

        <Text style={styles.help}>
          Les comptes admin et responsable utilisent le dashboard web. Pense aussi a definir
          `EXPO_PUBLIC_API_BASE_URL` selon ton emulateur ou ton telephone.
        </Text>
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
  help: {
    marginTop: 8,
    color: colors.muted,
    lineHeight: 20,
  },
})
