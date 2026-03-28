import type { PropsWithChildren } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../theme/colors'

type ScreenProps = PropsWithChildren<{
  scrollable?: boolean
}>

export function Screen({ children, scrollable = false }: ScreenProps) {
  const content = <View style={styles.content}>{children}</View>

  return (
    <SafeAreaView style={styles.safeArea}>
      {scrollable ? <ScrollView contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
})
