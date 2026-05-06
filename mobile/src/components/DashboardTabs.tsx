import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useThemeColors } from '../theme/colors'

type TabItem<T extends string> = {
  key: T
  label: string
}

type DashboardTabsProps<T extends string> = {
  tabs: TabItem<T>[]
  activeTab: T
  onChange: (tab: T) => void
}

export function DashboardTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
}: DashboardTabsProps<T>) {
  const colors = useThemeColors()
  const styles = getStyles(colors)
  
  return (
    <View style={styles.wrapper}>
      {tabs.map((tab) => {
        const active = tab.key === activeTab
        return (
          <Pressable
            key={tab.key}
            style={({ pressed }) => [
              styles.tab,
              active ? styles.tabActive : null,
              pressed ? styles.tabPressed : null,
            ]}
            onPress={() => onChange(tab.key)}
          >
            <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>{tab.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const getStyles = (colors: any) => StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 6,
    gap: 6,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  tabActive: {
    backgroundColor: colors.primarySoft,
  },
  tabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  tabText: {
    color: colors.muted,
    fontWeight: '700',
    fontSize: 12,
  },
  tabTextActive: {
    color: colors.primary,
  },
})
