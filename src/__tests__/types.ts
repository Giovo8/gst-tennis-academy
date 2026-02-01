/**
 * Shared test types
 */

export type UserRole = "atleta" | "maestro" | "gestore" | "admin";

export interface User {
  id: string;
  role: UserRole;
}

export interface Booking {
  id: string;
  user_id: string;
  court: string;
  status: string;
  manager_confirmed: boolean;
}

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
}

export interface Course {
  id: string;
  created_by: string;
  active: boolean;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
}

export interface Tournament {
  id: string;
  created_by: string;
}
