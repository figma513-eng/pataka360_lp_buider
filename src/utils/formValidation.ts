import type {
  CatalogCustomerField,
  CustomFieldInputType,
  FormRequiredRule,
} from '../types/builder.ts';

export const DYNAMIC_FORM_FIELD_TYPE_LABELS: Record<CustomFieldInputType, string> = {
  text: 'Teks',
  textarea: 'Teks Panjang',
  name: 'Nama',
  phone: 'Nomor Telepon',
  tel: 'Nomor Telepon',
  email: 'Email',
  number: 'Angka',
  date: 'Tanggal',
  time: 'Waktu',
  select: 'Pilihan Dropdown',
  radio: 'Pilihan Tunggal',
  checkbox_group: 'Pilihan Ganda',
  file: 'Unggah File',
  address: 'Alamat',
  section: 'Deskripsi / Bagian',
};

export const DYNAMIC_FORM_FIELD_TYPES: { value: CustomFieldInputType; label: string }[] = [
  { value: 'text', label: 'Teks' },
  { value: 'textarea', label: 'Teks Panjang' },
  { value: 'name', label: 'Nama' },
  { value: 'phone', label: 'Nomor Telepon' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Angka' },
  { value: 'date', label: 'Tanggal' },
  { value: 'time', label: 'Waktu' },
  { value: 'select', label: 'Pilihan Dropdown' },
  { value: 'radio', label: 'Pilihan Tunggal' },
  { value: 'checkbox_group', label: 'Pilihan Ganda' },
  { value: 'file', label: 'Unggah File' },
  { value: 'address', label: 'Alamat' },
  { value: 'section', label: 'Deskripsi / Bagian' },
];

export const FORM_REQUIRED_RULE_LABELS: Record<FormRequiredRule, string> = {
  optional: 'Opsional (Tidak Wajib)',
  required_fill: 'Wajib mengisi kolom',
  required_one: 'Wajib memilih salah satu',
  required_multi: 'Wajib memilih beberapa pilihan',
  required_consent_specific: 'Wajib mencentang persetujuan tertentu',
  required_consent_all: 'Wajib mencentang seluruh persetujuan',
  required_min_choices: 'Wajib memenuhi jumlah minimum pilihan',
};

export function resolveFieldRequiredRule(field: CatalogCustomerField): FormRequiredRule {
  if (field.requiredRule) return field.requiredRule;
  if (!field.required) return 'optional';
  if (field.type === 'select' || field.type === 'radio') return 'required_one';
  if (field.type === 'checkbox_group') return 'required_multi';
  return 'required_fill';
}

export function isFieldVisiblyActive(
  field: CatalogCustomerField,
  values: Record<string, string | string[] | boolean | undefined>
): boolean {
  if (!field.conditionalFieldId || !field.conditionalFieldId.trim()) return true;
  const targetVal = values[field.conditionalFieldId];
  const expected = (field.conditionalValue ?? '').trim().toLowerCase();
  if (!expected) {
    if (Array.isArray(targetVal)) return targetVal.length > 0;
    if (typeof targetVal === 'boolean') return targetVal;
    return String(targetVal ?? '').trim().length > 0;
  }
  if (Array.isArray(targetVal)) {
    return targetVal.some((v) => String(v).trim().toLowerCase() === expected);
  }
  return String(targetVal ?? '').trim().toLowerCase() === expected;
}

export function validateSingleFormField(
  field: CatalogCustomerField,
  rawValue: string | string[] | boolean | undefined,
  allValues: Record<string, string | string[] | boolean | undefined> = {}
): string | null {
  if (field.type === 'section') return null;
  if (!isFieldVisiblyActive(field, allValues)) return null;

  const rule = resolveFieldRequiredRule(field);
  const label = field.label?.trim() || 'Kolom ini';
  const customErr = field.errorMessage?.trim();

  if (field.type === 'checkbox_group') {
    const selected = Array.isArray(rawValue)
      ? rawValue.map((s) => String(s).trim()).filter(Boolean)
      : typeof rawValue === 'string' && rawValue.trim()
      ? [rawValue.trim()]
      : [];
    const options = Array.isArray(field.options) ? field.options.filter((o) => o.trim()) : [];

    if (rule === 'required_one' && selected.length === 0) {
      return customErr || `Wajib memilih salah satu pada "${label}".`;
    }
    if (rule === 'required_multi' && selected.length === 0) {
      return customErr || `Wajib memilih minimal satu pilihan pada "${label}".`;
    }
    if (rule === 'required_min_choices') {
      const minC = Math.max(1, Number(field.minChoices || 1));
      if (selected.length < minC) {
        return customErr || `"${label}" wajib memilih minimal ${minC} pilihan.`;
      }
    }
    if (rule === 'required_consent_all') {
      if (options.length > 0 && selected.length < options.length) {
        return customErr || `Wajib mencentang seluruh persetujuan pada "${label}".`;
      }
    }
    if (rule === 'required_consent_specific') {
      const requiredIdxs =
        Array.isArray(field.requiredOptionIndexes) && field.requiredOptionIndexes.length > 0
          ? field.requiredOptionIndexes
          : [0];
      for (const idx of requiredIdxs) {
        const reqLabel = options[idx];
        if (reqLabel && !selected.includes(reqLabel)) {
          return customErr || `Wajib mencentang persetujuan "${reqLabel}".`;
        }
      }
    }
    if (rule === 'required_fill' && selected.length === 0) {
      return customErr || `Kolom "${label}" wajib diisi.`;
    }
    return null;
  }

  const strVal =
    typeof rawValue === 'string'
      ? rawValue.trim()
      : Array.isArray(rawValue)
      ? rawValue.join(', ').trim()
      : typeof rawValue === 'boolean'
      ? rawValue
        ? 'Ya'
        : ''
      : '';

  if (rule !== 'optional' && !strVal) {
    if (rule === 'required_one') {
      return customErr || `Wajib memilih salah satu pada "${label}".`;
    }
    return customErr || `Kolom "${label}" wajib diisi.`;
  }

  if (!strVal) return null;

  if (field.type === 'email') {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRe.test(strVal)) {
      return customErr || `Format email pada "${label}" tidak valid.`;
    }
  }

  if (field.type === 'phone' || field.type === 'tel') {
    const digits = strVal.replace(/[^\d]/g, '');
    if (digits.length < 8 || digits.length > 16) {
      return customErr || `Nomor telepon pada "${label}" harus terdiri dari 8–16 digit.`;
    }
  }

  if (field.type === 'number') {
    const num = Number(strVal);
    if (!Number.isFinite(num)) {
      return customErr || `Kolom "${label}" harus berupa angka yang valid.`;
    }
    if (typeof field.minValue === 'number' && num < field.minValue) {
      return customErr || `Nilai "${label}" minimal ${field.minValue}.`;
    }
    if (typeof field.maxValue === 'number' && num > field.maxValue) {
      return customErr || `Nilai "${label}" maksimal ${field.maxValue}.`;
    }
  }

  if (typeof field.minLength === 'number' && field.minLength > 0 && strVal.length < field.minLength) {
    return customErr || `"${label}" minimal ${field.minLength} karakter.`;
  }
  if (typeof field.maxLength === 'number' && field.maxLength > 0 && strVal.length > field.maxLength) {
    return customErr || `"${label}" maksimal ${field.maxLength} karakter.`;
  }

  if (field.pattern && field.pattern.trim()) {
    try {
      const re = new RegExp(field.pattern.trim());
      if (!re.test(strVal)) {
        return customErr || `Format isian "${label}" belum sesuai ketentuan.`;
      }
    } catch {
      // Abaikan regex tidak valid
    }
  }

  return null;
}

