import type { PropsWithChildren, ReactElement } from 'react'
import { ScrollView, StyleSheet, type RefreshControlProps, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../theme/colors'

type ScreenProps = PropsWithChildren<{
  scrollable?: boolean
  refreshControl?: ReactElement<RefreshControlProps>
}>

export function Screen({ children, scrollable = false, refreshControl }: ScreenProps) {
  const content = <View style={styles.content}>{children}</View>

  return (
    <SafeAreaView style={styles.safeArea}>
      {scrollable ? (
        <ScrollView contentContainerStyle={styles.scroll} refreshControl={refreshControl}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
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
