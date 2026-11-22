import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Copy,
  Plus,
  Trash2,
} from 'lucide-react';
import type {
  BuilderBlock,
  CatalogCustomerField,
  CustomFieldInputType,
  FormRequiredRule,
  WhatsappCenterConfig,
  WhatsappTemplateType,
} from '../../types/builder';
import {
  DYNAMIC_FORM_FIELD_TYPES,
  DYNAMIC_FORM_FIELD_TYPE_LABELS,
  FORM_REQUIRED_RULE_LABELS,
  resolveFieldRequiredRule,
} from '../../utils/formValidation';
import {
  WHATSAPP_TEMPLATE_TYPE_LABELS,
  resolveWhatsappCenter,
} from '../../utils/whatsappBuilder';
import { useUiLabel } from '../../contexts/UiLabelsContext';

interface DynamicFormBuilderEditorProps {
  selectedBlock: BuilderBlock;
  whatsappCenter?: WhatsappCenterConfig;
  onUpdateBlock: (id: string, updater: (block: BuilderBlock) => BuilderBlock) => void;
}

const OPTION_FIELD_TYPES: CustomFieldInputType[] = ['select', 'radio', 'checkbox_group'];

const makeFieldId = () => `fld_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export function hydrateDefaultFormFields(block: BuilderBlock): CatalogCustomerField[] {
  if (Array.isArray(block.content.formFields) && block.content.formFields.length > 0) {
    return block.content.formFields;
  }
  return [
    {
      id: 'fld_nama',
      label: 'Nama Lengkap',
      placeholder: block.content.namePlaceholder || 'Masukkan nama lengkap Anda',
      type: 'name',
      required: block.content.formNameRequired !== false,
      requiredRule: block.content.formNameRequired === false ? 'optional' : 'required_fill',
    },
    {
      id: 'fld_telepon',
      label: 'Nomor WhatsApp',
      placeholder: 'Contoh: 081234567890',
      type: 'phone',
      required: true,
      requiredRule: 'required_fill',
    },
    {
      id: 'fld_email',
      label: 'Email',
      placeholder: block.content.emailPlaceholder || 'nama@email.com',
      type: 'email',
      required: Boolean(block.content.formEmailRequired),
      requiredRule: block.content.formEmailRequired ? 'required_fill' : 'optional',
    },
  ];
}

export function DynamicFormBuilderEditor({
  selectedBlock,
  whatsappCenter,
  onUpdateBlock,
}: DynamicFormBuilderEditorProps) {
  const { label, isVisible } = useUiLabel();
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  const [newFieldType, setNewFieldType] = useState<CustomFieldInputType>('text');

  const fields = hydrateDefaultFormFields(selectedBlock);
  const waCenter = resolveWhatsappCenter({ whatsappCenter });

  const patchContent = (patch: Partial<BuilderBlock['content']>) => {
    onUpdateBlock(selectedBlock.id, (blk) => ({
      ...blk,
      content: { ...blk.content, ...patch },
    }));
  };

  const commitFields = (nextFields: CatalogCustomerField[]) => {
    patchContent({ formFields: nextFields });
  };

  const updateField = (id: string, patch: Partial<CatalogCustomerField>) => {
    const next = fields.map((f) => {
      if (f.id !== id) return f;
      const merged = { ...f, ...patch };
      if (patch.requiredRule !== undefined) {
        merged.required = patch.requiredRule !== 'optional';
      }
      return merged;
    });
    commitFields(next);
  };

  const handleAddField = () => {
    const labelText = DYNAMIC_FORM_FIELD_TYPE_LABELS[newFieldType] || 'Kolom Baru';
    const isOpt = OPTION_FIELD_TYPES.includes(newFieldType);
    const created: CatalogCustomerField = {
      id: makeFieldId(),
      label: newFieldType === 'section' ? 'Bagian Baru' : labelText,
      placeholder: newFieldType === 'section' ? '' : `Masukkan ${labelText.toLowerCase()}`,
      type: newFieldType,
      required: newFieldType !== 'section',
      requiredRule:
        newFieldType === 'section'
          ? 'optional'
          : newFieldType === 'select' || newFieldType === 'radio'
          ? 'required_one'
          : newFieldType === 'checkbox_group'
          ? 'required_multi'
          : 'required_fill',
      options: isOpt ? ['Pilihan 1', 'Pilihan 2'] : undefined,
      description: newFieldType === 'section' ? 'Keterangan singkat bagian formulir.' : undefined,
    };
    commitFields([...fields, created]);
    setExpandedFieldId(created.id);
  };

  const handleDuplicateField = (index: number) => {
    const src = fields[index];
    if (!src) return;
    const copy: CatalogCustomerField = {
      ...src,
      id: makeFieldId(),
      label: `${src.label} (Salinan)`,
      options: src.options ? [...src.options] : undefined,
      requiredOptionIndexes: src.requiredOptionIndexes ? [...src.requiredOptionIndexes] : undefined,
    };
    const next = [...fields];
    next.splice(index + 1, 0, copy);
    commitFields(next);
    setExpandedFieldId(copy.id);
  };

  const handleMoveField = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    commitFields(next);
  };

  const handleRemoveField = (id: string) => {
    commitFields(fields.filter((f) => f.id !== id));
    if (expandedFieldId === id) setExpandedFieldId(null);
  };

  const checklistRule: FormRequiredRule =
    selectedBlock.content.formChecklistRule ||
    (selectedBlock.content.formChecklistRequired ? 'required_consent_all' : 'optional');

  return (
    <div className="space-y-3">
      {/* Identitas Formulir */}
      <div className="p-2.5 rounded-xl border border-[#DCE5EF] bg-[#F8FBFE] space-y-2">
        <div className="text-[11px] font-bold text-[#17243D]">Identitas & Kategori Formulir</div>
        <div>
          <label className="text-[10.5px] font-semibold text-[#51637D] block mb-1">
            Judul Formulir
          </label>
          <input
            type="text"
            value={selectedBlock.content.formTitle ?? ''}
            onChange={(e) => patchContent({ formTitle: e.target.value })}
            placeholder="Formulir Pendaftaran / Konsultasi"
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DCE5EF] rounded-lg focus:outline-none focus:border-[#00C98A]"
          />
        </div>
        <div>
          <label className="text-[10.5px] font-semibold text-[#51637D] block mb-1">
            Kategori Formulir
          </label>
          <select
            value={selectedBlock.content.formCategory || 'konsultasi'}
            onChange={(e) =>
              patchContent({ formCategory: e.target.value as WhatsappTemplateType })
            }
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DCE5EF] rounded-lg focus:outline-none focus:border-[#00C98A]"
          >
            {(Object.keys(WHATSAPP_TEMPLATE_TYPE_LABELS) as WhatsappTemplateType[]).map((key) => (
              <option key={key} value={key}>
                {WHATSAPP_TEMPLATE_TYPE_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Daftar Kolom Dinamis (14 Tipe) */}
      <div className="p-2.5 rounded-xl border border-[#DCE5EF] bg-white space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-[#17243D]">
            Kolom Formulir ({fields.length})
          </span>
        </div>

        <div className="space-y-1.5">
          {fields.map((field, index) => {
            const isOpen = expandedFieldId === field.id;
            const rule = resolveFieldRequiredRule(field);
            const hasOptions = OPTION_FIELD_TYPES.includes(field.type);
            const otherFields = fields.filter(
              (f) => f.id !== field.id && f.type !== 'section'
            );

            return (
              <div
                key={field.id}
                className="rounded-lg border border-[#DCE5EF] bg-[#F8FBFE] overflow-hidden"
              >
                <div className="px-2 py-1.5 flex items-center justify-between gap-1.5 bg-white">
                  <button
                    type="button"
                    onClick={() => setExpandedFieldId(isOpen ? null : field.id)}
                    className="flex items-center gap-1.5 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    {isOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-[#51637D] shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[#51637D] shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-[#17243D] truncate">
                        {field.label || 'Tanpa Label'}
                        {rule !== 'optional' && field.type !== 'section' && (
                          <span className="text-red-500 ml-0.5">*</span>
                        )}
                      </div>
                      <div className="text-[9.5px] text-[#51637D] truncate">
                        {DYNAMIC_FORM_FIELD_TYPE_LABELS[field.type] || field.type}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveField(index, -1)}
                      disabled={index === 0}
                      title="Pindah ke atas"
                      className="p-1 text-[#51637D] hover:text-[#17243D] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveField(index, 1)}
                      disabled={index === fields.length - 1}
                      title="Pindah ke bawah"
                      className="p-1 text-[#51637D] hover:text-[#17243D] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateField(index)}
                      title="Duplikat kolom"
                      className="p-1 text-[#51637D] hover:text-[#00A873] cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveField(field.id)}
                      title="Hapus kolom"
                      className="p-1 text-[#51637D] hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="p-2.5 border-t border-[#DCE5EF] space-y-2 text-[11px]">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-[#51637D] block mb-0.5">
                          Jenis Kolom
                        </label>
                        <select
                          value={field.type === 'tel' ? 'phone' : field.type}
                          onChange={(e) => {
                            const nextType = e.target.value as CustomFieldInputType;
                            updateField(field.id, {
                              type: nextType,
                              options:
                                OPTION_FIELD_TYPES.includes(nextType) &&
                                (!field.options || field.options.length === 0)
                                  ? ['Pilihan 1', 'Pilihan 2']
                                  : field.options,
                            });
                          }}
                          className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
                        >
                          {DYNAMIC_FORM_FIELD_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-[#51637D] block mb-0.5">
                          Label Kolom
                        </label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
                        />
                      </div>
                    </div>

                    {field.type === 'section' ? (
                      <div>
                        <label className="text-[10px] font-semibold text-[#51637D] block mb-0.5">
                          Deskripsi Bagian
                        </label>
                        <textarea
                          rows={2}
                          value={field.description ?? ''}
                          onChange={(e) => updateField(field.id, { description: e.target.value })}
                          className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-[#51637D] block mb-0.5">
                              Teks Panduan (Placeholder)
                            </label>
                            <input
                              type="text"
                              value={field.placeholder ?? ''}
                              onChange={(e) =>
                                updateField(field.id, { placeholder: e.target.value })
                              }
                              className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-[#51637D] block mb-0.5">
                              Nilai Awal
                            </label>
                            <input
                              type="text"
                              value={field.defaultValue ?? ''}
                              onChange={(e) =>
                                updateField(field.id, { defaultValue: e.target.value })
                              }
                              placeholder="Opsional"
                              className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
                            />
                          </div>
                        </div>

                        {/* Aturan Wajib Isi Granular */}
                        <div>
                          <label className="text-[10px] font-semibold text-[#51637D] block mb-0.5">
                            Aturan Wajib Isi
                          </label>
                          <select
                            value={rule}
                            onChange={(e) =>
                              updateField(field.id, {
                                requiredRule: e.target.value as FormRequiredRule,
                              })
                            }
                            className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
                          >
                            {(Object.keys(FORM_REQUIRED_RULE_LABELS) as FormRequiredRule[]).map(
                              (rk) => (
                                <option key={rk} value={rk}>
                                  {FORM_REQUIRED_RULE_LABELS[rk]}
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        {rule === 'required_min_choices' && (
                          <div>
                            <label className="text-[10px] font-semibold text-[#51637D] block mb-0.5">
                              Jumlah Minimum Pilihan
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={field.minChoices ?? 2}
                              onChange={(e) =>
                                updateField(field.id, {
                                  minChoices: Math.max(1, Number(e.target.value) || 1),
                                })
                              }
                              className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
                            />
                          </div>
                        )}

                        {hasOptions && (
                          <div>
                            <label className="text-[10px] font-semibold text-[#51637D] block mb-0.5">
                              Daftar Pilihan (satu baris per pilihan)
                            </label>
                            <textarea
                              rows={3}
                              value={(field.options ?? []).join('\n')}
                              onChange={(e) =>
                                updateField(field.id, {
                                  options: e.target.value.split('\n'),
                                })
                              }
                              className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
                            />
                          </div>
                        )}

                        {rule === 'required_consent_specific' && hasOptions && (
                          <div>
                            {isVisible('konten.desc.formChecklistWajib') && (
                              <label className="text-[10px] font-semibold text-[#51637D] block mb-0.5">
                                {label(
                                  'konten.desc.formChecklistWajib',
                                  'Nomor Pilihan Wajib Dicentang (pisahkan koma, mulai dari 1)'
                                )}
                              </label>
                            )}
                            <input
                              type="text"
                              value={(field.requiredOptionIndexes ?? [0])
                                .map((i) => i + 1)
                                .join(', ')}
                              onChange={(e) => {
                                const idxs = e.target.value
                                  .split(',')
                                  .map((s) => Number(s.trim()) - 1)
                                  .filter((n) => Number.isInteger(n) && n >= 0);
                                updateField(field.id, { requiredOptionIndexes: idxs });
                              }}
                              placeholder="Contoh: 1, 2"
                              className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
                            />
                          </div>
                        )}

                        {field.type === 'number' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-[#51637D] block mb-0.5">
                                Nilai Min
                              </label>
                              <input
                                type="number"
                                value={field.minValue ?? ''}
                                onChange={(e) =>
                                  updateField(field.id, {
                                    minValue:
                                      e.target.value === '' ? undefined : Number(e.target.value),
                                  })
                                }
                                className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-[#51637D] block mb-0.5">
                                Nilai Maks
                              </label>
                              <input
                                type="number"
                                value={field.maxValue ?? ''}
                                onChange={(e) =>
                                  updateField(field.id, {
                                    maxValue:
                                      e.target.value === '' ? undefined : Number(e.target.value),
                                  })
                                }
                                className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
                              />
                            </div>
                          </div>
                        )}

                        {(field.type === 'text' ||
                          field.type === 'textarea' ||
                          field.type === 'name' ||
                          field.type === 'email' ||
                          field.type === 'phone' ||
                          field.type === 'tel' ||
                          field.type === 'address') && (
                          <div className="pt-1 border-t border-[#E6EEF6] space-y-2">
                            <div className="text-[10px] font-bold text-[#17243D]">
                              Validasi Tambahan (Opsional)
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-semibold text-[#51637D] block mb-0.5">
                                  Panjang Min (Karakter)
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={2000}
                                  value={field.minLength ?? ''}
                                  placeholder="Bebas"
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const n = Number(raw);
                                    updateField(field.id, {
                                      minLength:
                                        raw === '' || !Number.isFinite(n) || n <= 0
                                          ? undefined
                                          : Math.min(2000, Math.round(n)),
                                    });
                                  }}
                                  className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-[#51637D] block mb-0.5">
                                  Panjang Maks (Karakter)
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={5000}
                                  value={field.maxLength ?? ''}
                                  placeholder="Bebas"
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const n = Number(raw);
                                    updateField(field.id, {
                                      maxLength:
                                        raw === '' || !Number.isFinite(n) || n <= 0
                                          ? undefined
                                          : Math.min(5000, Math.round(n)),
                                    });
                                  }}
                                  className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
                                />
                              </div>
                            </div>
                            {(field.type === 'phone' || field.type === 'tel') && (
                              <div>
                                <label className="text-[10px] font-semibold text-[#51637D] block mb-0.5">
                                  Format Nomor Telepon / WhatsApp
                                </label>
                                <select
                                  value={field.phoneFormat ?? 'general'}
                                  onChange={(e) =>
                                    updateField(field.id, {
                                      phoneFormat: e.target.value as 'general' | 'whatsapp',
                                    })
                                  }
                                  className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
                                >
                                  <option value="general">Umum (8–16 digit angka)</option>
                                  <option value="whatsapp">Khusus WhatsApp ID (08 / 628, 10–15 digit)</option>
                                </select>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-[#51637D] block mb-0.5">
                              Teks Bantuan
                            </label>
                            <input
                              type="text"
                              value={field.helpText ?? ''}
                              onChange={(e) => updateField(field.id, { helpText: e.target.value })}
                              placeholder="Opsional"
                              className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-[#51637D] block mb-0.5">
                              Pesan Kesalahan Khusus
                            </label>
                            <input
                              type="text"
                              value={field.errorMessage ?? ''}
                              onChange={(e) =>
                                updateField(field.id, { errorMessage: e.target.value })
                              }
                              placeholder="Otomatis Bahasa Indonesia"
                              className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
                            />
                          </div>
                        </div>

                        {otherFields.length > 0 && (
                          <div className="pt-1.5 border-t border-[#E6EEF6] space-y-1.5">
                            <div className="text-[10px] font-bold text-[#17243D]">
                              Tampilan Bersyarat (Opsional)
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={field.conditionalFieldId ?? ''}
                                onChange={(e) =>
                                  updateField(field.id, {
                                    conditionalFieldId: e.target.value || undefined,
                                  })
                                }
                                className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
                              >
                                <option value="">Selalu tampil</option>
                                {otherFields.map((of) => (
                                  <option key={of.id} value={of.id}>
                                    Jika "{of.label}"
                                  </option>
                                ))}
                              </select>
                              {field.conditionalFieldId && (
                                <input
                                  type="text"
                                  value={field.conditionalValue ?? ''}
                                  onChange={(e) =>
                                    updateField(field.id, {
                                      conditionalValue: e.target.value,
                                    })
                                  }
                                  placeholder="Nilai cocok (kosong = terisi)"
                                  className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tambah Kolom */}
        <div className="pt-1.5 flex items-center gap-1.5">
          <select
            value={newFieldType}
            onChange={(e) => setNewFieldType(e.target.value as CustomFieldInputType)}
            className="flex-1 px-2 py-1.5 text-[11px] bg-white border border-[#DCE5EF] rounded-lg"
          >
            {DYNAMIC_FORM_FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddField}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-[#17243D] text-white rounded-lg hover:bg-[#223457] cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah</span>
          </button>
        </div>
      </div>

      {/* Checklist Persetujuan Tambahan */}
      <div className="p-2.5 rounded-xl border border-[#DCE5EF] bg-[#F8FBFE] space-y-2">
        <label className="flex items-center justify-between gap-2 text-[11px] font-bold text-[#17243D] cursor-pointer">
          <span>Daftar Persetujuan / Ceklis</span>
          <input
            type="checkbox"
            checked={Boolean(selectedBlock.content.formChecklistEnabled)}
            onChange={(e) => patchContent({ formChecklistEnabled: e.target.checked })}
            className="accent-[#00C98A]"
          />
        </label>
        {selectedBlock.content.formChecklistEnabled && (
          <div className="space-y-2">
            <input
              type="text"
              value={selectedBlock.content.formChecklistTitle ?? 'Persetujuan & Konfirmasi'}
              onChange={(e) => patchContent({ formChecklistTitle: e.target.value })}
              placeholder="Judul persetujuan"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DCE5EF] rounded-lg"
            />
            <textarea
              rows={3}
              value={(selectedBlock.content.formChecklistItems ?? []).join('\n')}
              onChange={(e) =>
                patchContent({
                  formChecklistItems: e.target.value.split('\n'),
                })
              }
              placeholder="Satu baris per butir persetujuan"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DCE5EF] rounded-lg"
            />
            <div>
              <label className="text-[10.5px] font-semibold text-[#51637D] block mb-1">
                Aturan Ceklis
              </label>
              <select
                value={checklistRule}
                onChange={(e) => {
                  const nextRule = e.target.value as FormRequiredRule;
                  patchContent({
                    formChecklistRule: nextRule,
                    formChecklistRequired: nextRule !== 'optional',
                  });
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DCE5EF] rounded-lg"
              >
                {(Object.keys(FORM_REQUIRED_RULE_LABELS) as FormRequiredRule[]).map((rk) => (
                  <option key={rk} value={rk}>
                    {FORM_REQUIRED_RULE_LABELS[rk]}
                  </option>
                ))}
              </select>
            </div>
            {checklistRule === 'required_min_choices' && (
              <div>
                <label className="text-[10.5px] font-semibold text-[#51637D] block mb-1">
                  Minimum Pilihan Ceklis
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={selectedBlock.content.formChecklistMinChoices ?? 1}
                  onChange={(e) =>
                    patchContent({
                      formChecklistMinChoices: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#DCE5EF] rounded-lg"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Penyimpanan & Integrasi WhatsApp */}
      <div className="p-2.5 rounded-xl border border-[#DCE5EF] bg-white space-y-2">
        <div className="text-[11px] font-bold text-[#17243D]">
          Pengiriman, Basis Data & WhatsApp
        </div>
        <label className="flex items-center justify-between gap-2 text-[11px] text-[#17243D] cursor-pointer">
          <span>Simpan jawaban formulir ke basis data</span>
          <input
            type="checkbox"
            checked={selectedBlock.content.formSaveToDatabase !== false}
            onChange={(e) => patchContent({ formSaveToDatabase: e.target.checked })}
            className="accent-[#00C98A]"
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-[11px] text-[#17243D] cursor-pointer">
          <span>Teruskan ke WhatsApp setelah terkirim</span>
          <input
            type="checkbox"
            checked={Boolean(selectedBlock.content.formWhatsappEnabled)}
            onChange={(e) => patchContent({ formWhatsappEnabled: e.target.checked })}
            className="accent-[#00C98A]"
          />
        </label>

        {selectedBlock.content.formWhatsappEnabled && (
          <div className="space-y-2 pt-1 border-t border-[#E6EEF6]">
            <div>
              {isVisible('konten.desc.formWaKhusus') && (
                <label className="text-[10.5px] font-semibold text-[#51637D] block mb-1">
                  {label(
                    'konten.desc.formWaKhusus',
                    'Nomor WhatsApp Khusus (opsional, kosong = pakai Pusat WhatsApp)'
                  )}
                </label>
              )}
              <input
                type="text"
                value={selectedBlock.content.formWhatsappNumber ?? ''}
                onChange={(e) => patchContent({ formWhatsappNumber: e.target.value })}
                placeholder={waCenter.mainPhone || '6281234567890'}
                className="w-full px-2.5 py-1.5 text-xs bg-[#F8FBFE] border border-[#DCE5EF] rounded-lg"
              />
            </div>
            <div>
              <label className="text-[10.5px] font-semibold text-[#51637D] block mb-1">
                Templat Pesan WhatsApp
              </label>
              <select
                value={selectedBlock.content.formWhatsappTemplateId ?? ''}
                onChange={(e) =>
                  patchContent({
                    formWhatsappTemplateId: e.target.value || undefined,
                    whatsappTemplateId: e.target.value || undefined,
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs bg-[#F8FBFE] border border-[#DCE5EF] rounded-lg"
              >
                <option value="">Otomatis sesuai kategori formulir</option>
                {waCenter.templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} ({WHATSAPP_TEMPLATE_TYPE_LABELS[tpl.type]})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div>
          <label className="text-[10.5px] font-semibold text-[#51637D] block mb-1">
            Teks Tombol Kirim
          </label>
          <input
            type="text"
            value={selectedBlock.content.submitLabel ?? 'Kirim Formulir'}
            onChange={(e) => patchContent({ submitLabel: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs bg-[#F8FBFE] border border-[#DCE5EF] rounded-lg"
          />
        </div>
        <div>
          <label className="text-[10.5px] font-semibold text-[#51637D] block mb-1">
            Pesan Berhasil Terkirim
          </label>
          <input
            type="text"
            value={
              selectedBlock.content.successMessage ??
              'Terima kasih! Data Anda telah berhasil dikirim.'
            }
            onChange={(e) => patchContent({ successMessage: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs bg-[#F8FBFE] border border-[#DCE5EF] rounded-lg"
          />
        </div>
        <div>
          <label className="text-[10.5px] font-semibold text-[#51637D] block mb-1">
            Warna Tombol Kirim
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={selectedBlock.content.buttonColor || '#00C98A'}
              onChange={(e) => patchContent({ buttonColor: e.target.value })}
              className="w-8 h-7 rounded border border-[#DCE5EF] cursor-pointer"
            />
            <input
              type="text"
              value={selectedBlock.content.buttonColor || '#00C98A'}
              onChange={(e) => patchContent({ buttonColor: e.target.value })}
              className="flex-1 px-2 py-1 text-xs font-mono bg-[#F8FBFE] border border-[#DCE5EF] rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
