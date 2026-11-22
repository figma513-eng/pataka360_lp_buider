import type {
  CatalogCustomerField,
  CustomFieldInputType,
  FormRequiredRule,
} from '../types/builder.ts';

export type DynamicFormValues = Record<string, string | string[] | boolean | undefined>;

export const DYNAMIC_FORM_FIELD_TYPES: Array<{ value: CustomFieldInputType; label: string }> = [
  { value: 'text', label: 'Teks Singkat' },
  { value: 'textarea', label: 'Paragraf / Teks Panjang' },
  { value: 'name', label: 'Nama Lengkap' },
  { value: 'phone', label: 'Nomor Telepon / WA' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Angka' },
  { value: 'date', label: 'Tanggal' },
  { value: 'time', label: 'Waktu / Jam' },
  { value: 'select', label: 'Dropdown (Pilihan)' },
  { value: 'radio', label: 'Pilihan Tunggal (Radio)' },
  { value: 'checkbox_group', label: 'Pilihan Ganda (Checkbox)' },
  { value: 'file', label: 'Unggah Berkas' },
  { value: 'address', label: 'Alamat Lengkap' },
  { value: 'section', label: 'Judul Bagian / Pemisah' },
];

export const DYNAMIC_FORM_FIELD_TYPE_LABELS: Record<CustomFieldInputType, string> = {
  text: 'Teks Singkat',
  textarea: 'Paragraf / Teks Panjang',
  name: 'Nama Lengkap',
  phone: 'Nomor Telepon / WA',
  tel: 'Nomor Telepon / WA',
  email: 'Email',
  number: 'Angka',
  date: 'Tanggal',
  time: 'Waktu / Jam',
  select: 'Dropdown (Pilihan)',
  radio: 'Pilihan Tunggal (Radio)',
  checkbox_group: 'Pilihan Ganda (Checkbox)',
  file: 'Unggah Berkas',
  address: 'Alamat Lengkap',
  section: 'Judul Bagian / Pemisah',
};

export const FORM_REQUIRED_RULE_LABELS: Record<FormRequiredRule, string> = {
  optional: 'Opsional (Tidak Wajib)',
  required_fill: 'Wajib Diisi',
  required_one: 'Wajib Pilih Salah Satu',
  required_multi: 'Wajib Pilih Minimal Satu',
  required_min_choices: 'Wajib Pilih Minimal N Item',
  required_consent_specific: 'Wajib Centang Persetujuan Tertentu',
  required_consent_all: 'Wajib Centang Semua Persetujuan',
};

export function resolveFieldRequiredRule(field: CatalogCustomerField): FormRequiredRule {
  if (field.requiredRule) return field.requiredRule;
  return field.required ? 'required_fill' : 'optional';
}

export function isDynamicFormFieldVisible(
  field: CatalogCustomerField,
  values: DynamicFormValues
): boolean {
  if (!field.conditionalFieldId) return true;
  const parentVal = values[field.conditionalFieldId];
  const expected = (field.conditionalValue ?? '').trim().toLowerCase();
  if (!expected) {
    if (Array.isArray(parentVal)) return parentVal.length > 0;
    if (typeof parentVal === 'boolean') return parentVal;
    return String(parentVal ?? '').trim().length > 0;
  }
  if (Array.isArray(parentVal)) {
    return parentVal.some((v) => String(v).trim().toLowerCase() === expected);
  }
  return String(parentVal ?? '').trim().toLowerCase() === expected;
}

export function isFieldVisiblyActive(
  field: CatalogCustomerField,
  values: DynamicFormValues
): boolean {
  return isDynamicFormFieldVisible(field, values);
}

export function isValidPhoneOrWhatsapp(
  raw: string,
  format: 'general' | 'whatsapp' = 'general'
): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  if (!/^[+\d\s\-().]+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/[^\d]/g, '');
  if (format === 'whatsapp') {
    const normalized = trimmed.replace(/[\s\-().]/g, '');
    if (digits.length < 10 || digits.length > 15) return false;
    return /^(08|628|\+628|8)\d+$/.test(normalized);
  }
  return digits.length >= 8 && digits.length <= 16;
}

