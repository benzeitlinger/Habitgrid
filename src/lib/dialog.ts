import { Alert, Platform } from 'react-native';

/**
 * react-native-web ships `Alert.alert` as an empty function, so on web a
 * confirmation would silently do nothing. Route through the browser's own
 * dialogs there and keep the native ones on the phone.
 */

export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function confirmDestructive(
  title: string,
  message: string,
  confirmLabel: string
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
