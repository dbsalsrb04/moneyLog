export const BACKUP_PICKER_ID = 'moneylog-json-backup';

type BackupFilePicker = (options: {
  id: string;
  multiple: boolean;
  excludeAcceptAllOption: boolean;
  types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<{ getFile: () => Promise<File> }[]>;

export async function pickBackupFile(): Promise<
  { status: 'selected'; file: File } | { status: 'cancelled' | 'unsupported' }
> {
  const picker = (window as Window & { showOpenFilePicker?: BackupFilePicker }).showOpenFilePicker;
  if (!window.isSecureContext || typeof picker !== 'function') return { status: 'unsupported' };
  let handles: Awaited<ReturnType<BackupFilePicker>>;
  try {
    // The browser remembers a separate recent directory for this origin and ID.
    handles = await picker.call(window, {
      id: BACKUP_PICKER_ID,
      multiple: false,
      excludeAcceptAllOption: true,
      types: [{ description: 'MoneyLog JSON 백업', accept: { 'application/json': ['.json'] } }],
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return { status: 'cancelled' };
    if (error instanceof DOMException && ['SecurityError', 'NotSupportedError'].includes(error.name)) return { status: 'unsupported' };
    throw error;
  }
  if (!handles.length) return { status: 'cancelled' };
  return { status: 'selected', file: await handles[0].getFile() };
}
