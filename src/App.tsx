import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TopBar, WorkspacePageId } from './components/TopBar';
import { LeftSidebar } from './components/LeftSidebar';
import { MobileCanvas } from './components/MobileCanvas';
import { RightInspector } from './components/RightInspector';
import { DomainAndAdsModal } from './components/DomainAndAdsModal';
import { WaTrafficDashboardModal } from './components/WaTrafficDashboardModal';
import { BusinessSettingsPage } from './components/BusinessSettingsPage';
import { SystemSettingsPage, SystemTabId } from './components/SystemSettingsPage';
import { LoginPage } from './components/LoginPage';
import { ImportedPayload, PreviewModal } from './components/Modals';
import { getBlockThemeStatus, getDefaultBlockBgForTheme } from './utils/blockThemeHelpers';
import {
  AccessRole,
  AccessSettingsConfig,
  AdvanceOptions,
  AuthUser,
  BlockType,
  BottomNavbarConfig,
  BuilderBlock,
  BuilderProject,
  BuilderSubPage,
  PageTheme,
  ProjectAdsConfig,
  ProjectPublishingConfig,
  ProjectRecord,
  ServerSyncState,
  UiAppearanceSettingsConfig,
  WorkspaceBundle,
} from './types/builder';
import {
  INITIAL_PROJECT,
  PREBUILT_SECTIONS,
  PrebuiltSection,
  createBlock,
  createId,
  createSubPage,
  resolveBottomNavbar,
} from './data/presets';
import {
  cloneBlockDeep,
  deleteBlockById,
  duplicateBlockById,
  findBlockById,
  insertBlockIntoActionSheet,
  insertBlocksAtTarget,
  insertChildIntoContainer,
  moveBlockInTree,
  reorderBlockInTree,
  updateBlockById,
} from './utils/treeHelpers';
import { generateProjectHtml } from './utils/htmlExporter';
import { sanitizeBuilderProject } from './utils/htmlSanitizer';
import {
  cloneProjectForNewBusiness,
  createBlankProject,
  createStarterWorkspaceSync,
  downloadTextFile,
  getInitialWorkspaceSync,
  loadWorkspaceScoped,
  normalizeProject,
  saveWorkspaceScoped,
  slugifyFilename,
} from './utils/projectStorage';
import {
  deleteProjectOnServer,
  saveProjectToServer,
} from './utils/analyticsClient';
import {
  resolveProjectPublishing,
  sanitizeSlug,
} from './utils/publishingHelpers';
import {
  createDefaultAccessSettings,
  fetchAccessSettings,
  resolveEffectivePermissions,
  saveAccessSettings,
} from './utils/accessControl';
import {
  clearStoredAuthToken,
  fetchAuthMe,
  fetchProjectsFromServer,
  fetchUiAppearanceSettingsFromServer,
  logoutUser,
} from './utils/authClient';
import { copyTextToClipboard } from './utils/clipboardHelpers';
import { CollabPeer, CollabSocketClient } from './utils/collabClient';
import { UiLabelsProvider } from './contexts/UiLabelsContext';

