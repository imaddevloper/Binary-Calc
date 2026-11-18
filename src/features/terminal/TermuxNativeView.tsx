import { Platform, requireNativeComponent } from 'react-native';
import type { ViewProps } from 'react-native';

export interface TermuxNativeViewProps extends ViewProps {
  fontSize?: number;
  autoStart?: boolean;
}

export const TermuxNativeView =
  Platform.OS === 'android'
    ? requireNativeComponent<TermuxNativeViewProps>('EmbeddedTermuxView')
    : null;
