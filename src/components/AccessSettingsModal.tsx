import { useMemo, useState } from 'react';
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
  getPresetPermissionsForRole,
} from '../utils/accessControl';
import { createMemberWithPasswordOnServer } from '../utils/authClient';

interface AccessSettingsModalProps {
  settings: AccessSettingsConfig;
  projects: ProjectRecord[];
  onSaveSettings: (
    nextSettings: AccessSettingsConfig
  ) => Promise<{ ok: boolean; settings: AccessSettingsConfig; error?: string }>;
  onSettingsSynced?: (nextSettings: AccessSettingsConfig) => void;
  onClose: () => void;
}

export function AccessSettingsModal({
  settings,
  projects,
  onSaveSettings,
  onSettingsSynced,
  onClose,
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

  const handleUpdateMemberRole = (memberId: string, role: AccessRole) => {
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
    setDraft((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === memberId ? { ...m, isActive: !m.isActive } : m
      ),
      updatedAt: Date.now(),
    }));
  };

  const handleSetAllUnitsScope = (memberId: string, allowAll: boolean) => {
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

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900">
                  Setting Akses &amp; Super Admin
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                  <Crown className="w-3 h-3" />
                  {`${superAdminCount}/${draft.members.length} Super Admin`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Kelola peran RBAC, hak akses fitur, dan cakupan unit usaha tiap anggota tim.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Setting Akses"
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-[#F7F9F8] p-5 space-y-4">
          {feedback && (
            <div
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                feedback.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Security Policy Card (Least-Privilege Enforced) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-emerald-600" />
                  Kebijakan Akses: Least-Privilege RBAC Aktif
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Hanya pengguna pendaftar pertama yang otomatis menjadi Super Admin. Pendaftar publik berikutnya menerima peran least-privilege (Viewer) tanpa izin admin.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  RBAC Terproteksi
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
              <div className="rounded-xl bg-[#F7F9F8] border border-slate-200/80 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Status Workspace
                </p>
                <p className="text-xs font-bold text-emerald-700 mt-0.5">
                  Mode Peran Kustom &amp; Scope
                </p>
              </div>
              <div className="rounded-xl bg-[#F7F9F8] border border-slate-200/80 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Total Akun / Super Admin
                </p>
                <p className="text-xs font-bold text-slate-900 mt-0.5 tabular-nums">
                  {superAdminCount} / {draft.members.length} Akun Super Admin
                </p>
              </div>
              <div className="rounded-xl bg-[#F7F9F8] border border-slate-200/80 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Peran Registrasi Publik
                </p>
                <p className="text-xs font-bold text-slate-700 mt-0.5">
                  {ROLE_META[draft.defaultRole].shortLabel} (Scope Terbatas)
                </p>
              </div>
            </div>
          </div>

          {/* Add Account Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              Tambah Akun Tim / Pengelola
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nama lengkap"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-emerald-500"
                />
              </div>
              <div className="sm:col-span-3">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Email (mis. tim@bisnis.id)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-emerald-500"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Sandi min. 6 kar."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-emerald-500"
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
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:border-emerald-500"
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
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </div>
            </div>

            {newRole !== 'super_admin' && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <label className="inline-flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newUnitScopeAll}
                    onChange={(e) => setNewUnitScopeAll(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    Beri akses ke <strong>Semua Unit Usaha</strong> langsung saat dibuat (bisa dipersempit per unit di bawah)
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Two Column: Members List + Full Permission Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Accounts List */}
            <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900">
                  Daftar Akun ({draft.members.length})
                </h3>
                <span className="text-[11px] text-slate-500">
                  Klik akun untuk cek detail izin
                </span>
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
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
                        isSelected ? 'bg-[#EFF7F4]/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {member.name}
                            </span>
                            {isCurrentSession && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-900 text-white">
                                Aktif Sekarang
                              </span>
                            )}
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${roleInfo.badgeClass}`}
                            >
                              {roleInfo.shortLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {member.email}
                          </p>
                          <p className="text-[10px] text-emerald-700 font-medium mt-1">
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
                              className={`px-2 py-1 rounded-lg border text-[10px] font-semibold cursor-pointer ${
                                member.isActive
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-200 bg-slate-100 text-slate-500'
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
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div
                        className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] font-semibold text-slate-500">
                          Peran Akun:
                        </span>
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleUpdateMemberRole(member.id, e.target.value as AccessRole)
                          }
                          className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-medium text-slate-800 outline-none"
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
            <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 truncate">
                    Hak Akses Fitur — {selectedMember?.name || 'Super Admin'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
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
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
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

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
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
                        <p className="text-xs font-semibold text-slate-900">
                          {meta.label}
                        </p>
                        <p className="text-[11px] text-slate-500">
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
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
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
                <div className="p-3.5 border-t border-slate-100 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold text-slate-700">
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
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                        selectedMember.unitScope === 'all'
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
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
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium cursor-pointer ${
                              included
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-white border-slate-200 text-slate-500'
                            }`}
                          >
                            {proj.project.title}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Belum ada unit usaha tersimpan. Aktifkan &quot;Semua Unit Usaha&quot; agar akun ini otomatis bisa mengakses unit yang dibuat nanti.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Mode aktif:{' '}
            <strong className="text-emerald-700">
              RBAC Kustom &amp; Scope Unit Usaha
            </strong>
          </p>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Setting Akses'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
