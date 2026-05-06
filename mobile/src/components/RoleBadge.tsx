import { StyleSheet, Text, View } from 'react-native'
import { useThemeColors } from '../theme/colors'
import type { UserRole } from '../types/auth'

export function RoleBadge({ role }: { role: UserRole }) {
  const colors = useThemeColors()
  const styles = getStyles(colors)

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{role}</Text>
    </View>
  )
}

const getStyles = (colors: any) => StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary + '33', // 20% opacity
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  text: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})
