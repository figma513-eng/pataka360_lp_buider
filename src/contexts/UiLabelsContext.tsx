import React, { createContext, useCallback, useContext, useMemo } from 'react';
import type { UiAppearanceLabelsMap, UiAppearanceSettingsConfig } from '../types/builder';
import { resolveUiLabel } from '../utils/uiAppearanceLabels';

export interface UiLabelsContextValue {
  labels: UiAppearanceLabelsMap;
  updatedAt: number;
  label: (key: string, fallback?: string) => string;
  setAppearanceSettings: (next: UiAppearanceSettingsConfig) => void;
}

const DEFAULT_CONTEXT: UiLabelsContextValue = {
  labels: {},
  updatedAt: 0,
  label: (key, fallback) => resolveUiLabel(undefined, key, fallback),
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
  const updatedAt = settings.updatedAt;

  const label = useCallback(
    (key: string, fallback?: string) => resolveUiLabel(labels, key, fallback),
    [labels]
  );

  const value = useMemo<UiLabelsContextValue>(
    () => ({
      labels,
      updatedAt,
      label,
      setAppearanceSettings: onSettingsChange,
    }),
    [labels, updatedAt, label, onSettingsChange]
  );

  return <UiLabelsContext.Provider value={value}>{children}</UiLabelsContext.Provider>;
}

export function useUiLabel() {
  return useContext(UiLabelsContext);
}
