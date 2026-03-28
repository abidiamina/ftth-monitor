import { StyleSheet, Text, TextInput, View } from 'react-native'
import { colors } from '../theme/colors'

type AuthFieldProps = {
  label: string
  value: string
  placeholder: string
  onChangeText: (value: string) => void
  secureTextEntry?: boolean
  keyboardType?: 'default' | 'email-address' | 'phone-pad'
  autoCapitalize?: 'none' | 'sentences' | 'words'
}

export function AuthField({
  label,
  value,
  placeholder,
  onChangeText,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: AuthFieldProps) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={styles.input}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 8,
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.muted,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fbfdff',
    color: colors.text,
  },
})