export function validateDynamicFormField(
  field: CatalogCustomerField,
  rawValue: string | string[] | boolean | undefined,
  allValues: DynamicFormValues = {}
): string | null {
  if (field.type === 'section') return null;
  if (!isDynamicFormFieldVisible(field, allValues)) return null;

  const label = (field.label || 'Kolom ini').trim();
  const rule = resolveFieldRequiredRule(field);
  const customErr = (field.errorMessage || '').trim();

  if (field.type === 'checkbox_group') {
    const arr = Array.isArray(rawValue) ? rawValue : [];
    const options = (field.options ?? []).filter((o) => o.trim().length > 0);
    if (rule === 'required_one' && arr.length === 0) {
      return customErr || `Wajib memilih salah satu pada "${label}".`;
    }
    if (rule === 'required_multi' && arr.length === 0) {
      return customErr || `Wajib memilih minimal satu pilihan pada "${label}".`;
    }
    if (rule === 'required_fill' && arr.length === 0) {
      return customErr || `Kolom "${label}" wajib diisi.`;
    }
    if (rule === 'required_min_choices') {
      const minC = Math.max(1, field.minChoices ?? 1);
      if (arr.length < minC) {
        return customErr || `"${label}" wajib memilih minimal ${minC} pilihan.`;
      }
    }
    if (rule === 'required_consent_all' && options.length > 0 && arr.length < options.length) {
      return customErr || `Wajib mencentang seluruh persetujuan pada "${label}".`;
    }
    if (rule === 'required_consent_specific') {
      const reqIdxs = field.requiredOptionIndexes ?? [0];
      for (const idx of reqIdxs) {
        const optLabel = options[idx];
        if (optLabel && !arr.includes(optLabel)) {
          return customErr || `Wajib mencentang persetujuan "${optLabel}".`;
        }
      }
    }
    return null;
  }

  const strVal = Array.isArray(rawValue)
    ? rawValue.join(', ').trim()
    : typeof rawValue === 'boolean'
    ? rawValue
      ? 'true'
      : ''
    : String(rawValue ?? '').trim();

  if (rule !== 'optional' && !strVal) {
    if (rule === 'required_one') {
      return customErr || `Wajib memilih salah satu pada "${label}".`;
    }
    return customErr || `Kolom "${label}" wajib diisi.`;
  }

  if (!strVal) return null;

  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(strVal)) {
    return customErr || `Format email pada "${label}" tidak valid.`;
  }

  if (field.type === 'phone' || field.type === 'tel') {
    const phoneFormat = field.phoneFormat ?? 'general';
    if (!isValidPhoneOrWhatsapp(strVal, phoneFormat)) {
      return (
        customErr ||
        (phoneFormat === 'whatsapp'
          ? `Nomor WhatsApp pada "${label}" harus diawali 08 atau 628 (10–15 digit).`
          : `Nomor telepon pada "${label}" harus terdiri dari 8–16 digit angka.`)
      );
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

  if (field.pattern) {
    try {
      const re = new RegExp(field.pattern);
      if (!re.test(strVal)) {
        return customErr || `Format "${label}" tidak sesuai pola yang ditentukan.`;
      }
    } catch {
      // Ignore malformed regex pattern
    }
  }

  return null;
}

export function validateDynamicForm(
  fields: CatalogCustomerField[],
  values: DynamicFormValues
): {
  valid: boolean;
  fieldErrors: Record<string, string>;
  firstError: string | null;
} {
  const fieldErrors: Record<string, string> = {};
  let firstError: string | null = null;
  for (const field of fields) {
    const err = validateDynamicFormField(field, values[field.id], values);
    if (err) {
      fieldErrors[field.id] = err;
      if (!firstError) firstError = err;
    }
  }
  return {
    valid: firstError === null,
    fieldErrors,
    firstError,
  };
}

export interface DynamicFormChecklistValidationInput {
  enabled?: boolean;
  title?: string;
  items?: string[];
  checkedItems?: string[];
  rule?: FormRequiredRule;
  legacyRequired?: boolean;
  minChoices?: number;
}

export function validateDynamicFormSubmission(input: {
  fields: CatalogCustomerField[];
  values: DynamicFormValues;
  checklist?: DynamicFormChecklistValidationInput;
}): {
  valid: boolean;
  errors: Record<string, string>;
  firstError: string | null;
} {
  const { fieldErrors, firstError: fieldFirstErr } = validateDynamicForm(
    input.fields,
    input.values ?? {}
  );
  const errors: Record<string, string> = { ...fieldErrors };
  let firstError: string | null = fieldFirstErr;

  const chk = input.checklist;
  if (chk?.enabled) {
    const items = (chk.items ?? []).filter((item) => String(item || '').trim().length > 0);
    const checked = Array.isArray(chk.checkedItems) ? chk.checkedItems : [];
    const rule: FormRequiredRule =
      chk.rule ?? (chk.legacyRequired ? 'required_consent_all' : 'optional');
    const title = (chk.title || 'Persetujuan').trim();

    if (items.length > 0 && rule !== 'optional') {
      let chkErr: string | null = null;
      if (rule === 'required_consent_all' && checked.length < items.length) {
        chkErr = `Wajib mencentang seluruh persetujuan pada "${title}".`;
      } else if ((rule === 'required_multi' || rule === 'required_one' || rule === 'required_fill') && checked.length === 0) {
        chkErr = `Wajib memilih minimal satu item pada "${title}".`;
      } else if (rule === 'required_min_choices') {
        const minC = Math.max(1, Number(chk.minChoices ?? 1));
        if (checked.length < minC) {
          chkErr = `"${title}" wajib memilih minimal ${minC} pilihan.`;
        }
      }
      if (chkErr) {
        errors.__checklist = chkErr;
        if (!firstError) firstError = chkErr;
      }
    }
  }

  return {
    valid: firstError === null,
    errors,
    firstError,
  };
}
