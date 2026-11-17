import React from 'react';
import { ButtonIconId } from '../types/builder';
import { BUTTON_ICONS_MAP, sanitizeIconUrl } from '../utils/buttonIcons';

export function ButtonGlyph({
  icon,
  iconUrl,
  className = 'w-4 h-4 shrink-0',
  style,
}: {
  icon: ButtonIconId;
  iconUrl?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const safeUrl = sanitizeIconUrl(iconUrl);
  if (safeUrl) {
    return (
      <img
        src={safeUrl}
        alt=""
        referrerPolicy="no-referrer"
        style={{ objectFit: 'contain', ...style }}
        className={className}
      />
    );
  }

  if (!icon || icon === 'none') return null;
  const meta = BUTTON_ICONS_MAP[icon];
  if (!meta || !meta.svgInner) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: meta.svgInner }}
    />
  );
}
