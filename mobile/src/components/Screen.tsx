import { useEffect, useRef, type PropsWithChildren, type ReactElement } from 'react'
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from '../theme/colors'

type ScreenProps = PropsWithChildren<{
  scrollable?: boolean
  scrollEnabled?: boolean
  refreshControl?: ReactElement<RefreshControlProps>
}>

export function Screen({
  children,
  scrollable = false,
  scrollEnabled = true,
  refreshControl,
}: ScreenProps) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(12)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [opacity, translateY])

  const content = (
    <Animated.View style={[styles.content, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  )

  return (
    <SafeAreaView style={styles.safeArea}>
      <View pointerEvents='none' style={styles.backdropTop} />
      <View pointerEvents='none' style={styles.backdropBottom} />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        {scrollable ? (
          <ScrollView
            contentContainerStyle={styles.scroll}
            refreshControl={refreshControl}
            scrollEnabled={scrollEnabled}
            keyboardShouldPersistTaps='handled'
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  backdropTop: {
    position: 'absolute',
    top: -90,
    right: -60,
    width: 250,
    height: 250,
    borderRadius: 999,
    backgroundColor: '#d8ecff',
  },
  backdropBottom: {
    position: 'absolute',
    bottom: -130,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: '#dcfbf5',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 40,
  },
})
