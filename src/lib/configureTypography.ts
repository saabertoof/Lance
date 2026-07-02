import { Text, TextInput, type StyleProp, type TextStyle } from 'react-native';

import { fontFamilies } from '@/constants/fonts';

type TextComponentWithDefaults = typeof Text & {
  defaultProps?: { style?: StyleProp<TextStyle> };
};

type TextInputComponentWithDefaults = typeof TextInput & {
  defaultProps?: { style?: StyleProp<TextStyle> };
};

let configured = false;

export function configureTypographyDefaults() {
  if (configured) return;
  configured = true;

  const textComponent = Text as TextComponentWithDefaults;
  const textInputComponent = TextInput as TextInputComponentWithDefaults;
  const defaultTextStyle = { fontFamily: fontFamilies.sans };

  textComponent.defaultProps = textComponent.defaultProps ?? {};
  textComponent.defaultProps.style = [
    defaultTextStyle,
    textComponent.defaultProps.style ?? {},
  ];

  textInputComponent.defaultProps = textInputComponent.defaultProps ?? {};
  textInputComponent.defaultProps.style = [
    defaultTextStyle,
    textInputComponent.defaultProps.style ?? {},
  ];
}
