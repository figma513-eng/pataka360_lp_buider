import React, { useEffect, useMemo } from 'react';
import {
  Code2,
  Copy,
  Download,
  FileJson,
  FileUp,
  FolderKanban,
  Globe,
  KeyRound,
  ShieldCheck,
  Type,
} from 'lucide-react';
import {
  AccessSettingsConfig,
  ApiSettingsConfig,
  FeaturePermissionsMap,
  ProjectAdsConfig,
  ProjectPublishingConfig,
  ProjectRecord,
} from '../types/builder';
import { AccessSettingsModal } from './AccessSettingsModal';
import { ApiSettingsModal } from './ApiSettingsModal';
import { DomainAndAdsModal } from './DomainAndAdsModal';
import { CodeModal } from './modals/CodeModal';
import { ImportModal, ImportedPayload } from './modals/ImportModal';
import { ProjectsModal } from './modals/ProjectsModal';
import { TampilanSettingsPanel } from './TampilanSettingsPanel';

export type SystemTabId =
  | 'daftar_usaha'
  | 'domain'
  | 'akses'
  | 'api'
  | 'tampilan'
  | 'import'
  | 'backup_html';

interface SystemSettingsPageProps {
  activeTab: SystemTabId;
  onChangeTab: (tab: SystemTabId) => void;
  permissions: FeaturePermissionsMap;
  projects: ProjectRecord[];
  activeRecord: ProjectRecord | null;
  accessSettings: AccessSettingsConfig;
  demoModeAvailable: boolean;
  onDemoSeeded: () => Promise<void> | void;
  onSaveAccessSettings: (
    next: AccessSettingsConfig
  ) => Promise<{ ok: boolean; settings: AccessSettingsConfig; error?: string }>;
  onAccessSettingsSynced: (next: AccessSettingsConfig) => void;
  onApiSaved: (next: ApiSettingsConfig) => void;
  onRestoreCompleted: () => void;
  onSelectProject: (id: string) => void;
  onCreateProject: (mode: 'template' | 'blank') => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onDownloadHtml: (record: ProjectRecord) => void;
  onBackupProject: () => void;
  onBackupAll: () => void;
  onCopyHtml: () => void;
  onImportData: (payload: ImportedPayload) => void;
  onApplyDomainAndAds: (
    nextPublishing: ProjectPublishingConfig,
    nextAdsConfig: ProjectAdsConfig,
    publishNow: boolean
  ) => Promise<{ ok: boolean; error?: string }>;
  onNavigateToAds: () => void;
  onNavigateToDashboard: () => void;
  onNavigateToEditor: () => void;
}

