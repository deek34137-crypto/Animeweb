import React from 'react';
import type { ParsedCue, SubtitleFragment, SubtitleStyle } from '@/lib/player/types';

interface FragmentRendererProps {
  fragment: SubtitleFragment;
}

const SubtitleFragmentRenderer: React.FC<FragmentRendererProps> = ({ fragment }) => {
  if (fragment.type === 'text') {
    return <>{fragment.text}</>;
  }

  const children = fragment.children && fragment.children.length > 0
    ? fragment.children.map((child, idx) => (
        <SubtitleFragmentRenderer key={idx} fragment={child} />
      ))
    : fragment.text;

  switch (fragment.type) {
    case 'bold':
      return <strong className="font-bold">{children}</strong>;
    case 'italic':
      return <em className="italic">{children}</em>;
    case 'underline':
      return <span className="underline">{children}</span>;
    case 'ruby':
      return <ruby className="ruby">{children}</ruby>;
    case 'rt':
      return <rt className="rt text-[0.6em] block text-center">{children}</rt>;
    case 'class':
      return <span className={fragment.attributes?.class}>{children}</span>;
    case 'voice':
      return <span data-voice={fragment.attributes?.voice}>{children}</span>;
    default:
      return <>{children}</>;
  }
};

interface SubtitleOverlayProps {
  activeCues: ParsedCue[];
  style: SubtitleStyle;
}

export default function SubtitleOverlay({ activeCues, style }: SubtitleOverlayProps) {
  if (!activeCues || activeCues.length === 0) return null;

  // Compile container CSS inline styles from SubtitleStyle
  const getTextStyle = (): React.CSSProperties => {
    const textStyles: React.CSSProperties = {
      fontFamily: style.fontFamily,
      fontSize: `calc((1.2rem + 0.8vw) * ${style.fontSizeMultiplier})`,
      color: style.textColor,
      lineHeight: '1.4',
    };

    // Apply Background Modes
    switch (style.backgroundMode) {
      case 'none':
        textStyles.backgroundColor = 'transparent';
        textStyles.textShadow = 'none';
        break;
      case 'shadow':
        textStyles.backgroundColor = 'transparent';
        // Multi-directional stroke text shadow for clear readability on any background
        textStyles.textShadow = `
          -1.5px -1.5px 0 #000,  
           1.5px -1.5px 0 #000,
          -1.5px  1.5px 0 #000,
           1.5px  1.5px 0 #000,
           0px 2px 4px rgba(0,0,0,0.8)
        `;
        break;
      case 'semi-transparent':
        textStyles.backgroundColor = 'rgba(0, 0, 0, 0.65)';
        textStyles.textShadow = 'none';
        break;
      case 'solid':
        textStyles.backgroundColor = '#000000';
        textStyles.textShadow = 'none';
        break;
    }

    return textStyles;
  };

  const textStyle = getTextStyle();

  return (
    <div 
      className="absolute left-1/2 -translate-x-1/2 w-full max-w-[90%] text-center pointer-events-none select-none z-20 flex flex-col items-center gap-1.5 transition-all duration-150"
      style={{ bottom: `${style.verticalPosition}%` }}
    >
      {activeCues.map((cue, cueIdx) => (
        <div key={cue.startTime + '-' + cueIdx} className="flex justify-center">
          <span 
            className="px-3 py-1 rounded-md text-center max-w-full inline-block backdrop-blur-[0.5px]"
            style={textStyle}
          >
            {cue.fragments.map((frag, fragIdx) => (
              <SubtitleFragmentRenderer key={fragIdx} fragment={frag} />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
