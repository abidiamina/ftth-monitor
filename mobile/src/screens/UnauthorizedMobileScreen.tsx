import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Screen } from '../components/Screen'
import { useAuth } from '../context/AuthContext'
import { colors } from '../theme/colors'

export function UnauthorizedMobileScreen() {
  const { user, logout } = useAuth()

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Acces reserve au mobile terrain</Text>
        <Text style={styles.text}>
          Le mobile FTTH est prevu pour les techniciens et les clients. Les comptes admin et
          responsable doivent utiliser le dashboard web.
        </Text>
        {user ? <Text style={styles.meta}>Compte connecte: {user.email}</Text> : null}
        <Pressable style={styles.button} onPress={() => void logout()}>
          <Text style={styles.buttonText}>Retour a la connexion</Text>
        </Pressable>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: colors.text,
  },
  text: {
    color: colors.muted,
    lineHeight: 24,
    fontSize: 16,
  },
  meta: {
    color: colors.text,
    fontWeight: '600',
  },
  button: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
})