export function SystemSettingsPage({
  activeTab,
  onChangeTab,
  permissions,
  projects,
  activeRecord,
  accessSettings,
  demoModeAvailable,
  onDemoSeeded,
  onSaveAccessSettings,
  onAccessSettingsSynced,
  onApiSaved,
  onRestoreCompleted,
  onSelectProject,
  onCreateProject,
  onDuplicateProject,
  onDeleteProject,
  onDownloadHtml,
  onBackupProject,
  onBackupAll,
  onCopyHtml,
  onImportData,
  onApplyDomainAndAds,
  onNavigateToAds,
  onNavigateToDashboard,
  onNavigateToEditor,
}: SystemSettingsPageProps) {
  const allowedTabs = useMemo(() => {
    const list: { id: SystemTabId; label: string; icon: React.ReactNode }[] = [];
    if (permissions.projects) {
      list.push({
        id: 'daftar_usaha',
        label: 'Daftar Usaha',
        icon: <FolderKanban className="w-3.5 h-3.5" />,
      });
    }
    if (permissions.publishing && activeRecord) {
      list.push({
        id: 'domain',
        label: 'Domain',
        icon: <Globe className="w-3.5 h-3.5" />,
      });
    }
    if (permissions.access_control) {
      list.push({
        id: 'akses',
        label: 'Akses',
        icon: <ShieldCheck className="w-3.5 h-3.5" />,
      });
      list.push({
        id: 'api',
        label: 'Setting API',
        icon: <KeyRound className="w-3.5 h-3.5" />,
      });
      list.push({
        id: 'tampilan',
        label: 'Tampilan',
        icon: <Type className="w-3.5 h-3.5" />,
      });
    }
    if (permissions.export_backup && permissions.projects) {
      list.push({
        id: 'import',
        label: 'Import',
        icon: <FileUp className="w-3.5 h-3.5" />,
      });
    }
    if (permissions.export_backup && activeRecord) {
      list.push({
        id: 'backup_html',
        label: 'Backup & Copy HTML',
        icon: <Code2 className="w-3.5 h-3.5" />,
      });
    }
    return list;
  }, [permissions, activeRecord]);

  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.some((t) => t.id === activeTab)) {
      onChangeTab(allowedTabs[0].id);
    }
  }, [allowedTabs, activeTab, onChangeTab]);

  const effectiveTab = allowedTabs.some((t) => t.id === activeTab)
    ? activeTab
    : allowedTabs[0]?.id;

  return (
    <div className="flex-1 h-full flex flex-col bg-[#F0F5FA] overflow-hidden">
      {/* Horizontal Sub-Tabs Bar */}
      <div className="bg-white border-b border-[#DCE5EF] px-4 sm:px-6 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center gap-1 overflow-x-auto">
          {allowedTabs.map((t) => {
            const isActive = effectiveTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChangeTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-[#00C98A] text-[#17243D]'
                    : 'border-transparent text-[#8FA4BF] hover:text-[#17243D]'
                }`}
              >
                <span className={isActive ? 'text-[#00C98A]' : ''}>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inline Sub-Page Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col">
        {!effectiveTab ? (
          <div className="max-w-lg mx-auto my-auto bg-white rounded-2xl border border-[#DCE5EF] p-6 text-center space-y-2">
            <h2 className="text-sm font-bold text-[#17243D]">
              Tidak Ada Akses Pengaturan Sistem
            </h2>
            <p className="text-xs text-[#8FA4BF]">
              Peran akun Anda tidak memiliki izin untuk pengaturan sistem.
            </p>
          </div>
        ) : effectiveTab === 'daftar_usaha' ? (
          <ProjectsModal
            asPage
            projects={projects}
            activeProjectId={activeRecord?.id ?? ''}
            onSelectProject={(id) => {
              onSelectProject(id);
              onNavigateToEditor();
            }}
            onCreateProject={(mode) => {
              onCreateProject(mode);
              onNavigateToEditor();
            }}
            onDuplicateProject={(id) => {
              onDuplicateProject(id);
              onNavigateToEditor();
            }}
            onDeleteProject={onDeleteProject}
            onDownloadHtml={onDownloadHtml}
            onOpenDomainAndAds={(id) => {
              onSelectProject(id);
              onNavigateToAds();
            }}
            onOpenDashboard={onNavigateToDashboard}
            onBackupAll={onBackupAll}
            onOpenImport={() => onChangeTab('import')}
          />
        ) : effectiveTab === 'domain' && activeRecord ? (
          <DomainAndAdsModal
            asPage
            visibleTabs={['domain']}
            initialTab="domain"
            activeRecord={activeRecord}
            allProjects={projects}
            onApplySettings={onApplyDomainAndAds}
          />
        ) : effectiveTab === 'akses' ? (
          <AccessSettingsModal
            asPage
            settings={accessSettings}
            projects={projects}
            demoModeAvailable={demoModeAvailable}
            onDemoSeeded={onDemoSeeded}
            onSaveSettings={onSaveAccessSettings}
            onSettingsSynced={onAccessSettingsSynced}
          />
        ) : effectiveTab === 'api' ? (
          <ApiSettingsModal
            asPage
            onSaved={onApiSaved}
            onRestoreCompleted={onRestoreCompleted}
          />
        ) : effectiveTab === 'tampilan' ? (
          <TampilanSettingsPanel />
        ) : effectiveTab === 'import' ? (
          <ImportModal
            asPage
            onImport={(payload) => {
              onImportData(payload);
              onNavigateToEditor();
            }}
          />
        ) : effectiveTab === 'backup_html' && activeRecord ? (
          <div className="max-w-5xl w-full mx-auto flex-1 min-h-0 flex flex-col gap-4">
            {/* Quick JSON & HTML Action Cards */}
            <div className="bg-white rounded-2xl border border-[#DCE5EF] p-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-[#17243D]">
                  Backup JSON &amp; Ekspor Halaman Statis
                </h3>
                <p className="text-xs text-[#8FA4BF] mt-0.5">
                  Unduh cadangan proyek dalam format JSON atau salin kode HTML siap pakai.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onBackupProject}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-xs font-semibold text-[#17243D] cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5 text-[#00C98A]" />
                  <span>Backup Usaha Aktif (.json)</span>
                </button>
                <button
                  type="button"
                  onClick={onBackupAll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-xs font-semibold text-[#17243D] cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Backup Semua Usaha ({projects.length})</span>
                </button>
                <button
                  type="button"
                  onClick={onCopyHtml}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#17243D] hover:bg-[#223456] text-xs font-semibold text-white cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-[#00C98A]" />
                  <span>Salin HTML</span>
                </button>
              </div>
            </div>

            <CodeModal
              asPage
              projectId={activeRecord.id}
              project={activeRecord.project}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
