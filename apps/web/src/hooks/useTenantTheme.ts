import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export function applyThemeColors(theme?: { primaryColor?: string; secondaryColor?: string; name?: string; logo?: string }) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const primary = theme?.primaryColor || '#1a56db';
  const secondary = theme?.secondaryColor || '#7e3af2';

  root.style.setProperty('--color-primary', primary);
  root.style.setProperty('--color-primary-rgb', hexToRgb(primary));
  root.style.setProperty('--color-secondary', secondary);
  root.style.setProperty('--color-secondary-rgb', hexToRgb(secondary));

  if (theme?.name) {
    document.title = `${theme.name} — EduNest`;
  }

  if (theme?.logo) {
    const link = (document.querySelector("link[rel*='icon']") || document.createElement('link')) as HTMLLinkElement;
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = theme.logo;
    document.getElementsByTagName('head')[0]?.appendChild(link);
  }
}

export function useTenantTheme() {
  const user = useAuthStore(s => s.user);
  const tenant = user?.tenant;

  useEffect(() => {
    if (!tenant) return;

    applyThemeColors({
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
      name: tenant.name,
      logo: tenant.logo || undefined,
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('school_theme', JSON.stringify({
        name: tenant.name,
        logo: tenant.logo,
        primaryColor: tenant.primaryColor,
        secondaryColor: tenant.secondaryColor,
        motto: tenant.motto,
        slug: tenant.slug,
      }));
    }

    return () => {
      const root = document.documentElement;
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-primary-rgb');
      root.style.removeProperty('--color-secondary');
      root.style.removeProperty('--color-secondary-rgb');
    };
  }, [tenant?.id]);

  return { tenant };
}

export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '26, 86, 219';
}

