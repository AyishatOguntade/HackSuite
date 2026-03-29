export type OrgRole = 'owner' | 'admin' | 'organizer'

export type EventRole = 'judge' | 'sponsor' | 'participant'

export type ParticipantStatus =
  | 'applied'
  | 'waitlisted'
  | 'accepted'
  | 'confirmed'
  | 'checked_in'
  | 'no_show'
  | 'rejected'

export type ModuleAccess =
  | 'registration'
  | 'checkin'
  | 'schedule'
  | 'judging'
  | 'sponsors'
  | 'finance'
  | 'marketing'
  | 'reporting'

export type EventStatus = 'draft' | 'published' | 'active' | 'closed'

export interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  emailVerified: boolean
  createdAt: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  contactEmail: string
  createdAt: string
}

export interface OrgMember {
  id: string
  orgId: string
  userId: string
  role: OrgRole
  moduleAccess: ModuleAccess[]
  createdAt: string
}

export interface Event {
  id: string
  orgId: string
  name: string
  slug: string
  startDate: string | null
  endDate: string | null
  status: EventStatus
  createdAt: string
}

export interface Participant {
  id: string
  eventId: string
  userId: string | null
  email: string
  firstName: string | null
  lastName: string | null
  school: string | null
  status: ParticipantStatus
  qrCode: string | null
  checkedInAt: string | null
  createdAt: string
}

export interface JwtPayload {
  userId: string
  orgId: string | null
  roles: OrgRole[]
  eventPermissions: Record<string, ModuleAccess[]>
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  type: string
  title: string
  status: number
  detail: string
  instance: string
}

export interface PaginatedResponse<T> {
  data: T[]
  nextCursor: string | null
  total: number
}

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'file'
  | 'header'
  | 'mlh_consent'

export interface FormField {
  id: string
  type: FormFieldType
  label: string
  required: boolean
  options?: string[]
  placeholder?: string
  helpText?: string
  conditionalOn?: { fieldId: string; value: string }
  maxLength?: number
}

export interface FormDefinition {
  id: string
  eventId: string
  fields: FormField[]
  version: number
  updatedAt: string
}

export interface LandingPage {
  id: string
  eventId: string
  logoUrl: string | null
  coverImageUrl: string | null
  primaryColor: string
  heroText: string | null
  description: string | null
  socialLinks: Record<string, string>
  registrationOpen: boolean
  published: boolean
}

export interface ApplicationSubmission {
  responses: Record<string, unknown>
  firstName: string
  lastName: string
  email: string
  school?: string
}
