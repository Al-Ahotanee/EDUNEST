import React, { useState } from 'react';

interface SchoolLogoImageProps {
  logo?: string | null;
  name?: string;
  className?: string;
  fallbackClassName?: string;
  size?: number;
}

export function SchoolLogoImage({
  logo,
  name,
  className = 'h-12 w-12 object-contain rounded-xl shadow-sm',
  fallbackClassName = 'h-12 w-12 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md',
}: SchoolLogoImageProps) {
  const [error, setError] = useState(false);

  if (logo && !error) {
    return (
      <img
        src={logo}
        alt={name || 'School Logo'}
        className={className}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div
      className={fallbackClassName}
      style={{ backgroundColor: 'var(--color-primary, #1a56db)' }}
    >
      {name?.[0] || 'S'}
    </div>
  );
}
