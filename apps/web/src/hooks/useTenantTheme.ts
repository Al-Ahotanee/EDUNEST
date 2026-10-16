import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export function useTenantTheme() {
  const user = useAuthStore(s => s.user);
  const tenant = user?.tenant;

  useEffect(() => {
    if (!tenant) return;

    const root = document.documentElement;

    // Apply school colors to CSS custom properties
    if (tenant.primaryColor) {
      root.style.setProperty('--color-primary', tenant.primaryColor);
      root.style.setProperty('--color-primary-rgb', hexToRgb(tenant.primaryColor));
    }
    if (tenant.secondaryColor) {
      root.style.setProperty('--color-secondary', tenant.secondaryColor);
    }

    // Cache school theme for parent portal (which uses separate auth)
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

    // Update page title
    document.title = `${tenant.name} — SchoolERP`;

    // Update favicon if logo provided
    if (tenant.logo) {
      const link = (document.querySelector("link[rel*='icon']") || document.createElement('link')) as HTMLLinkElement;
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = tenant.logo;
      document.getElementsByTagName('head')[0].appendChild(link);
    }

    return () => {
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-primary-rgb');
      root.style.removeProperty('--color-secondary');
    };
  }, [tenant?.id]);

  return { tenant };
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '26, 86, 219';
}
