import React from 'react';
import { SocialPlatform } from '../types/builder';
import { SOCIAL_PLATFORMS } from '../utils/socialIcons';

export function SocialGlyph({
  platform,
  className = 'w-4 h-4',
  style,
}: {
  platform: SocialPlatform;
  className?: string;
  style?: React.CSSProperties;
}) {
  const meta = SOCIAL_PLATFORMS[platform];
  return (
    <svg
      viewBox={meta.viewBox}
      className={className}
      style={style}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: meta.svgInner }}
    />
  );
}
