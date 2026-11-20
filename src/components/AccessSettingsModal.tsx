import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Crown,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  AccessMemberRecord,
  AccessRole,
  AccessSettingsConfig,
  FeaturePermissionKey,
  ProjectRecord,
} from '../types/builder';
import {
  ALL_FEATURE_KEYS,
  FEATURE_META,
  FULL_FEATURE_PERMISSIONS,
  ROLE_META,
  fetchAccessSettings,
  getPresetPermissionsForRole,
} from '../utils/accessControl';
import { createMemberWithPasswordOnServer, seedDemoRolesOnServer } from '../utils/authClient';
import { DEMO_ROLE_PROFILES, ROLE_ACCESS_ORDER } from '../utils/demoAccounts';

interface AccessSettingsModalProps {
  settings: AccessSettingsConfig;
  projects: ProjectRecord[];
  demoModeAvailable?: boolean;
  onDemoSeeded?: () => Promise<void> | void;
  onSaveSettings: (
    nextSettings: AccessSettingsConfig
  ) => Promise<{ ok: boolean; settings: AccessSettingsConfig; error?: string }>;
  onSettingsSynced?: (nextSettings: AccessSettingsConfig) => void;
  onClose?: () => void;
  asPage?: boolean;
}

export function AccessSettingsModal({
  settings,
  projects,
  demoModeAvailable = false,
  onDemoSeeded,
  onSaveSettings,
  onSettingsSynced,
  onClose = () => {},
  asPage = false,
}: AccessSettingsModalProps) {
  const [draft, setDraft] = useState<AccessSettingsConfig>(() => ({
    ...settings,
    members: settings.members.map((m) => ({
      ...m,
      permissions: { ...m.permissions },
      unitScope: Array.isArray(m.unitScope) ? [...m.unitScope] : 'all',
    })),
  }));

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AccessRole>('editor');
  const [newUnitScopeAll, setNewUnitScopeAll] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    settings.activeMemberId || settings.members[0]?.id || 'owner-super-admin'
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const hasLocalEditsRef = useRef(false);

  useEffect(() => {
    if (hasLocalEditsRef.current) return;
    setDraft({
      ...settings,
      members: settings.members.map((m) => ({
        ...m,
        permissions: { ...m.permissions },
        unitScope: Array.isArray(m.unitScope) ? [...m.unitScope] : 'all',
      })),
    });
    setSelectedMemberId((prev) =>
      settings.members.some((m) => m.id === prev)
        ? prev
        : settings.activeMemberId || settings.members[0]?.id || 'owner-super-admin'
    );
  }, [settings]);

  const selectedMember = useMemo(
    () => draft.members.find((m) => m.id === selectedMemberId) ?? draft.members[0],
    [draft.members, selectedMemberId]
  );

  const superAdminCount = useMemo(
    () => draft.members.filter((m) => m.role === 'super_admin').length,
    [draft.members]
  );

  const handleAddMember = async () => {
    const cleanName = newName.trim();
    const cleanEmail = newEmail.trim().toLowerCase();
    const cleanPassword = newPassword.trim();
    if (!cleanName || !cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFeedback({
        type: 'err',
        text: 'Isi nama lengkap dan format email yang valid terlebih dahulu.',
      });
      return;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      setFeedback({
        type: 'err',
        text: 'Kata sandi login wajib diisi (minimal 6 karakter) agar anggota tim dapat masuk dari browser/perangkat lain.',
      });
      return;
    }

    const exists = draft.members.some(
      (m) => m.email.toLowerCase() === cleanEmail
    );
    if (exists) {
      setFeedback({
        type: 'err',
        text: `Akun dengan email "${cleanEmail}" sudah terdaftar.`,
      });
      return;
    }

    const effectiveRole: AccessRole = newRole;
    const requestedScope: 'all' | string[] =
      effectiveRole === 'super_admin' || newUnitScopeAll ? 'all' : [];

    setSaving(true);
    const res = await createMemberWithPasswordOnServer({
      name: cleanName,
      email: cleanEmail,
      password: cleanPassword,
      role: effectiveRole,
      unitScope: requestedScope,
    });
    setSaving(false);

    if (!res.ok || !res.settings) {
      setFeedback({
        type: 'err',
        text: res.error || 'Gagal membuat akun login ke database server.',
      });
      return;
    }

    hasLocalEditsRef.current = false;
    setDraft(res.settings);
    onSettingsSynced?.(res.settings);
    const added = res.settings.members.find(
      (m) => m.email.toLowerCase() === cleanEmail
    );
    if (added) setSelectedMemberId(added.id);
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setFeedback({
      type: 'ok',
      text: `${cleanName} berhasil dibuat (${ROLE_META[effectiveRole].shortLabel}, ${
        requestedScope === 'all' ? 'akses Semua Unit Usaha' : 'pilih unit usaha di panel kanan'
      }) dan sudah bisa langsung login.`,
    });
  };

  const hasMissingDemoPreset = useMemo(() => {
    if (!demoModeAvailable) return false;
    const existingEmails = new Set(draft.members.map((m) => m.email.toLowerCase()));
    return ROLE_ACCESS_ORDER.some((r) => !existingEmails.has(DEMO_ROLE_PROFILES[r].email));
  }, [demoModeAvailable, draft.members]);

  const handleSeedDemoPreset = async () => {
    setSaving(true);
    setFeedback(null);
    const res = await seedDemoRolesOnServer();
    if (!res.ok) {
      setSaving(false);
      setFeedback({
        type: 'err',
        text: res.error || 'Gagal menyiapkan akun demo 4 role.',
      });
      return;
    }
    const synced = await fetchAccessSettings();
    setSaving(false);
    hasLocalEditsRef.current = false;
    setDraft(synced);
    onSettingsSynced?.(synced);
    await onDemoSeeded?.();
    setFeedback({
      type: 'ok',
      text:
        (res.createdCount ?? 0) > 0
          ? `${res.createdCount} akun preset demo (Super Admin, Admin, Editor, Viewer) berhasil ditambahkan.`
          : 'Seluruh preset 4 role demo sudah aktif di server.',
    });
  };

  const handleUpdateMemberRole = (memberId: string, role: AccessRole) => {
    hasLocalEditsRef.current = true;
    setDraft((prev) => ({
      ...prev,
      members: prev.members.map((m) => {
        if (m.id !== memberId) return m;
        const wasEmptyScope = Array.isArray(m.unitScope) && m.unitScope.length === 0;
        const nextUnitScope: 'all' | string[] =
          role === 'super_admin'
            ? 'all'
            : (role === 'editor' || role === 'admin') && wasEmptyScope
            ? 'all'
            : m.unitScope === 'all' || Array.isArray(m.unitScope)
            ? m.unitScope
            : [];
        return {
          ...m,
          role,
          unitScope: nextUnitScope,
          permissions: getPresetPermissionsForRole(role),
        };
      }),
      updatedAt: Date.now(),
    }));
  };

  const handleToggleMemberPermission = (
    memberId: string,
    key: FeaturePermissionKey
  ) => {
    hasLocalEditsRef.current = true;
    setDraft((prev) => ({
      ...prev,
      members: prev.members.map((m) => {
        if (m.id !== memberId) return m;
        return {
          ...m,
          permissions: {
            ...m.permissions,
            [key]: !m.permissions[key],
          },
        };
      }),
      updatedAt: Date.now(),
    }));
  };

  const handleToggleMemberActive = (memberId: string) => {
    if (memberId === 'owner-super-admin') return;
    hasLocalEditsRef.current = true;
    setDraft((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === memberId ? { ...m, isActive: !m.isActive } : m
      ),
      updatedAt: Date.now(),
    }));
  };

  const handleSetAllUnitsScope = (memberId: string, allowAll: boolean) => {
    hasLocalEditsRef.current = true;
    setDraft((prev) => ({
      ...prev,
      members: prev.members.map((m) => {
        if (m.id !== memberId) return m;
        return {
          ...m,
          unitScope: allowAll ? 'all' : [],
        };
      }),
      updatedAt: Date.now(),
    }));
  };

  const handleToggleUnitScope = (memberId: string, projectId: string) => {
    hasLocalEditsRef.current = true;
    setDraft((prev) => ({
      ...prev,
      members: prev.members.map((m) => {
        if (m.id !== memberId) return m;
        const currentIds =
          m.unitScope === 'all' ? projects.map((p) => p.id) : m.unitScope;
        const nextIds = currentIds.includes(projectId)
          ? currentIds.filter((id) => id !== projectId)
          : [...currentIds, projectId];
        return {
          ...m,
          unitScope:
            projects.length > 0 && nextIds.length === projects.length
              ? 'all'
              : nextIds,
        };
      }),
      updatedAt: Date.now(),
    }));
  };

  const handleDeleteMember = (memberId: string) => {
    if (memberId === 'owner-super-admin' || draft.members.length <= 1) return;
    hasLocalEditsRef.current = true;
    setDraft((prev) => {
      const nextMembers = prev.members.filter((m) => m.id !== memberId);
      const nextActive =
        prev.activeMemberId === memberId
          ? nextMembers[0]?.id || 'owner-super-admin'
          : prev.activeMemberId;
      return {
        ...prev,
        activeMemberId: nextActive,
        members: nextMembers,
        updatedAt: Date.now(),
      };
    });
    if (selectedMemberId === memberId) {
      setSelectedMemberId('owner-super-admin');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    const res = await onSaveSettings({
      ...draft,
      allUsersSuperAdmin: false,
      autoGrantSuperAdminOnJoin: false,
    });
    setSaving(false);
    setDraft(res.settings);
    if (res.ok) {
      hasLocalEditsRef.current = false;
      setFeedback({
        type: 'ok',
        text: 'Setting akses dan izin akun berhasil disimpan.',
      });
    } else {
      setFeedback({
        type: 'err',
        text: res.error || 'Tersimpan lokal, sinkronisasi server tertunda.',
      });
    }
  };

  const cardContent = (
    <div
      className={
        asPage
          ? 'bg-white w-full max-w-5xl mx-auto flex-1 min-h-0 rounded-2xl border border-[#DCE5EF] shadow-xs flex flex-col overflow-hidden'
          : 'bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl border border-[#DCE5EF] shadow-2xl flex flex-col overflow-hidden'
      }
      onClick={(e) => {
        if (!asPage) e.stopPropagation();
      }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#DCE5EF] flex items-center justify-between gap-3 bg-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#ECFDF6] border border-[#00C98A]/35 text-[#00A873] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-[#17243D] tracking-tight">
                Setting Akses &amp; Super Admin
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-[#ECFDF6] text-[#008F63] border-[#00C98A]/40 tabular-nums">
                <Crown className="w-3 h-3 text-[#00A873]" />
                {`${superAdminCount}/${draft.members.length} Super Admin`}
              </span>
            </div>
            <p className="text-xs text-[#5B708B] mt-0.5 truncate">
              Kelola peran RBAC, hak akses fitur, dan cakupan unit usaha tiap anggota tim.
            </p>
          </div>
        </div>

        {!asPage && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Setting Akses"
            className="p-2 rounded-xl text-[#5B708B] hover:bg-[#F0F5FA] hover:text-[#17243D] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-[#F0F5FA]/70 p-5 space-y-4">
          {feedback && (
            <div
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                feedback.type === 'ok'
                  ? 'bg-[#ECFDF6] border-[#00C98A]/40 text-[#008F63]'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Security Policy Card (Least-Privilege Enforced) */}
          <div className="bg-white rounded-xl border border-[#DCE5EF] p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-[#17243D] flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-[#00A873]" />
                  Kebijakan Akses: Least-Privilege RBAC Aktif
                </h3>
                <p className="text-[11px] text-[#5B708B] mt-0.5">
                  Hanya pengguna pendaftar pertama yang otomatis menjadi Super Admin. Pendaftar publik berikutnya menerima peran least-privilege (Viewer) tanpa izin admin.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#00C98A]/40 bg-[#ECFDF6] text-[#008F63] text-xs font-semibold">
                  <Check className="w-3.5 h-3.5 text-[#00A873]" />
                  RBAC Terproteksi
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2.5 border-t border-[#EEF3F8]">
              <div className="rounded-xl bg-[#F0F5FA]/70 border border-[#DCE5EF] px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8FA4BF]">
                  Status Workspace
                </p>
                <p className="text-xs font-bold text-[#008F63] mt-0.5">
                  Mode Peran Kustom &amp; Scope
                </p>
              </div>
              <div className="rounded-xl bg-[#F0F5FA]/70 border border-[#DCE5EF] px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8FA4BF]">
                  Total Akun / Super Admin
                </p>
                <p className="text-xs font-bold text-[#17243D] mt-0.5 tabular-nums">
                  {superAdminCount} / {draft.members.length} Akun Super Admin
                </p>
              </div>
              <div className="rounded-xl bg-[#F0F5FA]/70 border border-[#DCE5EF] px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8FA4BF]">
                  Peran Registrasi Publik
                </p>
                <p className="text-xs font-bold text-[#17243D] mt-0.5">
                  {ROLE_META[draft.defaultRole].shortLabel} (Scope Terbatas)
                </p>
              </div>
            </div>
          </div>

          {/* Add Account Card */}
          <div className="bg-white rounded-xl border border-[#DCE5EF] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-[#17243D] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#00A873]" />
                Tambah Akun Tim / Pengelola
              </h3>
              {demoModeAvailable && hasMissingDemoPreset && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSeedDemoPreset()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#00C98A]/35 bg-[#ECFDF6] hover:bg-[#00C98A]/15 disabled:opacity-60 text-[#008F63] text-[11px] font-semibold cursor-pointer whitespace-nowrap transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Tambah Preset 4 Role Demo</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nama lengkap"
                  className="w-full px-3 py-2 rounded-xl border border-[#DCE5EF] bg-white text-xs text-[#17243D] placeholder:text-[#8FA4BF] outline-none focus:border-[#00C98A] transition-colors"
                />
              </div>
              <div className="sm:col-span-3">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Email (mis. tim@bisnis.id)"
                  className="w-full px-3 py-2 rounded-xl border border-[#DCE5EF] bg-white text-xs text-[#17243D] placeholder:text-[#8FA4BF] outline-none focus:border-[#00C98A] transition-colors"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Sandi min. 6 kar."
                  className="w-full px-3 py-2 rounded-xl border border-[#DCE5EF] bg-white text-xs text-[#17243D] placeholder:text-[#8FA4BF] outline-none focus:border-[#00C98A] transition-colors"
                />
              </div>
              <div className="sm:col-span-2">
                <select
                  value={newRole}
                  onChange={(e) => {
                    const next = e.target.value as AccessRole;
                    setNewRole(next);
                    if (next === 'super_admin' || next === 'admin' || next === 'editor') {
                      setNewUnitScopeAll(true);
                    }
                  }}
                  className="w-full px-2.5 py-2 rounded-xl border border-[#DCE5EF] bg-white text-xs text-[#17243D] outline-none focus:border-[#00C98A] transition-colors"
                >
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleAddMember()}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#17243D] hover:bg-[#223456] disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 text-[#00C98A]" />
                  <span>Tambah</span>
                </button>
              </div>
            </div>

            {newRole !== 'super_admin' && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <label className="inline-flex items-center gap-2 text-[11px] text-[#5B708B] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newUnitScopeAll}
                    onChange={(e) => setNewUnitScopeAll(e.target.checked)}
                    className="rounded border-[#DCE5EF] accent-[#00C98A] cursor-pointer"
                  />
                  <span>
                    Beri akses ke <strong className="text-[#17243D]">Semua Unit Usaha</strong> langsung saat dibuat (bisa dipersempit per unit di bawah)
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Two Column: Members List + Full Permission Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Accounts List */}
            <div className="lg:col-span-6 bg-white rounded-xl border border-[#DCE5EF] overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-[#EEF3F8] flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#17243D] tabular-nums">
                  Daftar Akun ({draft.members.length})
                </h3>
                <span className="text-[11px] text-[#8FA4BF]">
                  Klik akun untuk cek detail izin
                </span>
              </div>

              <div className="divide-y divide-[#EEF3F8] max-h-80 overflow-y-auto">
                {draft.members.map((member) => {
                  const isSelected = selectedMember?.id === member.id;
                  const isCurrentSession = draft.activeMemberId === member.id;
                  const roleInfo = ROLE_META[member.role];
                  const isOwner = member.id === 'owner-super-admin';

                  return (
                    <div
                      key={member.id}
                      onClick={() => setSelectedMemberId(member.id)}
                      className={`p-3.5 transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#ECFDF6]/70' : 'hover:bg-[#F0F5FA]/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-[#17243D] truncate">
                              {member.name}
                            </span>
                            {isCurrentSession && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#17243D] text-[#00C98A]">
                                Aktif Sekarang
                              </span>
                            )}
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${roleInfo.badgeClass}`}
                            >
                              {roleInfo.shortLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#5B708B] truncate mt-0.5">
                            {member.email}
                          </p>
                          <p className="text-[10px] text-[#008F63] font-medium mt-1 tabular-nums">
                            {member.unitScope === 'all'
                              ? `Akses: Semua Unit Usaha (${projects.length})`
                              : `Akses: ${member.unitScope.length} Unit Usaha`}
                          </p>
                        </div>

                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!isOwner && (
                            <button
                              type="button"
                              onClick={() => handleToggleMemberActive(member.id)}
                              className={`px-2 py-1 rounded-lg border text-[10px] font-semibold cursor-pointer transition-colors ${
                                member.isActive
                                  ? 'border-[#00C98A]/40 bg-[#ECFDF6] text-[#008F63]'
                                  : 'border-[#DCE5EF] bg-[#F0F5FA] text-[#5B708B]'
                              }`}
                            >
                              {member.isActive ? 'Aktif' : 'Nonaktif'}
                            </button>
                          )}

                          {!isOwner && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMember(member.id)}
                              title="Hapus akun"
                              aria-label="Hapus akun"
                              className="p-1.5 rounded-lg text-[#8FA4BF] hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div
                        className="mt-2.5 pt-2 border-t border-[#EEF3F8] flex items-center justify-between gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] font-semibold text-[#5B708B]">
                          Peran Akun:
                        </span>
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleUpdateMemberRole(member.id, e.target.value as AccessRole)
                          }
                          className="px-2 py-1 rounded-lg border border-[#DCE5EF] bg-white text-[11px] font-medium text-[#17243D] outline-none focus:border-[#00C98A]"
                        >
                          <option value="super_admin">Super Admin (Full Fitur)</option>
                          <option value="admin">Admin Unit Usaha</option>
                          <option value="editor">Editor Halaman</option>
                          <option value="viewer">Analis / Viewer</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Full Feature Permission Matrix */}
            <div className="lg:col-span-6 bg-white rounded-xl border border-[#DCE5EF] overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-[#EEF3F8] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-[#17243D] truncate">
                    Hak Akses Fitur — {selectedMember?.name || 'Super Admin'}
                  </h3>
                  <p className="text-[11px] text-[#5B708B]">
                    Klik saklar fitur untuk menyesuaikan izin akun terpilih.
                  </p>
                </div>
                {(() => {
                  const enabledCount = ALL_FEATURE_KEYS.filter(
                    (k) =>
                      selectedMember?.role === 'super_admin' ||
                      Boolean(selectedMember?.permissions[k])
                  ).length;
                  return (
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 tabular-nums ${
                        enabledCount === ALL_FEATURE_KEYS.length
                          ? 'bg-[#ECFDF6] text-[#008F63] border-[#00C98A]/40'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {enabledCount === ALL_FEATURE_KEYS.length
                        ? `Full ${enabledCount}/${ALL_FEATURE_KEYS.length}`
                        : `${enabledCount}/${ALL_FEATURE_KEYS.length} Aktif`}
                    </span>
                  );
                })()}
              </div>

              <div className="divide-y divide-[#EEF3F8] max-h-80 overflow-y-auto">
                {ALL_FEATURE_KEYS.map((key) => {
                  const meta = FEATURE_META[key];
                  const allowed =
                    selectedMember?.role === 'super_admin' ||
                    Boolean(selectedMember?.permissions[key]);

                  return (
                    <div
                      key={key}
                      className="px-4 py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#17243D]">
                          {meta.label}
                        </p>
                        <p className="text-[11px] text-[#5B708B]">
                          {meta.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={selectedMember?.role === 'super_admin'}
                        onClick={() =>
                          selectedMember &&
                          handleToggleMemberPermission(selectedMember.id, key)
                        }
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold shrink-0 transition-colors ${
                          allowed
                            ? 'bg-[#ECFDF6] border-[#00C98A]/40 text-[#008F63]'
                            : 'bg-[#F0F5FA] border-[#DCE5EF] text-[#5B708B]'
                        } ${
                          selectedMember?.role === 'super_admin'
                            ? 'cursor-default'
                            : 'cursor-pointer hover:opacity-90'
                        }`}
                      >
                        {allowed ? 'Full Akses' : 'Terkunci'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {selectedMember && selectedMember.role !== 'super_admin' && (
                <div className="p-3.5 border-t border-[#EEF3F8] bg-[#F0F5FA]/60 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold text-[#17243D]">
                      Akses Unit Usaha ({selectedMember.name}):
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        handleSetAllUnitsScope(
                          selectedMember.id,
                          selectedMember.unitScope !== 'all'
                        )
                      }
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer transition-colors ${
                        selectedMember.unitScope === 'all'
                          ? 'bg-[#17243D] border-[#17243D] text-white'
                          : 'bg-white border-[#DCE5EF] text-[#17243D] hover:bg-[#F0F5FA]'
                      }`}
                    >
                      {selectedMember.unitScope === 'all'
                        ? 'Semua Unit Usaha (Aktif)'
                        : 'Beri Akses Semua Unit'}
                    </button>
                  </div>
                  {projects.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {projects.map((proj) => {
                        const included =
                          selectedMember.unitScope === 'all' ||
                          selectedMember.unitScope.includes(proj.id);
                        return (
                          <button
                            key={proj.id}
                            type="button"
                            onClick={() => handleToggleUnitScope(selectedMember.id, proj.id)}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium cursor-pointer transition-colors ${
                              included
                                ? 'bg-[#ECFDF6] border-[#00C98A]/40 text-[#008F63]'
                                : 'bg-white border-[#DCE5EF] text-[#5B708B] hover:border-[#8FA4BF]'
                            }`}
                          >
                            {proj.project.title}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#5B708B]">
                      Belum ada unit usaha tersimpan. Aktifkan &quot;Semua Unit Usaha&quot; agar akun ini otomatis bisa mengakses unit yang dibuat nanti.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#DCE5EF] bg-white flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-[#5B708B] hidden sm:block">
            Mode aktif:{' '}
            <strong className="text-[#008F63]">
              RBAC Kustom &amp; Scope Unit Usaha
            </strong>
          </p>

          <div className="flex items-center gap-2 ml-auto">
            {!asPage && (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-xs font-semibold text-[#17243D] cursor-pointer transition-colors"
              >
                Tutup
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#17243D] hover:bg-[#223456] disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-[#00C98A]" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Setting Akses'}</span>
            </button>
          </div>
        </div>
      </div>
  );

  if (asPage) {
    return cardContent;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[#17243D]/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      {cardContent}
    </div>
  );
}
