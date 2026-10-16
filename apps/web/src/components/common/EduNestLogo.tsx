import React from 'react';

interface EduNestLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'dark' | 'light' | 'auto';
  subtext?: string;
}

export const EduNestIcon: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background isometric shield/nest cradle */}
      <path
        d="M24 44L7 34.5V17L24 7.5L41 17V34.5L24 44Z"
        fill="currentColor"
        className="text-slate-900 dark:text-white"
        fillOpacity="0.06"
      />
      {/* Outer Nest Platform Base */}
      <path
        d="M12 28.5L24 35.5L36 28.5L40 31L24 40.5L8 31L12 28.5Z"
        fill="currentColor"
        className="text-slate-900 dark:text-white"
      />
      {/* Open Knowledge Pages / Wings */}
      <path
        d="M14 18.5V28L24 33.5V24L14 18.5Z"
        fill="#0284c7"
      />
      <path
        d="M34 18.5V28L24 33.5V24L34 18.5Z"
        fill="#0369a1"
      />
      {/* Center Knowledge Crest (Emerald Accent) */}
      <path
        d="M24 23.5L20 21L24 18.5L28 21L24 23.5Z"
        fill="#10b981"
      />
      {/* Mortarboard / Academic Cap Apex */}
      <path
        d="M24 6L11 13.5L24 21L37 13.5L24 6Z"
        fill="currentColor"
        className="text-slate-900 dark:text-white"
      />
      {/* Tassel line & drop */}
      <path
        d="M37 13.5V19.5"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const EduNestLogo: React.FC<EduNestLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  variant = 'auto',
  subtext = 'School Operating System'
}) => {
  const iconSizes = {
    sm: 24,
    md: 32,
    lg: 40,
    xl: 52,
  };

  const titleSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  const subtextSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-[11px]',
    xl: 'text-[12px]',
  };

  const textColorClass =
    variant === 'light'
      ? 'text-white'
      : variant === 'dark'
      ? 'text-slate-900'
      : 'text-slate-900 dark:text-white';

  const subtextColorClass =
    variant === 'light'
      ? 'text-slate-400'
      : variant === 'dark'
      ? 'text-slate-500'
      : 'text-slate-500 dark:text-slate-400';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div className="relative flex-shrink-0 flex items-center justify-center">
        <EduNestIcon size={iconSizes[size]} />
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-extrabold tracking-tight font-sans ${titleSizes[size]} ${textColorClass}`}
              style={{ letterSpacing: '-0.03em' }}
            >
              EDUNEST
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mb-0.5" />
          </div>
          {subtext && (
            <span
              className={`uppercase font-medium tracking-widest mt-0.5 ${subtextSizes[size]} ${subtextColorClass}`}
              style={{ letterSpacing: '0.12em' }}
            >
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default EduNestLogo;
