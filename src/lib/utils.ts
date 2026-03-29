export function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('Failed to parse JSON:', error, 'Input:', json);
    return fallback;
  }
}

export function cn(...classes: (string | undefined | boolean | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function renderPropertyValue(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object' && !Array.isArray(val)) {
    if (val.type === 'created_time') return val.created_time || '';
    if (val.type === 'last_edited_time') return val.last_edited_time || '';
    if (val.type === 'date') return val.date?.start || '';
    if (val.type === 'select') return val.select?.name || '';
    if (val.type === 'multi_select') return val.multi_select?.map((s: any) => s.name).join(', ') || '';
    if (val.type === 'rich_text') return val.rich_text?.map((t: any) => t.plain_text).join('') || '';
    if (val.type === 'title') return val.title?.map((t: any) => t.plain_text).join('') || '';
    if (val.type === 'number') return val.number?.toString() || '';
    if (val.type === 'checkbox') return val.checkbox ? 'true' : 'false';
    if (val.type === 'url') return val.url || '';
    if (val.type === 'email') return val.email || '';
    if (val.type === 'phone_number') return val.phone_number || '';
    if (val.type === 'status') return val.status?.name || '';
    if (val.created_time && typeof val.created_time === 'string') return val.created_time;
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) return val.map(v => renderPropertyValue(v)).join(', ');
  return String(val);
}