function mergeServerAndLocalWorkspace(
  localWs: WorkspaceBundle,
  serverProjects: ProjectRecord[] | null,
  scopedUser?: AuthUser | null
): WorkspaceBundle {
  const isScopedAccount =
    Boolean(scopedUser) &&
    scopedUser!.role !== 'super_admin' &&
    scopedUser!.unitScope !== 'all';

  const isLocalDirty = (rec?: ProjectRecord) =>
    Boolean(rec && (rec.updatedAt ?? 0) > (rec.lastSavedAt ?? 0));

  if (isScopedAccount) {
    const allowedIds = new Set(
      Array.isArray(scopedUser!.unitScope) ? scopedUser!.unitScope : []
    );
    const filteredLocal = localWs.projects.filter((p) => allowedIds.has(p.id));
    let list: ProjectRecord[];
    if (serverProjects === null) {
      list = filteredLocal;
    } else {
      const serverIds = new Set(serverProjects.map((s) => s.id));
      const mergedFromServer = serverProjects.map((srvRec) => {
        const localRec = filteredLocal.find((l) => l.id === srvRec.id);
        const normalizedSrv: ProjectRecord = {
          id: srvRec.id,
          revision: typeof srvRec.revision === 'number' ? srvRec.revision : 1,
          project: normalizeProject(srvRec.project),
          updatedAt: typeof srvRec.updatedAt === 'number' ? srvRec.updatedAt : Date.now(),
          lastSavedAt:
            typeof srvRec.lastSavedAt === 'number'
              ? srvRec.lastSavedAt
              : srvRec.updatedAt || Date.now(),
        };
        if (isLocalDirty(localRec)) {
          return {
            ...localRec!,
            revision: localRec!.revision ?? normalizedSrv.revision ?? 1,
          };
        }
        return normalizedSrv;
      });
      // Preserve unsaved local drafts created before first server save
      const unsavedLocalDrafts = filteredLocal.filter(
        (l) => !serverIds.has(l.id) && (l.lastSavedAt ?? 0) === 0
      );
      list = [...mergedFromServer, ...unsavedLocalDrafts];
    }
    const activeExists = list.some((p) => p.id === localWs.activeProjectId);
    return {
      version: 1,
      activeProjectId: activeExists ? localWs.activeProjectId : list[0]?.id || '',
      projects: list,
    };
  }

  if (serverProjects === null) return localWs;

  const byId = new Map<string, ProjectRecord>();
  const serverIds = new Set<string>();
  for (const srvRec of serverProjects) {
    if (!srvRec?.id || !srvRec?.project) continue;
    serverIds.add(srvRec.id);
    const normalizedSrv: ProjectRecord = {
      id: srvRec.id,
      revision: typeof srvRec.revision === 'number' ? srvRec.revision : 1,
      project: normalizeProject(srvRec.project),
      updatedAt: typeof srvRec.updatedAt === 'number' ? srvRec.updatedAt : Date.now(),
      lastSavedAt:
        typeof srvRec.lastSavedAt === 'number' ? srvRec.lastSavedAt : srvRec.updatedAt || Date.now(),
    };
    const existingLocal = localWs.projects.find((l) => l.id === srvRec.id);
    if (!existingLocal) {
      byId.set(srvRec.id, normalizedSrv);
    } else if (isLocalDirty(existingLocal)) {
      // Keep local unsaved edits; retain local base revision so OCC detects remote changes if needed
      byId.set(srvRec.id, {
        ...existingLocal,
        revision: existingLocal.revision ?? normalizedSrv.revision ?? 1,
      });
    } else if (
      (normalizedSrv.revision ?? 1) !== (existingLocal.revision ?? 0) ||
      (normalizedSrv.lastSavedAt ?? 0) >= (existingLocal.lastSavedAt ?? 0)
    ) {
      byId.set(srvRec.id, normalizedSrv);
    } else {
      byId.set(srvRec.id, existingLocal);
    }
  }

  // Only retain local-only entries that have never been saved to server yet;
  // previously synced projects absent from server were deleted remotely.
  for (const localRec of localWs.projects) {
    if (!serverIds.has(localRec.id) && (localRec.lastSavedAt ?? 0) === 0) {
      byId.set(localRec.id, localRec);
    }
  }

  // Drop pristine untouched starter project if server already holds real saved projects
  let mergedList = Array.from(byId.values());
  if (
    serverProjects.length > 0 &&
    mergedList.length > serverProjects.length &&
    localWs.projects.length === 1 &&
    (localWs.projects[0].lastSavedAt ?? 0) === 0 &&
    !isLocalDirty(localWs.projects[0])
  ) {
    const starterId = localWs.projects[0].id;
    if (!serverIds.has(starterId)) {
      mergedList = mergedList.filter((p) => p.id !== starterId);
    }
  }

  const activeExists = mergedList.some((p) => p.id === localWs.activeProjectId);
  return {
    version: 1,
    activeProjectId: activeExists ? localWs.activeProjectId : mergedList[0]?.id || '',
    projects: mergedList,
  };
}

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [requireAuthForBuilder, setRequireAuthForBuilder] = useState(true);
  const [forceLoginView, setForceLoginView] = useState(false);
  const [authMeta, setAuthMeta] = useState<{
    demoModeAvailable: boolean;
    demoAccountsSeeded: boolean;
    roleSummary?: Record<AccessRole, number>;
  }>({
    demoModeAvailable: false,
    demoAccountsSeeded: false,
  });

  const [workspace, setWorkspace] = useState<WorkspaceBundle>(() => getInitialWorkspaceSync());
  const isHydratedRef = useRef(false);
  const hasUserMutatedBeforeHydrationRef = useRef(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => workspace.projects[0]?.project.blocks[0]?.id ?? null
  );
  const [copyWarning, setCopyWarning] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<{ type: 'ok' | 'warn'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [syncState, setSyncState] = useState<ServerSyncState>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [conflictState, setConflictState] = useState<{
    localRecord: ProjectRecord;
    serverRecord?: ProjectRecord;
    currentRevision?: number;
  } | null>(null);
  const retryBackoffRef = useRef(5000);
  const retryTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const lastKeepaliveFlushRef = useRef('');
  const latestProjectUpdatedAtRef = useRef<Record<string, number>>({});
  const lastBackgroundSyncAtRef = useRef(0);
  const backgroundSyncInFlightRef = useRef(false);
  const collabClientRef = useRef<CollabSocketClient | null>(null);
  const activeRecordIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const authUserRef = useRef<AuthUser | null>(null);
  const workspaceRef = useRef<WorkspaceBundle>(workspace);
  const [collabSelfConnId, setCollabSelfConnId] = useState<string | null>(null);
  const [roomPeers, setRoomPeers] = useState<CollabPeer[]>([]);
  const [remoteUpdatePrompt, setRemoteUpdatePrompt] = useState<{
    record: ProjectRecord;
    updatedByName: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activePage, setActivePage] = useState<WorkspacePageId>('editor');
  const [systemSubTab, setSystemSubTab] = useState<SystemTabId>('daftar_usaha');
  const [navbarFocusNonce, setNavbarFocusNonce] = useState<number>(0);
  const [contentFocusNonce, setContentFocusNonce] = useState<number>(0);
  const [layerFocusNonce, setLayerFocusNonce] = useState<number>(0);
  const [accessSettings, setAccessSettings] = useState<AccessSettingsConfig>(() =>
    createDefaultAccessSettings()
  );
  const [uiAppearanceSettings, setUiAppearanceSettings] = useState<UiAppearanceSettingsConfig>({
    labels: {},
    updatedAt: 0,
  });
  const [inspectorMode, setInspectorMode] = useState<'element' | 'navbar'>('element');
  const [activeNavItemId, setActiveNavItemId] = useState<string>('nav_galeri');
  const [activeSubPageId, setActiveSubPageId] = useState<string | null>(null);
  const [pendingCreatedIds, setPendingCreatedIds] = useState<string[]>([]);
  const [undoStackByProject, setUndoStackByProject] = useState<
    Record<string, BuilderProject[]>
  >({});

  const effectivePermissions = useMemo(
    () => resolveEffectivePermissions(accessSettings, authUser),
    [accessSettings, authUser]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (activePage === 'analitik' && !effectivePermissions.analytics) {
      setActivePage('editor');
    } else if (
      activePage === 'ads' &&
      !effectivePermissions.ads_wa &&
      !effectivePermissions.publishing
    ) {
      setActivePage('editor');
    } else if (
      activePage === 'setting_sistem' &&
      !effectivePermissions.publishing &&
      !effectivePermissions.access_control &&
      !effectivePermissions.export_backup &&
      !effectivePermissions.projects
    ) {
      setActivePage('editor');
    }
  }, [activePage, effectivePermissions]);

  const visibleProjects = useMemo(() => {
    if (!authUser) {
      return workspace.projects;
    }
    if (authUser.role === 'super_admin' || authUser.unitScope === 'all') {
      return workspace.projects;
    }
    const allowedIds = Array.isArray(authUser.unitScope) ? authUser.unitScope : [];
    return workspace.projects.filter(
      (p) => allowedIds.includes(p.id) || pendingCreatedIds.includes(p.id)
    );
  }, [workspace.projects, authUser, pendingCreatedIds]);

  const activeRecord: ProjectRecord | null =
    visibleProjects.find((p) => p.id === workspace.activeProjectId) ?? visibleProjects[0] ?? null;
  activeRecordIdRef.current = activeRecord?.id ?? null;
  selectedIdRef.current = selectedId;
  authUserRef.current = authUser;
  workspaceRef.current = workspace;
  const project = activeRecord?.project ?? null;
  const subPages = project?.pages ?? [];
  const activeSubPage =
    activeSubPageId && project?.pages
      ? project.pages.find((pg) => pg.id === activeSubPageId) ?? null
      : null;
  const currentCanvasBlocks = activeSubPage ? activeSubPage.blocks : project?.blocks ?? [];
  const bottomNavbar = project ? resolveBottomNavbar(project) : null;
  const activePublishing = project ? resolveProjectPublishing(project) : null;
  const hasUnsavedChanges = activeRecord
    ? activeRecord.updatedAt > (activeRecord.lastSavedAt ?? 0)
    : false;
  const canUndo = Boolean(
    activeRecord && (undoStackByProject[activeRecord.id]?.length ?? 0) > 0
  );

  const remotePeers = useMemo(
    () => roomPeers.filter((peer) => peer.connectionId !== collabSelfConnId),
    [roomPeers, collabSelfConnId]
  );

  const remotePeersByBlock = useMemo(() => {
    const map: Record<string, CollabPeer[]> = {};
    for (const peer of remotePeers) {
      if (!peer.selectedBlockId) continue;
      if (!map[peer.selectedBlockId]) {
        map[peer.selectedBlockId] = [];
      }
      map[peer.selectedBlockId].push(peer);
    }
    return map;
  }, [remotePeers]);

  const showSaveToast = useCallback((type: 'ok' | 'warn', text: string) => {
    setSaveToast({ type, text });
    setTimeout(() => {
      setSaveToast((prev) => (prev?.text === text ? null : prev));
    }, 3000);
  }, []);

  const hydrateWorkspaceAndSettings = useCallback(async (user: AuthUser | null) => {
    const idbRes = await loadWorkspaceScoped(user?.id);
    if (idbRes.error) {
      setStorageError(idbRes.error);
    } else {
      setStorageError(null);
    }

    let serverProjects: ProjectRecord[] | null = null;
    let loadedAccess: AccessSettingsConfig = createDefaultAccessSettings();
    let loadedAppearance: UiAppearanceSettingsConfig | null = null;

    if (user) {
      const canAccessControl =
        user.role === 'super_admin' || Boolean(user.permissions?.access_control);
      const [fetchedProjects, fetchedAccess, fetchedAppearance] = await Promise.all([
        fetchProjectsFromServer(),
        canAccessControl ? fetchAccessSettings() : Promise.resolve(createDefaultAccessSettings()),
        fetchUiAppearanceSettingsFromServer(),
      ]);
      serverProjects = fetchedProjects;
      loadedAccess = fetchedAccess;
      loadedAppearance = fetchedAppearance;
    } else {
      loadedAppearance = await fetchUiAppearanceSettingsFromServer();
    }

    const merged = mergeServerAndLocalWorkspace(idbRes.workspace, serverProjects, user);
    isHydratedRef.current = true;
    setAccessSettings(loadedAccess);
    if (loadedAppearance) {
      setUiAppearanceSettings(loadedAppearance);
    }

    if (!hasUserMutatedBeforeHydrationRef.current) {
      setWorkspace(merged);
      const loadedActive =
        merged.projects.find((p) => p.id === merged.activeProjectId) ?? merged.projects[0];
      setSelectedId(loadedActive?.project.blocks[0]?.id ?? null);
      if (user && loadedActive && (loadedActive.lastSavedAt ?? 0) >= loadedActive.updatedAt) {
        setSyncState('server_saved');
      } else {
        setSyncState(loadedActive ? 'idle' : 'idle');
      }
    }
  }, []);

  const refreshAuthMeta = useCallback(async () => {
    const me = await fetchAuthMe();
    setNeedsSetup(me.needsSetup);
    setRequireAuthForBuilder(me.requireAuthForBuilder);
    setAuthMeta({
      demoModeAvailable: Boolean(me.demoModeAvailable),
      demoAccountsSeeded: Boolean(me.demoAccountsSeeded),
      roleSummary: me.roleSummary,
    });
    return me;
  }, []);

  useEffect(() => {
    clearStoredAuthToken();
    let cancelled = false;
    (async () => {
      const me = await fetchAuthMe();
      if (cancelled) return;
      setAuthUser(me.user);
      setNeedsSetup(me.needsSetup);
      setRequireAuthForBuilder(me.requireAuthForBuilder);
      setAuthMeta({
        demoModeAvailable: Boolean(me.demoModeAvailable),
        demoAccountsSeeded: Boolean(me.demoAccountsSeeded),
        roleSummary: me.roleSummary,
      });
      setAuthLoading(false);

      if (me.authenticated || !me.requireAuthForBuilder) {
        await hydrateWorkspaceAndSettings(me.user);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrateWorkspaceAndSettings]);

  // Manual Save mode: do not auto-save workspace mutations to localStorage or server.
  // Persistence only occurs when the user explicitly clicks Save (or publishes/manages projects).

  const handleAuthSuccess = async (user: AuthUser) => {
    hasUserMutatedBeforeHydrationRef.current = false;
    isHydratedRef.current = false;
    setAuthUser(user);
    setNeedsSetup(false);
    setForceLoginView(false);
    setPendingCreatedIds([]);
    setConflictState(null);
    await Promise.all([hydrateWorkspaceAndSettings(user), refreshAuthMeta()]);
    showSaveToast('ok', `Selamat datang, ${user.name}.`);
  };

  const handleLogout = async () => {
    await logoutUser();
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    hasUserMutatedBeforeHydrationRef.current = false;
    isHydratedRef.current = false;
    setAuthUser(null);
    setPendingCreatedIds([]);
    setConflictState(null);
    setSyncState('idle');
    setSyncError(null);
    // Reset in-memory workspace immediately so multi-user data never lingers after logout
    const cleanAnon = createStarterWorkspaceSync(false);
    setWorkspace(cleanAnon);
    setSelectedId(cleanAnon.projects[0]?.project.blocks[0]?.id ?? null);
    setAccessSettings(createDefaultAccessSettings());
    setActivePage('editor');
    setSystemSubTab('daftar_usaha');
    const me = await refreshAuthMeta();
    if (me.requireAuthForBuilder) {
      setUiAppearanceSettings({ labels: {}, updatedAt: 0 });
    } else {
      setForceLoginView(true);
    }
  };

  const syncSelectionForProject = (targetProj: BuilderProject) => {
    setActiveSubPageId(null);
    setSelectedId(targetProj.blocks[0]?.id ?? null);
    setInspectorMode('element');
    const nav = resolveBottomNavbar(targetProj);
    const hasCurrentNav = nav.items.some((it) => it.id === activeNavItemId);
    if (!hasCurrentNav && nav.items[0]) {
      setActiveNavItemId(nav.items[0].id);
    }
  };

  const commitProject = (updater: (prev: BuilderProject) => BuilderProject) => {
    if (!activeRecord) return;
    if (!effectivePermissions.editor) {
      showSaveToast('warn', 'Mode baca saja: akun Anda tidak memiliki izin edit kanvas.');
      return;
    }
    if (!isHydratedRef.current) {
      hasUserMutatedBeforeHydrationRef.current = true;
    }
    const currentSnapshot = workspaceRef.current.projects.find(
      (p) => p.id === activeRecord.id
    )?.project;
    if (currentSnapshot) {
      const pid = activeRecord.id;
      setUndoStackByProject((prev) => {
        const stack = prev[pid] ?? [];
        const nextStack = [...stack.slice(-59), currentSnapshot];
        return { ...prev, [pid]: nextStack };
      });
    }
    const editedAt = Date.now();
    latestProjectUpdatedAtRef.current[activeRecord.id] = editedAt;
    retryBackoffRef.current = 5000;
    if (syncState !== 'conflict' && syncState !== 'syncing') {
      setSyncState('pending');
      setSyncError(null);
    }
    setWorkspace((prev) => {
      const idx = prev.projects.findIndex((p) => p.id === activeRecord.id);
      if (idx < 0) return prev;
      const currentProj = prev.projects[idx].project;
      const nextProj = updater(currentProj);

      const nextProjects = [...prev.projects];
      nextProjects[idx] = {
        ...nextProjects[idx],
        project: nextProj,
        updatedAt: editedAt,
      };

      return {
        ...prev,
        projects: nextProjects,
      };
    });
  };

  const handleUndo = useCallback(() => {
    if (!activeRecord) return;
    if (!effectivePermissions.editor) {
      showSaveToast('warn', 'Mode baca saja: akun Anda tidak memiliki izin mengubah kanvas.');
      return;
    }
    const pid = activeRecord.id;
    const stack = undoStackByProject[pid] ?? [];
    if (stack.length === 0) return;

    const previousProject = stack[stack.length - 1];
    setUndoStackByProject((prev) => ({
      ...prev,
      [pid]: (prev[pid] ?? []).slice(0, -1),
    }));

    const editedAt = Date.now();
    latestProjectUpdatedAtRef.current[pid] = editedAt;
    if (syncState !== 'conflict' && syncState !== 'syncing') {
      setSyncState('pending');
      setSyncError(null);
    }

    setWorkspace((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === pid
          ? {
              ...p,
              project: previousProject,
              updatedAt: editedAt,
            }
          : p
      ),
    }));

    if (selectedIdRef.current) {
      const targetSel = selectedIdRef.current;
      const prevNav = resolveBottomNavbar(previousProject);
      const stillExists =
        Boolean(findBlockById(previousProject.blocks, targetSel)) ||
        (previousProject.pages ?? []).some((pg) => Boolean(findBlockById(pg.blocks, targetSel))) ||
        prevNav.items.some((it) => Boolean(findBlockById(it.children, targetSel)));
      if (!stillExists) {
        setSelectedId(previousProject.blocks[0]?.id ?? null);
      }
    }
  }, [activeRecord, effectivePermissions.editor, showSaveToast, syncState, undoStackByProject]);

  const handleSelectProject = (id: string) => {
    if (activeRecord && id === activeRecord.id) return;
    const target = visibleProjects.find((p) => p.id === id);
    if (!target) return;
    if (!isHydratedRef.current) hasUserMutatedBeforeHydrationRef.current = true;
    setWorkspace((prev) => ({ ...prev, activeProjectId: id }));
    syncSelectionForProject(target.project);
  };

  const makeUniqueSlug = (baseSlug: string, excludeId?: string) => {
    const used = new Set(
      workspace.projects
        .filter((p) => p.id !== excludeId)
        .map((p) => sanitizeSlug(p.project.publishing?.slug || p.project.title, ''))
    );
    const clean = sanitizeSlug(baseSlug, 'unit-usaha');
    if (!used.has(clean)) return clean;
    let i = 2;
    while (used.has(`${clean}-${i}`)) i += 1;
    return `${clean}-${i}`;
  };

  const handleCreateProject = (mode: 'template' | 'blank') => {
    if (!effectivePermissions.projects) {
      showSaveToast('warn', 'Akun Anda tidak memiliki izin membuat unit usaha baru.');
      return;
    }
    if (!isHydratedRef.current) hasUserMutatedBeforeHydrationRef.current = true;
    const nextNum = workspace.projects.length + 1;
    const title = `Usaha #${nextNum}`;
    const rawProj =
      mode === 'template'
        ? cloneProjectForNewBusiness(INITIAL_PROJECT, title)
        : createBlankProject(title);
    const uniqueSlug = makeUniqueSlug(rawProj.publishing?.slug || title);
    const newProj: BuilderProject = {
      ...rawProj,
      publishing: {
        ...resolveProjectPublishing(rawProj),
        slug: uniqueSlug,
      },
    };
    const newId = createId('proj');
    const now = Date.now();
    const nextRecord: ProjectRecord = {
      id: newId,
      project: newProj,
      updatedAt: now,
      lastSavedAt: 0,
    };
    setWorkspace((prev) => ({
      ...prev,
      activeProjectId: newId,
      projects: [...prev.projects, nextRecord],
    }));
    setPendingCreatedIds((prev) => [...prev, newId]);
    syncSelectionForProject(newProj);
  };

  const handleDuplicateProject = (id: string) => {
    if (!effectivePermissions.projects) {
      showSaveToast('warn', 'Akun Anda tidak memiliki izin menduplikat unit usaha.');
      return;
    }
    if (!isHydratedRef.current) hasUserMutatedBeforeHydrationRef.current = true;
    const source = visibleProjects.find((p) => p.id === id);
    if (!source) return;
    const rawCloned = cloneProjectForNewBusiness(
      source.project,
      `${source.project.title || 'Usaha'} (Salinan)`
    );
    const uniqueSlug = makeUniqueSlug(rawCloned.publishing?.slug || rawCloned.title);
    const cloned: BuilderProject = {
      ...rawCloned,
      publishing: {
        ...resolveProjectPublishing(rawCloned),
        slug: uniqueSlug,
      },
    };
    const newId = createId('proj');
    const now = Date.now();
    const nextRecord: ProjectRecord = {
      id: newId,
      project: cloned,
      updatedAt: now,
      lastSavedAt: 0,
    };
    setWorkspace((prev) => ({
      ...prev,
      activeProjectId: newId,
      projects: [...prev.projects, nextRecord],
    }));
    setPendingCreatedIds((prev) => [...prev, newId]);
    syncSelectionForProject(cloned);
  };

  const handleDeleteProject = async (id: string) => {
    if (!effectivePermissions.projects) {
      showSaveToast('warn', 'Akun Anda tidak memiliki izin menghapus unit usaha.');
      return;
    }
    if (visibleProjects.length <= 1) return;
    if (!isHydratedRef.current) hasUserMutatedBeforeHydrationRef.current = true;
    const deletedRecord = workspace.projects.find((p) => p.id === id);
    const remainingVisible = visibleProjects.filter((p) => p.id !== id);
    const isDeletingActive = activeRecord ? id === activeRecord.id : false;
    const nextActiveId = isDeletingActive
      ? remainingVisible[0]?.id || ''
      : workspace.activeProjectId;
    delete latestProjectUpdatedAtRef.current[id];
    setConflictState((prev) => (prev?.localRecord.id === id ? null : prev));
    setRemoteUpdatePrompt((prev) => (prev?.record.id === id ? null : prev));
    setWorkspace((prev) => ({
      ...prev,
      activeProjectId: nextActiveId,
      projects: prev.projects.filter((p) => p.id !== id),
    }));
    setPendingCreatedIds((prev) => prev.filter((item) => item !== id));
    if (isDeletingActive && remainingVisible[0]) {
      syncSelectionForProject(remainingVisible[0].project);
    }
    if (authUser && (deletedRecord?.lastSavedAt ?? 0) > 0) {
      const res = await deleteProjectOnServer(id);
      if (!res.ok) {
        showSaveToast(
          'warn',
          res.error || 'Gagal menghapus unit usaha di server; menyinkronkan ulang.'
        );
        if (deletedRecord) {
          setWorkspace((prev) => {
            if (prev.projects.some((p) => p.id === deletedRecord.id)) return prev;
            return {
              ...prev,
              projects: [...prev.projects, deletedRecord],
            };
          });
        }
      }
    } else if (authUser && !deletedRecord) {
      void deleteProjectOnServer(id);
    }
  };

  const handleSelectBlock = (id: string | null) => {
    setSelectedId(id);
    if (id) {
      setInspectorMode('element');
    }
  };

  const handleCanvasSelectBlock = (id: string | null) => {
    handleSelectBlock(id);
    setLayerFocusNonce((n) => n + 1);
    if (id) {
      setContentFocusNonce((n) => n + 1);
    }
  };

  const handleOpenNavbarSettings = (itemId?: string) => {
    setSelectedId(null);
    setInspectorMode('navbar');
    setNavbarFocusNonce((n) => n + 1);
    if (itemId) setActiveNavItemId(itemId);
  };

  const handleUpdateBottomNavbar = (updater: (prev: BottomNavbarConfig) => BottomNavbarConfig) => {
    commitProject((prev) => ({
      ...prev,
      bottomNavbar: updater(resolveBottomNavbar(prev)),
    }));
  };

  const handleSelectSubPage = (pageId: string | null) => {
    if (!project) return;
    setActiveSubPageId(pageId);
    if (!pageId) {
      setSelectedId(project.blocks[0]?.id ?? null);
    } else {
      const targetPg = (project.pages ?? []).find((pg) => pg.id === pageId);
      setSelectedId(targetPg?.blocks[0]?.id ?? null);
    }
    setInspectorMode('element');
  };

  const handleAddSubPage = (): string | null => {
    if (!project) return null;
    if (!effectivePermissions.editor) {
      showSaveToast('warn', 'Akun Anda tidak memiliki izin menambah halaman.');
      return null;
    }
    const nextIndex = (project.pages?.length ?? 0) + 2;
    const created = createSubPage(nextIndex, project.theme);
    commitProject((prev) => ({
      ...prev,
      pages: [...(prev.pages ?? []), created],
    }));
    setActiveSubPageId(created.id);
    setSelectedId(created.blocks[0]?.id ?? null);
    setInspectorMode('element');
    return created.id;
  };

  const handleUpdateSubPage = (pageId: string, patch: Partial<BuilderSubPage>) => {
    commitProject((prev) => ({
      ...prev,
      pages: (prev.pages ?? []).map((pg) => (pg.id === pageId ? { ...pg, ...patch } : pg)),
    }));
  };

  const handleDuplicateSubPage = (pageId: string) => {
    if (!project) return;
    const source = (project.pages ?? []).find((pg) => pg.id === pageId);
    if (!source) return;
    const clone: BuilderSubPage = {
      ...source,
      id: createId('pg'),
      title: `${source.title} (Salinan)`,
      blocks: source.blocks.map(cloneBlockDeep),
    };
    commitProject((prev) => ({
      ...prev,
      pages: [...(prev.pages ?? []), clone],
    }));
    setActiveSubPageId(clone.id);
    setSelectedId(clone.blocks[0]?.id ?? null);
  };

  const handleDeleteSubPage = (pageId: string) => {
    commitProject((prev) => ({
      ...prev,
      pages: (prev.pages ?? []).filter((pg) => pg.id !== pageId),
    }));
    if (activeSubPageId === pageId) {
      setActiveSubPageId(null);
      setSelectedId(project?.blocks[0]?.id ?? null);
    }
  };

  const handleAddChildToActionSheet = (ownerId: string, type: BlockType) => {
    if (!project) return;
    if (!effectivePermissions.editor) {
      showSaveToast('warn', 'Akun Anda tidak memiliki izin menambah elemen.');
      return;
    }
    const newChild = createBlock(type, project.theme);
    commitProject((prev) => {
      const curNav = prev.bottomNavbar;
      return {
        ...prev,
        blocks: insertBlockIntoActionSheet(prev.blocks, ownerId, newChild),
        pages: prev.pages
          ? prev.pages.map((pg) => ({
              ...pg,
              blocks: insertBlockIntoActionSheet(pg.blocks, ownerId, newChild),
            }))
          : prev.pages,
        bottomNavbar: curNav
          ? {
              ...curNav,
              items: curNav.items.map((it) => ({
                ...it,
                children: insertBlockIntoActionSheet(it.children, ownerId, newChild),
              })),
            }
          : curNav,
      };
    });
    setSelectedId(newChild.id);
    setInspectorMode('element');
  };

  const handleAddBlock = (
    type: BlockType,
    targetId?: string,
    position: 'before' | 'after' | 'inside' = 'inside'
  ) => {
    if (!project) return;
    if (!effectivePermissions.editor) {
      showSaveToast('warn', 'Akun Anda tidak memiliki izin menambah blok.');
      return;
    }
    const newBlock = createBlock(type, project.theme);
    const activePageTargetId = activeSubPage?.id ?? null;
    commitProject((prev) => {
      const curNav = resolveBottomNavbar(prev);
      const isNavTarget = targetId && curNav.items.some((it) => it.id === targetId);
      if (isNavTarget && position === 'inside') {
        return {
          ...prev,
          bottomNavbar: {
            ...curNav,
            items: curNav.items.map((it) =>
              it.id === targetId ? { ...it, children: [...it.children, newBlock] } : it
            ),
          },
        };
      }
      if (activePageTargetId && prev.pages?.some((pg) => pg.id === activePageTargetId)) {
        const nextPages = prev.pages.map((pg) => {
          if (pg.id !== activePageTargetId) return pg;
          const nextPgBlocks = targetId
            ? position === 'inside'
              ? insertChildIntoContainer(pg.blocks, targetId, newBlock)
              : insertBlocksAtTarget(pg.blocks, [newBlock], targetId, position)
            : [...pg.blocks, newBlock];
          return { ...pg, blocks: nextPgBlocks };
        });
        return { ...prev, pages: nextPages };
      }
      const nextBlocks = targetId
        ? position === 'inside'
          ? insertChildIntoContainer(prev.blocks, targetId, newBlock)
          : insertBlocksAtTarget(prev.blocks, [newBlock], targetId, position)
        : [...prev.blocks, newBlock];
      const nextNavItems = targetId
        ? curNav.items.map((it) => ({
            ...it,
            children:
              position === 'inside'
                ? insertChildIntoContainer(it.children, targetId, newBlock)
                : insertBlocksAtTarget(it.children, [newBlock], targetId, position),
          }))
        : curNav.items;
      return {
        ...prev,
        blocks: nextBlocks,
        bottomNavbar: prev.bottomNavbar ? { ...curNav, items: nextNavItems } : prev.bottomNavbar,
      };
    });
    setSelectedId(newBlock.id);
    setInspectorMode('element');
  };

  const handleAddSection = (
    section: PrebuiltSection,
    targetId?: string,
    position: 'before' | 'after' | 'inside' = 'after'
  ) => {
    if (!project) return;
    if (!effectivePermissions.editor) {
      showSaveToast('warn', 'Akun Anda tidak memiliki izin menambah seksi.');
      return;
    }
    const created = section.createBlocks(project.theme);
    const activePageTargetId = activeSubPage?.id ?? null;
    commitProject((prev) => {
      if (activePageTargetId && prev.pages?.some((pg) => pg.id === activePageTargetId)) {
        return {
          ...prev,
          pages: prev.pages.map((pg) =>
            pg.id === activePageTargetId
              ? {
                  ...pg,
                  blocks: targetId
                    ? insertBlocksAtTarget(pg.blocks, created, targetId, position)
                    : [...pg.blocks, ...created],
                }
              : pg
          ),
        };
      }
      return {
        ...prev,
        blocks: targetId
          ? insertBlocksAtTarget(prev.blocks, created, targetId, position)
          : [...prev.blocks, ...created],
      };
    });
    if (created[0]) {
      setSelectedId(created[0].id);
      setInspectorMode('element');
    }
  };

  const handleDropSectionById = (
    sectionId: string,
    targetId?: string,
    position: 'before' | 'after' | 'inside' = 'after'
  ) => {
    const section = PREBUILT_SECTIONS.find((s) => s.id === sectionId);
    if (section) {
      handleAddSection(section, targetId, position);
    }
  };

  const handleReorderBlock = (
    draggedId: string,
    targetId: string,
    position: 'before' | 'after' | 'inside'
  ) => {
    commitProject((prev) => {
      const curNav = prev.bottomNavbar;
      return {
        ...prev,
        blocks: reorderBlockInTree(prev.blocks, draggedId, targetId, position),
        pages: prev.pages
          ? prev.pages.map((pg) => ({
              ...pg,
              blocks: reorderBlockInTree(pg.blocks, draggedId, targetId, position),
            }))
          : prev.pages,
        bottomNavbar: curNav
          ? {
              ...curNav,
              items: curNav.items.map((it) => ({
                ...it,
                children: reorderBlockInTree(it.children, draggedId, targetId, position),
              })),
            }
          : curNav,
      };
    });
    setSelectedId(draggedId);
  };

  const remapBlocksForTheme = (
    blocks: BuilderBlock[],
    prevTheme: PageTheme,
    nextTheme: PageTheme
  ): BuilderBlock[] => {
    const eq = (a?: string, b?: string) =>
      Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());

    return blocks.map((blk) => {
      const status = getBlockThemeStatus(blk, prevTheme);
      const isLocal = blk.style.themeOverrideMode === 'local';

      if (isLocal) {
        const nextTextColor = !status.tokens.textColor
          ? nextTheme.textColor
          : blk.style.textColor;
        const nextBgColor =
          !status.tokens.backgroundColor && blk.style.backgroundColor !== 'transparent'
            ? getDefaultBlockBgForTheme(blk, nextTheme)
            : blk.style.backgroundColor;
        const nextBorderColor = !status.tokens.borderColor
          ? nextTheme.borderColor
          : blk.style.borderColor;
        const nextAccent = (val?: string) =>
          !status.tokens.accentColor && eq(val, prevTheme.accentColor)
            ? nextTheme.accentColor
            : val;

        return {
          ...blk,
          style: {
            ...blk.style,
            textColor: nextTextColor,
            backgroundColor: nextBgColor,
            borderColor: nextBorderColor,
          },
          content: {
            ...blk.content,
            buttonBg: nextAccent(blk.content.buttonBg),
            buttonColor: nextAccent(blk.content.buttonColor),
            toggleButtonBg: nextAccent(blk.content.toggleButtonBg),
            sheetTriggerBg: nextAccent(blk.content.sheetTriggerBg),
            socialColor: nextAccent(blk.content.socialColor),
            fnbAccentColor: nextAccent(blk.content.fnbAccentColor),
            categoryActiveBg: nextAccent(blk.content.categoryActiveBg),
            lineColor:
              !status.tokens.borderColor && eq(blk.content.lineColor, prevTheme.borderColor)
                ? nextTheme.borderColor
                : blk.content.lineColor,
          },
          children: blk.children
            ? remapBlocksForTheme(blk.children, prevTheme, nextTheme)
            : undefined,
        };
      }

      return {
        ...blk,
        style: {
          ...blk.style,
          textColor:
            blk.style.useThemeTextColor !== false || eq(blk.style.textColor, prevTheme.textColor)
              ? nextTheme.textColor
              : blk.style.textColor,
          backgroundColor: eq(blk.style.backgroundColor, prevTheme.cardBg)
            ? nextTheme.cardBg
            : blk.style.backgroundColor,
          borderColor: eq(blk.style.borderColor, prevTheme.borderColor)
            ? nextTheme.borderColor
            : blk.style.borderColor,
        },
        content: {
          ...blk.content,
          buttonBg: eq(blk.content.buttonBg, prevTheme.accentColor)
            ? nextTheme.accentColor
            : blk.content.buttonBg,
          buttonColor: eq(blk.content.buttonColor, prevTheme.accentColor)
            ? nextTheme.accentColor
            : blk.content.buttonColor,
          toggleButtonBg: eq(blk.content.toggleButtonBg, prevTheme.accentColor)
            ? nextTheme.accentColor
            : blk.content.toggleButtonBg,
          sheetTriggerBg: eq(blk.content.sheetTriggerBg, prevTheme.accentColor)
            ? nextTheme.accentColor
            : blk.content.sheetTriggerBg,
          socialColor: eq(blk.content.socialColor, prevTheme.accentColor)
            ? nextTheme.accentColor
            : blk.content.socialColor,
          fnbAccentColor: eq(blk.content.fnbAccentColor, prevTheme.accentColor)
            ? nextTheme.accentColor
            : blk.content.fnbAccentColor,
          categoryActiveBg: eq(blk.content.categoryActiveBg, prevTheme.accentColor)
            ? nextTheme.accentColor
            : blk.content.categoryActiveBg,
          lineColor: eq(blk.content.lineColor, prevTheme.borderColor)
            ? nextTheme.borderColor
            : blk.content.lineColor,
        },
        children: blk.children
          ? remapBlocksForTheme(blk.children, prevTheme, nextTheme)
          : undefined,
      };
    });
  };

  const handleSelectTheme = (theme: PageTheme) => {
    const eq = (a?: string, b?: string) =>
      Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());
    commitProject((prev) => {
      const curNav = resolveBottomNavbar(prev);
      return {
        ...prev,
        theme,
        blocks: remapBlocksForTheme(prev.blocks, prev.theme, theme),
        pages: prev.pages
          ? prev.pages.map((pg) => ({
              ...pg,
              blocks: remapBlocksForTheme(pg.blocks, prev.theme, theme),
            }))
          : prev.pages,
        bottomNavbar: {
          ...curNav,
          barBg: eq(curNav.barBg, prev.theme.cardBg) ? theme.cardBg : curNav.barBg,
          textColor: eq(curNav.textColor, prev.theme.textColor) ? theme.textColor : curNav.textColor,
          accentColor: eq(curNav.accentColor, prev.theme.accentColor)
            ? theme.accentColor
            : curNav.accentColor,
          borderColor: eq(curNav.borderColor, prev.theme.borderColor)
            ? theme.borderColor
            : curNav.borderColor,
          items: curNav.items.map((it) => ({
            ...it,
            children: remapBlocksForTheme(it.children, prev.theme, theme),
          })),
        },
      };
    });
  };

  const handleUpdateAdvanceOptions = (patch: Partial<AdvanceOptions>) => {
    commitProject((prev) => ({
      ...prev,
      advanceOptions: {
        ...prev.advanceOptions,
        ...patch,
      },
    }));
  };

  const handleUpdateBlock = (id: string, updater: (block: BuilderBlock) => BuilderBlock) => {
    commitProject((prev) => {
      const curNav = prev.bottomNavbar;
      return {
        ...prev,
        blocks: updateBlockById(prev.blocks, id, updater),
        pages: prev.pages
          ? prev.pages.map((pg) => ({
              ...pg,
              blocks: updateBlockById(pg.blocks, id, updater),
            }))
          : prev.pages,
        bottomNavbar: curNav
          ? {
              ...curNav,
              items: curNav.items.map((it) => ({
                ...it,
                children: updateBlockById(it.children, id, updater),
              })),
            }
          : curNav,
      };
    });
  };

  const handleMoveBlock = (id: string, dir: 'up' | 'down') => {
    commitProject((prev) => {
      const curNav = prev.bottomNavbar;
      return {
        ...prev,
        blocks: moveBlockInTree(prev.blocks, id, dir),
        pages: prev.pages
          ? prev.pages.map((pg) => ({
              ...pg,
              blocks: moveBlockInTree(pg.blocks, id, dir),
            }))
          : prev.pages,
        bottomNavbar: curNav
          ? {
              ...curNav,
              items: curNav.items.map((it) => ({
                ...it,
                children: moveBlockInTree(it.children, id, dir),
              })),
            }
          : curNav,
      };
    });
  };

  const handleDuplicateBlock = (id: string) => {
    if (!project) return;
    if (!effectivePermissions.editor) return;
    const topRes = duplicateBlockById(project.blocks, id);
    if (topRes.clonedId) {
      commitProject((prev) => ({
        ...prev,
        blocks: topRes.nextBlocks,
      }));
      setSelectedId(topRes.clonedId);
      return;
    }
    if (project.pages?.length) {
      let pageClonedId: string | null = null;
      const nextPages = project.pages.map((pg) => {
        const res = duplicateBlockById(pg.blocks, id);
        if (res.clonedId) pageClonedId = res.clonedId;
        return { ...pg, blocks: res.nextBlocks };
      });
      if (pageClonedId) {
        commitProject((prev) => ({
          ...prev,
          pages: nextPages,
        }));
        setSelectedId(pageClonedId);
        return;
      }
    }
    const curNav = resolveBottomNavbar(project);
    let navClonedId: string | null = null;
    const nextNavItems = curNav.items.map((it) => {
      const res = duplicateBlockById(it.children, id);
      if (res.clonedId) navClonedId = res.clonedId;
      return { ...it, children: res.nextBlocks };
    });
    if (navClonedId) {
      commitProject((prev) => ({
        ...prev,
        bottomNavbar: { ...resolveBottomNavbar(prev), items: nextNavItems },
      }));
      setSelectedId(navClonedId);
    }
  };

  const handleDeleteBlock = (id: string) => {
    commitProject((prev) => {
      const curNav = prev.bottomNavbar;
      return {
        ...prev,
        blocks: deleteBlockById(prev.blocks, id),
        pages: prev.pages
          ? prev.pages.map((pg) => ({
              ...pg,
              blocks: deleteBlockById(pg.blocks, id),
            }))
          : prev.pages,
        bottomNavbar: curNav
          ? {
              ...curNav,
              items: curNav.items.map((it) => ({
                ...it,
                children: deleteBlockById(it.children, id),
              })),
            }
          : curNav,
      };
    });
    if (selectedId === id) setSelectedId(null);
  };

  const handleBackup = () => {
    if (!project) return;
    if (!effectivePermissions.export_backup) {
      showSaveToast('warn', 'Akun Anda tidak memiliki izin ekspor/backup.');
      return;
    }
    const json = JSON.stringify(project, null, 2);
    downloadTextFile(
      `${slugifyFilename(project.title, 'lynk-backup')}.json`,
      json,
      'application/json;charset=utf-8'
    );
  };

  const handleBackupAll = () => {
    if (!effectivePermissions.export_backup) {
      showSaveToast('warn', 'Akun Anda tidak memiliki izin backup seluruh usaha.');
      return;
    }
    const json = JSON.stringify(workspace, null, 2);
    downloadTextFile(
      `lynk-semua-usaha-${workspace.projects.length}.json`,
      json,
      'application/json;charset=utf-8'
    );
  };

  const persistActiveRecord = useCallback(
    async (
      targetRecord: ProjectRecord,
      publishNow = false,
      overrideRevision?: number
    ): Promise<{ ok: boolean; conflict?: boolean; error?: string }> => {
      const allowed = publishNow ? effectivePermissions.publishing : effectivePermissions.editor;
      if (!allowed) {
        return {
          ok: false,
          error: publishNow
            ? 'Akun Anda tidak memiliki izin publikasi.'
            : 'Akun Anda hanya memiliki mode lihat (tidak dapat menyimpan perubahan).',
        };
      }
      setIsSaving(true);
      setSyncState('syncing');
      setSyncError(null);

      const recordToSend: ProjectRecord =
        typeof overrideRevision === 'number'
          ? { ...targetRecord, revision: overrideRevision }
          : targetRecord;

      const html = generateProjectHtml(recordToSend.project, { projectId: recordToSend.id });
      const res = await saveProjectToServer(recordToSend, html, publishNow);

      if (res.conflict) {
        setIsSaving(false);
        setSyncState('conflict');
        setSyncError(res.error || 'Konflik revisi dengan versi server.');
        setConflictState({
          localRecord: targetRecord,
          serverRecord: res.serverRecord,
          currentRevision: res.currentRevision,
        });
        return { ok: false, conflict: true, error: res.error };
      }

      if (!res.ok) {
        setIsSaving(false);
        const isAuthOrForbidden = res.status === 401 || res.status === 403 || res.status === 409;
        if (!isAuthOrForbidden) {
          void saveWorkspaceScoped(workspaceRef.current, authUser?.id).then((localRes) => {
            if (!localRes.ok && localRes.error) setStorageError(localRes.error);
          });
        }
        setSyncState(isAuthOrForbidden ? 'error' : 'local_saved');
        setSyncError(res.error || 'Sinkronisasi server tertunda; tersimpan lokal.');
        return { ok: false, error: res.error };
      }

      retryBackoffRef.current = 5000;
      setConflictState(null);
      const savedAt = res.savedAt || Date.now();
      const nextIsPublished =
        typeof res.isPublished === 'boolean'
          ? res.isPublished
          : publishNow || Boolean(targetRecord.project.publishing?.isPublished);

      const syncedRecord: ProjectRecord = {
        ...targetRecord,
        revision: res.revision ?? targetRecord.revision ?? 1,
        updatedAt: savedAt,
        lastSavedAt: savedAt,
        project: {
          ...targetRecord.project,
          publishing: {
            ...resolveProjectPublishing(targetRecord.project),
            slug: res.slug || resolveProjectPublishing(targetRecord.project).slug,
            isPublished: nextIsPublished,
          },
        },
      };

      const nextWorkspaceSnapshot = {
        ...workspaceRef.current,
        projects: workspaceRef.current.projects.map((p) => {
          if (p.id !== targetRecord.id) return p;
          if (p.updatedAt > targetRecord.updatedAt) {
            return {
              ...p,
              revision: syncedRecord.revision,
              lastSavedAt: savedAt,
              project: {
                ...p.project,
                publishing: {
                  ...resolveProjectPublishing(p.project),
                  slug:
                    syncedRecord.project.publishing?.slug ||
                    resolveProjectPublishing(p.project).slug,
                  isPublished: syncedRecord.project.publishing?.isPublished ?? false,
                },
              },
            };
          }
          return syncedRecord;
        }),
      };

      setWorkspace(nextWorkspaceSnapshot);
      void saveWorkspaceScoped(nextWorkspaceSnapshot, authUser?.id).then((localRes) => {
        if (!localRes.ok && localRes.error) {
          setStorageError(localRes.error);
        } else if (localRes.ok) {
          setStorageError(null);
        }
      });

      if (
        authUser &&
        authUser.unitScope !== 'all' &&
        !authUser.unitScope.includes(targetRecord.id)
      ) {
        const me = await fetchAuthMe();
        if (me.user) setAuthUser(me.user);
        setPendingCreatedIds((prev) => prev.filter((id) => id !== targetRecord.id));
      }

      const editedDuringSave =
        (latestProjectUpdatedAtRef.current[targetRecord.id] ?? 0) > targetRecord.updatedAt;
      setSyncState(editedDuringSave ? 'pending' : 'server_saved');
      setSyncError(null);
      setIsSaving(false);
      return res;
    },
    [authUser, effectivePermissions.editor, effectivePermissions.publishing]
  );

  const handleSaveProject = useCallback(async () => {
    if (!activeRecord) return;
    const res = await persistActiveRecord(activeRecord, false);
    if (res.ok) {
      showSaveToast('ok', `Perubahan "${activeRecord.project.title}" berhasil disimpan ke server.`);
    } else if (!res.conflict) {
      showSaveToast('warn', res.error || 'Tersimpan lokal, sinkronisasi server tertunda.');
    }
  }, [activeRecord, persistActiveRecord, showSaveToast]);

  const syncFromServerQuietly = useCallback(
    async (force = false) => {
      if (!authUser || isSaving || conflictState || backgroundSyncInFlightRef.current) return;
      const now = Date.now();
      if (!force && now - lastBackgroundSyncAtRef.current < 3000) return;
      lastBackgroundSyncAtRef.current = now;
      backgroundSyncInFlightRef.current = true;

      try {
        const me = await fetchAuthMe();
        if (!me.authenticated || !me.user) return;

        const nextUser = me.user;
        const canAccessControl =
          nextUser.role === 'super_admin' || Boolean(nextUser.permissions?.access_control);

        const [serverProjects, fetchedAccess, fetchedAppearance] = await Promise.all([
          fetchProjectsFromServer(),
          canAccessControl ? fetchAccessSettings() : Promise.resolve(null),
          fetchUiAppearanceSettingsFromServer(),
        ]);

        setAuthUser((prev) => {
          if (
            prev &&
            prev.role === nextUser.role &&
            prev.isActive === nextUser.isActive &&
            JSON.stringify(prev.unitScope) === JSON.stringify(nextUser.unitScope) &&
            JSON.stringify(prev.permissions) === JSON.stringify(nextUser.permissions)
          ) {
            return prev;
          }
          return nextUser;
        });

        if (fetchedAccess) {
          setAccessSettings(fetchedAccess);
        }
        if (fetchedAppearance) {
          setUiAppearanceSettings((prev) =>
            prev.updatedAt === fetchedAppearance.updatedAt &&
            JSON.stringify(prev.labels) === JSON.stringify(fetchedAppearance.labels)
              ? prev
              : fetchedAppearance
          );
        }

        if (serverProjects) {
          setWorkspace((prev) => {
            const merged = mergeServerAndLocalWorkspace(prev, serverProjects, nextUser);
            const changed =
              merged.activeProjectId !== prev.activeProjectId ||
              merged.projects.length !== prev.projects.length ||
              merged.projects.some((mp, idx) => {
                const lp = prev.projects[idx];
                return (
                  !lp ||
                  lp.id !== mp.id ||
                  (lp.revision ?? 1) !== (mp.revision ?? 1) ||
                  (lp.lastSavedAt ?? 0) !== (mp.lastSavedAt ?? 0)
                );
              });
            if (!changed) return prev;
            return merged;
          });
        }
      } finally {
        backgroundSyncInFlightRef.current = false;
      }
    },
    [authUser, conflictState, isSaving]
  );

  // Real-time WebSocket collaboration connection & room presence
  useEffect(() => {
    if (!authUser) {
      collabClientRef.current?.dispose();
      collabClientRef.current = null;
      setCollabSelfConnId(null);
      setRoomPeers([]);
      setRemoteUpdatePrompt(null);
      return;
    }

    const client = new CollabSocketClient({
      onSelfConnected: (connId) => {
        setCollabSelfConnId(connId);
      },
      onPresenceUpdate: (projectId, peers) => {
        if (projectId === activeRecordIdRef.current) {
          setRoomPeers(peers);
        }
      },
      onProjectUpdated: (evt) => {
        const srvRec = evt.record;
        if (!srvRec?.id || !srvRec?.project) return;
        const normalizedSrv: ProjectRecord = {
          id: srvRec.id,
          revision: typeof srvRec.revision === 'number' ? srvRec.revision : 1,
          project: normalizeProject(srvRec.project),
          updatedAt: typeof srvRec.updatedAt === 'number' ? srvRec.updatedAt : Date.now(),
          lastSavedAt:
            typeof srvRec.lastSavedAt === 'number'
              ? srvRec.lastSavedAt
              : srvRec.updatedAt || Date.now(),
        };

        const currentWs = workspaceRef.current;
        const existingLocal = currentWs.projects.find((p) => p.id === normalizedSrv.id);
        if (!existingLocal) {
          setWorkspace((prev) => {
            if (prev.projects.some((p) => p.id === normalizedSrv.id)) return prev;
            return {
              ...prev,
              activeProjectId: prev.activeProjectId || normalizedSrv.id,
              projects: [...prev.projects, normalizedSrv],
            };
          });
          setConflictState((prev) =>
            prev?.localRecord.id === normalizedSrv.id ? null : prev
          );
          setRemoteUpdatePrompt((prev) =>
            prev?.record.id === normalizedSrv.id ? null : prev
          );
          if (
            normalizedSrv.id === activeRecordIdRef.current &&
            evt.updatedBy.id !== authUserRef.current?.id
          ) {
            setSyncState('server_saved');
            showSaveToast(
              'ok',
              `${evt.updatedBy.name} ${evt.eventType === 'published' ? 'menayangkan' : 'menambahkan'} "${normalizedSrv.project.title}".`
            );
          }
          return;
        }

        const localDirty = existingLocal.updatedAt > (existingLocal.lastSavedAt ?? 0);
        if (localDirty) {
          if (normalizedSrv.id === activeRecordIdRef.current) {
            setRemoteUpdatePrompt({
              record: normalizedSrv,
              updatedByName: evt.updatedBy.name,
            });
          }
          return;
        }

        const localRev = existingLocal.revision ?? 0;
        const srvRev = normalizedSrv.revision ?? 1;
        if (
          srvRev === localRev &&
          (normalizedSrv.lastSavedAt ?? 0) <= (existingLocal.lastSavedAt ?? 0)
        ) {
          return;
        }

        setWorkspace((prev) => ({
          ...prev,
          projects: prev.projects.map((p) => {
            if (p.id !== normalizedSrv.id) return p;
            if (p.updatedAt > (p.lastSavedAt ?? 0)) return p;
            return normalizedSrv;
          }),
        }));
        setConflictState((prev) =>
          prev?.localRecord.id === normalizedSrv.id ? null : prev
        );
        setRemoteUpdatePrompt((prev) =>
          prev?.record.id === normalizedSrv.id ? null : prev
        );
        if (
          normalizedSrv.id === activeRecordIdRef.current &&
          evt.updatedBy.id !== authUserRef.current?.id
        ) {
          setSyncState('server_saved');
          showSaveToast(
            'ok',
            `${evt.updatedBy.name} ${evt.eventType === 'published' ? 'menayangkan' : 'memperbarui'} "${normalizedSrv.project.title}".`
          );
        }
      },
      onProjectDeleted: (evt) => {
        const wasActive = evt.projectId === activeRecordIdRef.current;
        delete latestProjectUpdatedAtRef.current[evt.projectId];
        setWorkspace((prev) => {
          if (!prev.projects.some((p) => p.id === evt.projectId)) return prev;
          const remaining = prev.projects.filter((p) => p.id !== evt.projectId);
          const nextActive =
            prev.activeProjectId === evt.projectId ? remaining[0]?.id ?? '' : prev.activeProjectId;
          return {
            ...prev,
            activeProjectId: nextActive,
            projects: remaining,
          };
        });
        setConflictState((prev) => (prev?.localRecord.id === evt.projectId ? null : prev));
        setRemoteUpdatePrompt((prev) => (prev?.record.id === evt.projectId ? null : prev));
        if (wasActive && evt.deletedBy.id !== authUserRef.current?.id) {
          showSaveToast('warn', `Unit usaha ini dihapus oleh ${evt.deletedBy.name}.`);
        }
      },
      onAccessUpdated: () => {
        void syncFromServerQuietly(true);
      },
      onAppearanceUpdated: (settings) => {
        setUiAppearanceSettings(settings);
      },
      onReconnected: () => {
        void syncFromServerQuietly(true);
      },
    });

    collabClientRef.current = client;
    client.connect();
    client.joinProjectRoom(activeRecordIdRef.current, selectedIdRef.current);

    return () => {
      client.dispose();
      if (collabClientRef.current === client) {
        collabClientRef.current = null;
      }
      setRoomPeers([]);
    };
  }, [authUser?.id, showSaveToast, syncFromServerQuietly]);

  useEffect(() => {
    const client = collabClientRef.current;
    if (!client || !authUser?.id) return;
    setRoomPeers([]);
    setRemoteUpdatePrompt((prev) => (prev?.record.id === activeRecord?.id ? prev : null));
    client.joinProjectRoom(activeRecord?.id ?? null, selectedIdRef.current);
  }, [authUser?.id, activeRecord?.id]);

  useEffect(() => {
    const client = collabClientRef.current;
    if (!client || !authUser?.id || !activeRecord?.id) return;
    client.selectBlock(activeRecord.id, selectedId);
  }, [authUser?.id, activeRecord?.id, selectedId]);

  // Manual Save mode: mark pending state when edits exist, never auto-save to server.
  useEffect(() => {
    if (!isHydratedRef.current || !authUser || !effectivePermissions.editor) return;
    if (!activeRecord) return;
    if (syncState === 'conflict' || isSaving) return;

    const unsaved = activeRecord.updatedAt > (activeRecord.lastSavedAt ?? 0);
    if (unsaved && syncState !== 'local_saved' && syncState !== 'pending') {
      setSyncState('pending');
    }
  }, [activeRecord, authUser, effectivePermissions.editor, isSaving, syncState]);

  // Warn before closing tab if there are unsaved changes (manual Save required)
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedChanges]);

  // Background & focus/visibility multi-user sync (read-only refresh, never auto-saves edits)
  useEffect(() => {
    if (!authUser) return;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void syncFromServerQuietly(false);
      }
    }, 12_000);

    const onFocus = () => {
      void syncFromServerQuietly(false);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncFromServerQuietly(false);
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [authUser, syncFromServerQuietly]);

  useEffect(() => {
    const onOnline = () => {
      if (authUser && !hasUnsavedChanges) {
        void syncFromServerQuietly(true);
      }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [authUser, hasUnsavedChanges, syncFromServerQuietly]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSaveProject();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toUpperCase();
        const isEditable =
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          Boolean(target?.isContentEditable);
        if (!isEditable && canUndo) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canUndo, handleSaveProject, handleUndo]);

  const handleApplyDomainAndAds = async (
    nextPublishing: ProjectPublishingConfig,
    nextAdsConfig: ProjectAdsConfig,
    publishNow: boolean
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!activeRecord) {
      return { ok: false, error: 'Tidak ada unit usaha aktif dalam cakupan akun Anda.' };
    }
    if (!effectivePermissions.publishing && !effectivePermissions.ads_wa) {
      return { ok: false, error: 'Akun Anda tidak memiliki izin pengaturan domain/iklan.' };
    }
    const now = Date.now();
    const updatedProject: BuilderProject = {
      ...activeRecord.project,
      publishing: effectivePermissions.publishing ? nextPublishing : activeRecord.project.publishing,
      adsConfig: effectivePermissions.ads_wa ? nextAdsConfig : activeRecord.project.adsConfig,
    };
    const updatedRecord: ProjectRecord = {
      ...activeRecord,
      project: updatedProject,
      updatedAt: now,
    };
    const res = await persistActiveRecord(updatedRecord, publishNow);
    if (res.ok) {
      showSaveToast(
        'ok',
        publishNow
          ? `Unit usaha tayang di /p/${nextPublishing.slug}`
          : 'Pengaturan Domain, Slug & Iklan tersimpan.'
      );
    }
    return res;
  };

  const handleSaveBusinessSettings = async ({
    title,
    nextPublishing,
    publishNow,
  }: {
    title: string;
    nextPublishing: ProjectPublishingConfig;
    publishNow: boolean;
  }): Promise<{ ok: boolean; error?: string }> => {
    if (!activeRecord) {
      return { ok: false, error: 'Tidak ada unit usaha aktif dalam cakupan akun Anda.' };
    }
    if (!effectivePermissions.editor && !effectivePermissions.publishing) {
      return { ok: false, error: 'Akun Anda tidak memiliki izin pengaturan usaha.' };
    }
    const now = Date.now();
    const updatedProject: BuilderProject = {
      ...activeRecord.project,
      title,
      publishing: effectivePermissions.publishing ? nextPublishing : activeRecord.project.publishing,
    };
    const updatedRecord: ProjectRecord = {
      ...activeRecord,
      project: updatedProject,
      updatedAt: now,
    };
    const res = await persistActiveRecord(updatedRecord, publishNow);
    if (res.ok) {
      showSaveToast(
        'ok',
        publishNow
          ? `Unit usaha tayang di /p/${nextPublishing.slug}`
          : 'Pengaturan identitas & publikasi usaha tersimpan.'
      );
    }
    return res;
  };

  const handleSaveAccessSettings = async (nextSettings: AccessSettingsConfig) => {
    const res = await saveAccessSettings(nextSettings);
    setAccessSettings(res.settings);
    // Refresh current auth user permissions if updated
    const me = await fetchAuthMe();
    if (me.user) setAuthUser(me.user);
    if (res.ok) {
      showSaveToast(
        'ok',
        res.settings.allUsersSuperAdmin
          ? 'Setting akses tersimpan — semua akun aktif sebagai Super Admin (Full Fitur).'
          : 'Setting akses akun berhasil disimpan.'
      );
    } else {
      showSaveToast('warn', res.error || 'Setting akses disimpan lokal.');
    }
    return res;
  };

  const handleDownloadHtml = (targetRecord: ProjectRecord) => {
    if (!effectivePermissions.export_backup) {
      showSaveToast('warn', 'Akun Anda tidak memiliki izin mengunduh HTML.');
      return;
    }
    const html = generateProjectHtml(targetRecord.project, {
      projectId: targetRecord.id,
      publicOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
    });
    downloadTextFile(
      `${slugifyFilename(targetRecord.project.title, 'halaman-usaha')}.html`,
      html,
      'text/html;charset=utf-8'
    );
  };

  const handleImportData = (payload: ImportedPayload) => {
    if (!effectivePermissions.export_backup || !effectivePermissions.projects) {
      showSaveToast('warn', 'Akun Anda tidak memiliki izin mengimpor proyek.');
      return;
    }
    if (!isHydratedRef.current) hasUserMutatedBeforeHydrationRef.current = true;
    if (payload.kind === 'single') {
      const sanitized = sanitizeBuilderProject(payload.project);
      const imported = normalizeProject(sanitized);
      const newId = createId('proj');
      const nextRecord: ProjectRecord = {
        id: newId,
        revision: 1,
        project: imported,
        updatedAt: Date.now(),
        lastSavedAt: 0,
      };
      setWorkspace((prev) => ({
        ...prev,
        activeProjectId: newId,
        projects: [...prev.projects, nextRecord],
      }));
      setPendingCreatedIds((prev) => [...prev, newId]);
      syncSelectionForProject(imported);
      return;
    }

    const importedRecords: ProjectRecord[] = payload.bundle.projects
      .filter((r) => r && r.project && Array.isArray(r.project.blocks) && r.project.theme)
      .map((r) => ({
        id: createId('proj'),
        revision: 1,
        project: normalizeProject(sanitizeBuilderProject(r.project)),
        updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : Date.now(),
        lastSavedAt: 0,
      }));

    if (importedRecords.length === 0) return;

    setWorkspace((prev) => ({
      ...prev,
      activeProjectId: importedRecords[0].id,
      projects: [...prev.projects, ...importedRecords],
    }));
    setPendingCreatedIds((prev) => [...prev, ...importedRecords.map((r) => r.id)]);
    syncSelectionForProject(importedRecords[0].project);
  };

  const handleCopyHtml = async () => {
    if (!activeRecord || !project) return;
    if (!effectivePermissions.export_backup) {
      showSaveToast('warn', 'Akun Anda tidak memiliki izin menyalin HTML.');
      return;
    }
    const html = generateProjectHtml(project, { projectId: activeRecord.id });
    const ok = await copyTextToClipboard(html);
    if (ok) {
      setCopyWarning(null);
      showSaveToast('ok', 'Kode HTML berhasil disalin ke clipboard.');
    } else {
      setSystemSubTab('backup_html');
      setActivePage('setting_sistem');
      setCopyWarning('Browser membatasi akses clipboard otomatis. Gunakan tombol Salin Kode atau Unduh .html.');
      setTimeout(() => setCopyWarning(null), 4000);
    }
  };

  const findBlockAndNavParent = (): {
    block: BuilderBlock | null;
    navItemId: string | null;
    navItemLabel: string | null;
  } => {
    if (!project || !bottomNavbar) return { block: null, navItemId: null, navItemLabel: null };
    const topFound = findBlockById(project.blocks, selectedId);
    if (topFound) return { block: topFound, navItemId: null, navItemLabel: null };
    for (const pg of project.pages ?? []) {
      const pgFound = findBlockById(pg.blocks, selectedId);
      if (pgFound) return { block: pgFound, navItemId: null, navItemLabel: null };
    }
    for (const navItem of bottomNavbar.items) {
      const childFound = findBlockById(navItem.children, selectedId);
      if (childFound) {
        return { block: childFound, navItemId: navItem.id, navItemLabel: navItem.label };
      }
    }
    return { block: null, navItemId: null, navItemLabel: null };
  };

  const {
    block: selectedBlock,
    navItemId: selectedParentNavId,
    navItemLabel: selectedParentNavLabel,
  } = findBlockAndNavParent();

  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-[#F7F9F8] flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl px-6 py-4 shadow-xs text-xs font-semibold text-slate-600">
          Memeriksa sesi akun &amp; koneksi PostgreSQL...
        </div>
      </div>
    );
  }

  if ((requireAuthForBuilder && !authUser) || forceLoginView) {
    return (
      <LoginPage
        needsSetup={needsSetup}
        demoModeAvailable={authMeta.demoModeAvailable}
        demoAccountsSeeded={authMeta.demoAccountsSeeded}
        roleSummary={authMeta.roleSummary}
        onDemoSeeded={async () => {
          await refreshAuthMeta();
        }}
        onSuccess={(user) => void handleAuthSuccess(user)}
      />
    );
  }

  const renderMainWorkspace = () => {
    if (activePage === 'analitik' && effectivePermissions.analytics) {
      return (
        <WaTrafficDashboardModal
          asPage
          projects={visibleProjects}
          activeProjectId={activeRecord?.id ?? ''}
          onSelectProject={handleSelectProject}
          onOpenDomainSettings={(id) => {
            handleSelectProject(id);
            if (effectivePermissions.publishing) {
              setSystemSubTab('domain');
              setActivePage('setting_sistem');
            } else if (effectivePermissions.ads_wa) {
              setActivePage('ads');
            }
          }}
        />
      );
    }

    if (activePage === 'setting_sistem') {
      return (
        <SystemSettingsPage
          activeTab={systemSubTab}
          onChangeTab={setSystemSubTab}
          permissions={effectivePermissions}
          projects={visibleProjects}
          activeRecord={activeRecord}
          accessSettings={accessSettings}
          demoModeAvailable={authMeta.demoModeAvailable}
          onDemoSeeded={async () => {
            await refreshAuthMeta();
          }}
          onSaveAccessSettings={handleSaveAccessSettings}
          onAccessSettingsSynced={(next) => setAccessSettings(next)}
          onApiSaved={(nextApi) => {
            setRequireAuthForBuilder(nextApi.requireAuthForBuilder);
          }}
          onRestoreCompleted={() => {
            hasUserMutatedBeforeHydrationRef.current = false;
            isHydratedRef.current = false;
            void hydrateWorkspaceAndSettings(authUser);
          }}
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProject}
          onDuplicateProject={handleDuplicateProject}
          onDeleteProject={handleDeleteProject}
          onDownloadHtml={handleDownloadHtml}
          onBackupProject={handleBackup}
          onBackupAll={handleBackupAll}
          onCopyHtml={() => void handleCopyHtml()}
          onImportData={handleImportData}
          onApplyDomainAndAds={handleApplyDomainAndAds}
          onNavigateToAds={() => {
            if (effectivePermissions.ads_wa || effectivePermissions.publishing) {
              setActivePage('ads');
            }
          }}
          onNavigateToDashboard={() => {
            if (effectivePermissions.analytics) {
              setActivePage('analitik');
            }
          }}
          onNavigateToEditor={() => setActivePage('editor')}
        />
      );
    }

    if (!activeRecord || !project || !bottomNavbar) {
      return (
        <div className="flex-1 flex items-center justify-center p-6 bg-[#F0F5FA]">
          <div className="max-w-md w-full bg-white rounded-2xl border border-[#DCE5EF] p-6 text-center space-y-3 shadow-xs">
            <h2 className="text-base font-bold text-[#17243D]">
              Belum Ada Unit Usaha di Cakupan Akun Anda
            </h2>
            <p className="text-xs text-[#51637D] leading-relaxed">
              Akun Anda aktif dengan peran terbatas dan belum diberikan akses ke proyek mana pun. Hubungi Super Admin untuk menetapkan Unit Usaha ke akun Anda.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              {authUser && (
                <button
                  type="button"
                  onClick={() => void syncFromServerQuietly(true)}
                  className="px-4 py-2 rounded-xl border border-[#00C98A]/40 bg-[#ECFDF6] hover:bg-[#D1FAE5] text-[#17243D] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cek Ulang Akses &amp; Unit Usaha
                </button>
              )}
              {effectivePermissions.projects && (
                <button
                  type="button"
                  onClick={() => handleCreateProject('template')}
                  className="px-4 py-2 rounded-xl bg-[#17243D] hover:bg-[#223456] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Buat Unit Usaha Baru
                </button>
              )}
              {authUser && (
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="px-4 py-2 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-[#17243D] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Keluar Akun
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (activePage === 'ads' && (effectivePermissions.ads_wa || effectivePermissions.publishing)) {
      return (
        <DomainAndAdsModal
          asPage
          visibleTabs={['pixels', 'wa_addon']}
          initialTab="pixels"
          activeRecord={activeRecord}
          allProjects={visibleProjects}
          onApplySettings={handleApplyDomainAndAds}
        />
      );
    }

    if (activePage === 'setting_usaha') {
      return (
        <BusinessSettingsPage
          activeRecord={activeRecord}
          allProjects={visibleProjects}
          permissions={effectivePermissions}
          canDelete={visibleProjects.length > 1}
          onSaveBusinessSettings={handleSaveBusinessSettings}
          onDuplicateProject={(id) => {
            handleDuplicateProject(id);
            setActivePage('editor');
          }}
          onDeleteProject={(id) => {
            void handleDeleteProject(id);
            setActivePage('editor');
          }}
          onDownloadHtml={handleDownloadHtml}
          onBackupProject={handleBackup}
          onOpenSystemTab={(tab) => {
            setSystemSubTab(tab);
            setActivePage('setting_sistem');
          }}
        />
      );
    }

    return (
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar
          onAddBlock={(type) => handleAddBlock(type)}
          onAddSection={(section) => handleAddSection(section)}
          blocks={currentCanvasBlocks}
          pages={subPages}
          activeSubPageId={activeSubPage?.id ?? null}
          onSelectSubPage={handleSelectSubPage}
          onAddSubPage={handleAddSubPage}
          onUpdateSubPage={handleUpdateSubPage}
          onDuplicateSubPage={handleDuplicateSubPage}
          onDeleteSubPage={handleDeleteSubPage}
          selectedId={selectedBlock?.id ?? null}
          theme={project.theme}
          advanceOptions={project.advanceOptions}
          bottomNavbar={bottomNavbar}
          activeNavItemId={activeNavItemId}
          navbarFocusNonce={navbarFocusNonce}
          layerFocusNonce={layerFocusNonce}
          onSelectTheme={handleSelectTheme}
          onUpdateAdvanceOptions={handleUpdateAdvanceOptions}
          onUpdateBottomNavbar={handleUpdateBottomNavbar}
          onSelectNavItem={setActiveNavItemId}
          onSelectBlock={handleSelectBlock}
          onMoveBlock={handleMoveBlock}
          onReorderBlock={handleReorderBlock}
          onDuplicateBlock={handleDuplicateBlock}
          onDeleteBlock={handleDeleteBlock}
          onAddChildToContainer={(containerId, type) => handleAddBlock(type, containerId)}
        />

        <MobileCanvas
          blocks={currentCanvasBlocks}
          pages={subPages}
          activeSubPageId={activeSubPage?.id ?? null}
          onSelectSubPage={handleSelectSubPage}
          onAddSubPage={handleAddSubPage}
          theme={project.theme}
          advanceOptions={project.advanceOptions}
          bottomNavbar={bottomNavbar}
          inspectorMode={inspectorMode}
          selectedId={selectedId}
          remotePeersByBlock={remotePeersByBlock}
          canUndo={canUndo}
          onUndo={handleUndo}
          onOpenPreview={() => setShowPreview(true)}
          onSelectBlock={handleCanvasSelectBlock}
          onOpenNavbarSettings={handleOpenNavbarSettings}
          onMoveBlock={handleMoveBlock}
          onDuplicateBlock={handleDuplicateBlock}
          onDeleteBlock={handleDeleteBlock}
          onToggleFullBleed={(id) =>
            handleUpdateBlock(id, (blk) => {
              const nextFull = !blk.style.fullBleed;
              return {
                ...blk,
                style: {
                  ...blk.style,
                  fullBleed: nextFull,
                  widthPercent: nextFull ? 100 : blk.style.widthPercent,
                },
              };
            })
          }
          onDropNewBlock={handleAddBlock}
          onDropSection={handleDropSectionById}
          onReorderBlock={handleReorderBlock}
        />

        <RightInspector
          selectedBlock={selectedBlock}
          allBlocks={currentCanvasBlocks}
          pages={subPages}
          activeSubPageId={activeSubPage?.id ?? null}
          onSelectSubPage={handleSelectSubPage}
          onAddSubPage={handleAddSubPage}
          onAddChildToActionSheet={handleAddChildToActionSheet}
          theme={project.theme}
          advanceOptions={project.advanceOptions}
          selectedParentNavId={selectedParentNavId}
          selectedParentNavLabel={selectedParentNavLabel}
          contentFocusNonce={contentFocusNonce}
          onOpenNavbarSettings={handleOpenNavbarSettings}
          onUpdateAdvanceOptions={handleUpdateAdvanceOptions}
          onUpdateBlock={handleUpdateBlock}
          onDuplicateBlock={handleDuplicateBlock}
          onAddChildToContainer={(containerId, type) => handleAddBlock(type, containerId)}
          onSelectBlock={handleSelectBlock}
        />
      </div>
    );
  };

  return (
    <UiLabelsProvider
      settings={uiAppearanceSettings}
      onSettingsChange={setUiAppearanceSettings}
    >
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#F0F5FA] text-[#17243D] relative">
      <TopBar
        activePage={activePage}
        onNavigatePage={(page) => setActivePage(page)}
        projects={visibleProjects}
        activeProjectId={activeRecord?.id ?? ''}
        projectTitle={project?.title ?? 'Belum Ada Unit Usaha'}
        projectSlug={activePublishing?.slug ?? ''}
        isPublished={activePublishing?.isPublished ?? false}
        permissions={effectivePermissions}
        authUser={authUser}
        activePeers={remotePeers}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        syncState={syncState}
        syncError={syncError}
        revision={activeRecord?.revision}
        onSelectProject={handleSelectProject}
        onCreateProject={(mode) => {
          handleCreateProject(mode);
          setActivePage('editor');
        }}
        onOpenProjectsManager={() => {
          setSystemSubTab('daftar_usaha');
          setActivePage('setting_sistem');
        }}
        onSaveProject={() => void handleSaveProject()}
        onOpenPreview={() => setShowPreview(true)}
        onOpenLogin={() => setForceLoginView(true)}
        onLogout={() => void handleLogout()}
      />

      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {renderMainWorkspace()}
      </main>

      {showPreview && activeRecord && project && (
        <PreviewModal
          projectId={activeRecord.id}
          project={project}
          onClose={() => setShowPreview(false)}
        />
      )}
      {storageError && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-[60] max-w-lg w-[92vw] px-4 py-2.5 rounded-xl bg-rose-950 text-rose-50 text-xs font-medium shadow-lg border border-rose-700/60 flex items-center justify-between gap-3">
          <span>{storageError}</span>
          <button
            type="button"
            onClick={() => setStorageError(null)}
            className="px-2 py-0.5 rounded bg-rose-800 hover:bg-rose-700 text-[11px] font-bold shrink-0 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}
      {conflictState && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Konflik Versi Proyek Terdeteksi
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Proyek <strong className="font-semibold">{conflictState.localRecord.project.title}</strong> telah diubah dari tab atau sesi lain (revisi server saat ini:{' '}
              <span className="font-mono font-bold">v{conflictState.currentRevision ?? '?'}</span>). Pilih tindakan agar tidak ada perubahan yang hilang secara diam-diam:
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {conflictState.serverRecord && (
                <button
                  type="button"
                  onClick={() => {
                    const srv = conflictState.serverRecord!;
                    const normalized: ProjectRecord = {
                      ...srv,
                      project: normalizeProject(srv.project),
                    };
                    setWorkspace((prev) => ({
                      ...prev,
                      projects: prev.projects.map((p) => (p.id === normalized.id ? normalized : p)),
                    }));
                    setConflictState(null);
                    setSyncState('server_saved');
                    setSyncError(null);
                    showSaveToast('ok', `Memuat versi server terbaru (v${normalized.revision ?? 1}).`);
                  }}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Muat Versi Server Terbaru
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const target = conflictState.localRecord;
                  const targetRev = conflictState.currentRevision;
                  setConflictState(null);
                  void persistActiveRecord(target, false, targetRev).then((res) => {
                    if (res.ok) {
                      showSaveToast('ok', 'Server diperbarui dengan perubahan lokal Anda.');
                    }
                  });
                }}
                className="flex-1 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
              >
                Timpa Server dengan Versi Saya
              </button>
            </div>
          </div>
        </div>
      )}
      {remoteUpdatePrompt && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[65] max-w-lg w-[92vw] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs shadow-xl border border-slate-700 flex items-center justify-between gap-3">
          <span className="leading-snug">
            <strong className="font-semibold">{remoteUpdatePrompt.updatedByName}</strong> menyimpan versi baru (v{remoteUpdatePrompt.record.revision ?? 1}). Muat versi terbaru atau lanjutkan editan Anda.
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                const target = remoteUpdatePrompt.record;
                setWorkspace((prev) => ({
                  ...prev,
                  projects: prev.projects.map((p) => (p.id === target.id ? target : p)),
                }));
                setRemoteUpdatePrompt(null);
                setSyncState('server_saved');
                showSaveToast('ok', `Tampilan diperbarui ke versi v${target.revision ?? 1}.`);
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold cursor-pointer"
            >
              Muat Update
            </button>
            <button
              type="button"
              onClick={() => setRemoteUpdatePrompt(null)}
              className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-medium cursor-pointer"
            >
              Abaikan
            </button>
          </div>
        </div>
      )}
      {saveToast && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-xl text-xs font-semibold shadow-lg border ${
            saveToast.type === 'ok'
              ? 'bg-emerald-950 text-emerald-50 border-emerald-700/60'
              : 'bg-amber-950 text-amber-50 border-amber-700/60'
          }`}
        >
          {saveToast.text}
        </div>
      )}
      {copyWarning && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-xl bg-amber-950 text-amber-50 text-xs font-medium shadow-lg border border-amber-700/60">
          {copyWarning}
        </div>
      )}
    </div>
    </UiLabelsProvider>
  );
}
