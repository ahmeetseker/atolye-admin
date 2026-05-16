/**
 * Auth-local User shape — mirrors the OpenAPI User schema in
 * `packages/api-types/openapi.yaml` (Wave 14 / A66 endpoints).
 *
 * Inlined here because atolye-admin doesn't depend on `@landx/api-types`
 * directly; if that dependency is added later (e.g., for shared zod
 * schemas) this file becomes a `type User = import('@landx/api-types').User`
 * alias.
 */

export type UserRole =
  | 'tenant-admin'
  | 'tenant-member'
  | 'buyer'
  | 'super-admin'
  | 'support'
  | 'compliance'
  | 'readonly-auditor'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  tenantId: string | null
  createdAt: string
}
