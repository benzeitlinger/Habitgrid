import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';

import { saveViaHost } from '@/lib/artifactHost';

/**
 * Writes `contents` to a file and hands it to the OS share sheet.
 * On web there is no share sheet, so it falls back to a download.
 */
export async function shareTextFile(filename: string, contents: string): Promise<void> {
  if (Platform.OS === 'web') {
    // Inside the artifact viewer a plain <a download> is inert, so ask the
    // host to save first and only fall back when there is no host.
    if (await saveViaHost(filename, contents)) return;

    const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(contents);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: filename,
    UTI: 'public.json',
  });
}

/** Opens the picker and returns the file's text, or null if cancelled. */
export async function pickTextFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];

  if (Platform.OS === 'web') {
    if (asset.file) return await asset.file.text();
    const response = await fetch(asset.uri);
    return await response.text();
  }

  return await new File(asset.uri).text();
}
