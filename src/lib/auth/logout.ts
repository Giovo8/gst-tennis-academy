import { supabase } from '@/lib/supabase/client';

/**
 * Handles user logout across the application
 * Clears session and redirects to login page
 */
export async function handleLogout(): Promise<void> {
  try {
    await supabase.auth.signOut();
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout error:', error);
    // Force redirect even on error
    window.location.href = '/login';
  }
}
