import { Pressable, StyleSheet, Text, View } from 'react-native'
import { RoleBadge } from '../components/RoleBadge'
import { Screen } from '../components/Screen'
import { useAuth } from '../context/AuthContext'
import { colors } from '../theme/colors'

export function ClientDashboardScreen() {
  const { user, logout } = useAuth()

  if (!user) {
    return null
  }

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Espace client</Text>
        <Text style={styles.title}>Suivi de vos demandes FTTH</Text>
        <Text style={styles.subtitle}>
          Retrouvez vos tickets, l etat des interventions et les prochaines actions sans passer par
          le dashboard web.
        </Text>
      </View>

      <View style={styles.card}>
        <RoleBadge role={user.role} />
        <Text style={styles.cardTitle}>
          Bienvenue {user.prenom} {user.nom}
        </Text>
        <Text style={styles.detail}>Email: {user.email}</Text>
        <Text style={styles.detail}>Telephone: {user.telephone ?? 'Non renseigne'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Parcours mobile cible</Text>
        <Text style={styles.listItem}>1. Declarer une demande d intervention.</Text>
        <Text style={styles.listItem}>2. Consulter la liste des tickets.</Text>
        <Text style={styles.listItem}>3. Suivre le statut et les notifications.</Text>
      </View>

      <Pressable style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Nouvelle demande</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => void logout()}>
        <Text style={styles.secondaryButtonText}>Se deconnecter</Text>
      </Pressable>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    gap: 10,
    marginTop: 12,
    marginBottom: 18,
  },
  eyebrow: {
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 20,
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    lineHeight: 28,
    color: colors.text,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  detail: {
    color: colors.muted,
    lineHeight: 22,
  },
  listItem: {
    color: colors.text,
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
})
