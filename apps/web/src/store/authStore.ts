import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserRole {
  id: string;
  name: string;
  permissions: { module: string; action: string }[];
}

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  phone?: string;
  schoolId?: string;
  tenantId?: string;
  isSuperAdmin: boolean;
  role?: string; // 'marketer'
  school?: { id: string; name: string; logo?: string };
  tenant?: { id: string; name: string; slug: string; logo?: string; primaryColor?: string; secondaryColor?: string; motto?: string };
  roles: UserRole[];
}

interface AuthState {
  user: CurrentUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: CurrentUser, accessToken: string, refreshToken: string) => void;
  updateUser: (user: Partial<CurrentUser>) => void;
  logout: () => void;
  hasPermission: (module: string, action: string) => boolean;
  hasRole: (roleName: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        if (user.tenant?.slug) localStorage.setItem('tenantSlug', user.tenant.slug);
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      updateUser: (updates) =>
        set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tenantSlug');
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      hasPermission: (module, action) => {
        const { user } = get();
        if (!user) return false;
        if (user.isSuperAdmin) return true;
        return user.roles.some((role) =>
          role.name === 'Super Admin' ||
          role.permissions.some((p) => p.module === module && p.action === action),
        );
      },

      hasRole: (roleName) => {
        const { user } = get();
        if (!user) return false;
        return user.roles.some((r) => r.name === roleName);
      },
    }),
    {
      name: 'school-erp-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken, isAuthenticated: s.isAuthenticated }),
    },
  ),
);
