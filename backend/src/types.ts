export type UserRole = 'super_admin' | 'admin' | 'student';

export interface JwtPayload {
  sub: string; // user id
  role: UserRole;
  email: string;
  full_name: string;
}
