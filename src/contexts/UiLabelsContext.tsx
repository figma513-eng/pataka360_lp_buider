import React, { createContext, useCallback, useContext, useMemo } from 'react';
import type {
  UiAppearanceHiddenMap,
  UiAppearanceLabelsMap,
  UiAppearanceSettingsConfig,
} from '../types/builder';
import { isUiLabelVisible, resolveUiLabel } from '../utils/uiAppearanceLabels';

export interface UiLabelsContextValue {
  labels: UiAppearanceLabelsMap;
  hiddenKeys: UiAppearanceHiddenMap;
  updatedAt: number;
  label: (key: string, fallback?: string) => string;
  isVisible: (key: string) => boolean;
  setAppearanceSettings: (next: UiAppearanceSettingsConfig) => void;
}

const DEFAULT_CONTEXT: UiLabelsContextValue = {
  labels: {},
  hiddenKeys: {},
  updatedAt: 0,
  label: (key, fallback) => resolveUiLabel(undefined, key, fallback),
  isVisible: () => true,
  setAppearanceSettings: () => {},
};

const UiLabelsContext = createContext<UiLabelsContextValue>(DEFAULT_CONTEXT);

interface UiLabelsProviderProps {
  settings: UiAppearanceSettingsConfig;
  onSettingsChange: (next: UiAppearanceSettingsConfig) => void;
  children: React.ReactNode;
}

export function UiLabelsProvider({
  settings,
  onSettingsChange,
  children,
}: UiLabelsProviderProps) {
  const labels = settings.labels;
  const hiddenKeys = settings.hiddenKeys ?? {};
  const updatedAt = settings.updatedAt;

  const label = useCallback(
    (key: string, fallback?: string) => resolveUiLabel(labels, key, fallback),
    [labels]
  );

  const isVisible = useCallback(
    (key: string) => isUiLabelVisible(hiddenKeys, key),
    [hiddenKeys]
  );

  const value = useMemo<UiLabelsContextValue>(
    () => ({
      labels,
      hiddenKeys,
      updatedAt,
      label,
      isVisible,
      setAppearanceSettings: onSettingsChange,
    }),
    [labels, hiddenKeys, updatedAt, label, isVisible, onSettingsChange]
  );

  return <UiLabelsContext.Provider value={value}>{children}</UiLabelsContext.Provider>;
}

export function useUiLabel() {
  return useContext(UiLabelsContext);
}