export interface FormValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  firstError: string | null;
}

export function validateChecklistRule(params: {
  title: string;
  items: string[];
  checkedItems: string[];
  rule?: FormRequiredRule;
  legacyRequired?: boolean;
  minChoices?: number;
  requiredOptionIndexes?: number[];
}): string | null {
  const items = params.items.map((x) => x.trim()).filter(Boolean);
  if (items.length === 0) return null;
  const checked = params.checkedItems.map((x) => x.trim()).filter(Boolean);
  const rule: FormRequiredRule =
    params.rule || (params.legacyRequired ? 'required_consent_all' : 'optional');

  if (rule === 'optional') return null;
  if (rule === 'required_one' || rule === 'required_multi' || rule === 'required_fill') {
    if (checked.length === 0) {
      return `Wajib memilih minimal satu item pada "${params.title || 'Persetujuan'}".`;
    }
    return null;
  }
  if (rule === 'required_min_choices') {
    const minC = Math.max(1, Number(params.minChoices || 1));
    if (checked.length < minC) {
      return `"${params.title || 'Persetujuan'}" wajib mencentang minimal ${minC} pilihan.`;
    }
    return null;
  }
  if (rule === 'required_consent_specific') {
    const reqIdxs =
      Array.isArray(params.requiredOptionIndexes) && params.requiredOptionIndexes.length > 0
        ? params.requiredOptionIndexes
        : [0];
    for (const idx of reqIdxs) {
      const label = items[idx];
      if (label && !checked.includes(label)) {
        return `Wajib mencentang persetujuan "${label}".`;
      }
    }
    return null;
  }
  // required_consent_all
  if (checked.length < items.length) {
    return `Wajib mencentang seluruh persetujuan pada "${params.title || 'Persetujuan'}".`;
  }
  return null;
}

export function validateDynamicFormSubmission(params: {
  fields: CatalogCustomerField[];
  values: Record<string, string | string[] | boolean | undefined>;
  checklist?: {
    enabled?: boolean;
    title?: string;
    items?: string[];
    checkedItems?: string[];
    rule?: FormRequiredRule;
    legacyRequired?: boolean;
    minChoices?: number;
  };
}): FormValidationResult {
  const errors: Record<string, string> = {};

  for (const field of params.fields) {
    const err = validateSingleFormField(field, params.values[field.id], params.values);
    if (err) {
      errors[field.id] = err;
    }
  }

  if (params.checklist?.enabled && Array.isArray(params.checklist.items) && params.checklist.items.length > 0) {
    const checklistErr = validateChecklistRule({
      title: params.checklist.title || 'Persetujuan',
      items: params.checklist.items,
      checkedItems: params.checklist.checkedItems || [],
      rule: params.checklist.rule,
      legacyRequired: params.checklist.legacyRequired,
      minChoices: params.checklist.minChoices,
    });
    if (checklistErr) {
      errors.__checklist = checklistErr;
    }
  }

  const firstKey = Object.keys(errors)[0];
  return {
    valid: !firstKey,
    errors,
    firstError: firstKey ? errors[firstKey] : null,
  };
}

export function formatFormSummaryLines(
  fields: CatalogCustomerField[],
  values: Record<string, string | string[] | boolean | undefined>
): string {
  const lines: string[] = [];
  for (const f of fields) {
    if (f.type === 'section') continue;
    if (!isFieldVisiblyActive(f, values)) continue;
    const val = values[f.id];
    const formatted = Array.isArray(val)
      ? val.join(', ')
      : typeof val === 'boolean'
      ? val
        ? 'Ya'
        : 'Tidak'
      : String(val ?? '').trim();
    if (formatted) {
      lines.push(`${f.label}: ${formatted}`);
    }
  }
  return lines.join('\n');
}
