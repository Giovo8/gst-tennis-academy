import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/activity/logActivity';

/**
 * Handles user logout across the application
 * Clears session and redirects to login page
 */
export async function handleLogout(): Promise<void> {
  try {
    // Log logout activity before signing out
    await logActivity({
      action: "user.logout",
    });

    await supabase.auth.signOut();
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout error:', error);
    // Force redirect even on error
    window.location.href = '/login';
  }
}
