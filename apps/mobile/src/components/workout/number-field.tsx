import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { BrandFonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * A compact numeric input. Keeps its own text while typing (so "102." stays put) and reports
 * a number, or null when empty. Remount it (change its key) to show a value set from outside.
 */
export function NumberField({
  value,
  onChange,
  placeholder,
  decimals = false,
  accessibilityLabel,
  done,
}: {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  placeholder?: string;
  decimals?: boolean;
  accessibilityLabel: string;
  done?: boolean;
}) {
  const theme = useTheme();
  const [text, setText] = useState(value == null ? '' : String(value));

  return (
    <TextInput
      accessibilityLabel={accessibilityLabel}
      value={text}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
      returnKeyType="done"
      selectTextOnFocus
      onChangeText={(t) => {
        const cleaned = t.replace(',', '.').replace(decimals ? /[^0-9.]/g : /[^0-9]/g, '');
        setText(cleaned);
        if (cleaned === '' || cleaned === '.') onChange(null);
        else if (!Number.isNaN(Number(cleaned))) onChange(Number(cleaned));
      }}
      style={[
        styles.input,
        {
          color: theme.text,
          borderColor: done ? theme.accent : theme.backgroundSelected,
          backgroundColor: theme.background,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    minWidth: 64,
    textAlign: 'center',
    fontSize: 17,
    fontFamily: BrandFonts.medium,
  },
});
