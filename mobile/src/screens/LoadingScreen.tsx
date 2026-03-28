import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Screen } from '../components/Screen'
import { colors } from '../theme/colors'

export function LoadingScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>FTTH Monitor</Text>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>Chargement de la session...</Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  text: {
    color: colors.muted,
    fontSize: 15,
  },
})
