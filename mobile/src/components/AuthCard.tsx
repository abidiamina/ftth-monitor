import type { PropsWithChildren } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme/colors'

type AuthCardProps = PropsWithChildren<{
  title: string
  subtitle: string
}>

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: colors.text,
  },
  cardSubtitle: {
    marginTop: 6,
    color: colors.muted,
    lineHeight: 23,
    fontSize: 16,
  },
  content: {
    marginTop: 16,
    gap: 12,
  },
})
