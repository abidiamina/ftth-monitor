import { StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme/colors'
import type { UserRole } from '../types/auth'

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{role}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
})
