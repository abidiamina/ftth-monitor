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
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: colors.text,
  },
  cardSubtitle: {
    marginTop: 8,
    color: colors.muted,
    lineHeight: 22,
  },
  content: {
    marginTop: 18,
    gap: 10,
  },
})
