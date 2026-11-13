import { Directory, File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';

export async function saveCsv(filename, content) {
  if (!await isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
  const directory = new Directory(Paths.cache, 'eventora-reports');
  directory.create({ idempotent: true });
  const file = new File(directory, filename);
  file.create({ overwrite: true });
  file.write(content);
  await shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: 'Export event summary',
  });
}
