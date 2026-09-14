import { Platform } from 'react-native';
import { BackupData } from '../domain/types';

/**
 * Share or download the backup JSON file
 */
export async function shareBackupFile(backup: BackupData): Promise<boolean> {
  const jsonString = JSON.stringify(backup, null, 2);
  const fileName = `aevia-backup-${new Date().toISOString().split('T')[0]}.json`;

  if (Platform.OS === 'web') {
    // Web download via blob
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }

  try {
    const FileSystem = await import('expo-file-system');
    const Sharing = await import('expo-sharing');

    const docDir = (FileSystem as any).documentDirectory ?? '';
    const fileUri = `${docDir}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, jsonString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export AEVIA Backup',
        UTI: 'public.json',
      });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Prompt user to select a JSON backup file to import.
 * Returns null ONLY when the user cancels. Corrupt/unparseable files throw
 * INVALID_BACKUP so the UI can distinguish cancel (silent) from corruption
 * (explicit "Invalid Backup" alert).
 */
export class InvalidBackupError extends Error {
  constructor(message = 'Backup file is not valid JSON.') {
    super(message);
    this.name = 'InvalidBackupError';
  }
}

export async function pickBackupFile(): Promise<any | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const text = await file.text();
        try {
          resolve(JSON.parse(text));
        } catch {
          resolve(new InvalidBackupError());
        }
      };
      input.click();
    });
  }

  try {
    const DocumentPicker = await import('expo-document-picker');
    const FileSystem = await import('expo-file-system');

    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return null;
    }

    const content = await FileSystem.readAsStringAsync(result.assets[0].uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    try {
      return JSON.parse(content);
    } catch {
      throw new InvalidBackupError();
    }
  } catch (error) {
    if (error instanceof InvalidBackupError) throw error;
    return null;
  }
}
