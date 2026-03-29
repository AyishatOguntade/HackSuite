import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { apiClient } from '../../../api/client'
import type { FormField, FormDefinition, LandingPage } from '@hacksuite/shared'

interface LandingData {
  event: {
    id: string
    name: string
    slug: string
    startDate: string | null
    endDate: string | null
    status: string
  }
  landing: LandingPage | null
  formDefinition: FormDefinition | null
}

interface FieldRendererProps {
  field: FormField
  value: unknown
  onChange: (value: unknown) => void
  error?: string
}

function FieldRenderer({ field, value, onChange, error }: FieldRendererProps) {
  if (field.type === 'header') {
    return (
      <div className="mt-2 mb-1">
        <h3 className="text-lg font-semibold text-slate-800">{field.label}</h3>
        {field.helpText && <p className="text-sm text-slate-500">{field.helpText}</p>}
      </div>
    )
  }

  if (field.type === 'mlh_consent') {
    return (
      <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
        <p className="text-sm font-medium text-slate-700 mb-3">MLH Code of Conduct &amp; Privacy Policy</p>
        <label className="flex items-start gap-2 text-sm text-slate-600 mb-2">
          <input
            type="checkbox"
            checked={Boolean((value as Record<string, boolean>)?.coc)}
            onChange={(e) => onChange({ ...(value as Record<string, boolean> ?? {}), coc: e.target.checked })}
            className="mt-0.5"
          />
          I have read and agree to the{' '}
          <a href="https://mlh.io/code-of-conduct" target="_blank" rel="noreferrer" className="text-primary-600 underline">
            MLH Code of Conduct
          </a>
          .
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={Boolean((value as Record<string, boolean>)?.privacy)}
            onChange={(e) => onChange({ ...(value as Record<string, boolean> ?? {}), privacy: e.target.checked })}
            className="mt-0.5"
          />
          I authorize MLH to send me pre-event informational emails per the{' '}
          <a href="https://mlh.io/privacy" target="_blank" rel="noreferrer" className="text-primary-600 underline">
            Privacy Policy
          </a>
          .
        </label>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded"
        />
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
        {error && <span className="text-xs text-red-600 ml-1">{error}</span>}
      </label>
    )
  }

  if (field.type === 'textarea') {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">
          {field.label}
          {field.required && <span className="ml-1 text-red-500">*</span>}
        </label>
        <textarea
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          rows={4}
          className={`rounded-lg border px-3 py-2 text-sm outline-none transition-colors resize-none ${
            error
              ? 'border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
          }`}
        />
        {field.helpText && <p className="text-xs text-slate-500">{field.helpText}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">
          {field.label}
          {field.required && <span className="ml-1 text-red-500">*</span>}
        </label>
        <select
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className={`rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
            error ? 'border-red-500' : 'border-slate-300 focus:border-primary-500'
          }`}
        >
          <option value="">Select an option</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {field.helpText && <p className="text-xs text-slate-500">{field.helpText}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  if (field.type === 'multiselect') {
    const selected = Array.isArray(value) ? (value as string[]) : []
    return (
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">
          {field.label}
          {field.required && <span className="ml-1 text-red-500">*</span>}
        </label>
        <div className="flex flex-col gap-1 rounded-lg border border-slate-300 p-2">
          {field.options?.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={selected.includes(o)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...selected, o]
                    : selected.filter((s) => s !== o)
                  onChange(next)
                }}
                className="rounded"
              />
              {o}
            </label>
          ))}
        </div>
        {field.helpText && <p className="text-xs text-slate-500">{field.helpText}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  if (field.type === 'file') {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">
          {field.label}
          {field.required && <span className="ml-1 text-red-500">*</span>}
        </label>
        <input
          type="file"
          onChange={(e) => onChange(e.target.files?.[0]?.name ?? '')}
          className="text-sm text-slate-600"
        />
        {field.helpText && <p className="text-xs text-slate-500">{field.helpText}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  // text / email default
  return (
    <Input
      label={field.label + (field.required ? ' *' : '')}
      type={field.type === 'email' ? 'email' : 'text'}
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      maxLength={field.maxLength}
      error={error}
      hint={field.helpText}
    />
  )
}

export default function PublicRegistration() {
  const { eventId } = useParams<{ eventId: string }>()

  const { data, isLoading, error: fetchError } = useQuery({
    queryKey: ['landing', eventId],
    queryFn: () => apiClient.get<{ data: LandingData }>(`/events/${eventId}/landing`),
    enabled: !!eventId,
  })

  const landing = data?.data

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [school, setSchool] = useState('')
  const [responses, setResponses] = useState<Record<string, unknown>>({})
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const fields: FormField[] = (landing?.formDefinition?.fields as FormField[]) ?? []

  // Watch for conditional fields
  function isFieldVisible(field: FormField): boolean {
    if (!field.conditionalOn) return true
    const watchedValue = fieldValues[field.conditionalOn.fieldId]
    return String(watchedValue ?? '') === field.conditionalOn.value
  }

  function handleFieldChange(fieldId: string, value: unknown) {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }))
    setResponses((prev) => ({ ...prev, [fieldId]: value }))
    setErrors((prev) => ({ ...prev, [fieldId]: '' }))
  }

  const submitMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ data: { participantId: string; status: string } }>(
        `/events/${eventId}/applications`,
        {
          firstName,
          lastName,
          email,
          school: school || undefined,
          responses,
        }
      ),
    onSuccess: () => {
      setSubmitted(true)
    },
    onError: (err: unknown) => {
      const apiErr = err as { detail?: string }
      setErrors({ _form: apiErr?.detail ?? 'Failed to submit application' })
    },
  })

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (!firstName.trim()) newErrors.firstName = 'First name is required'
    if (!lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!email.trim()) newErrors.email = 'Email is required'

    for (const field of fields) {
      if (!isFieldVisible(field)) continue
      if (!field.required) continue
      if (field.type === 'header') continue

      const val = fieldValues[field.id]
      if (field.type === 'mlh_consent') {
        const consent = val as Record<string, boolean> | undefined
        if (!consent?.coc || !consent?.privacy) {
          newErrors[field.id] = 'You must agree to MLH terms'
        }
      } else if (field.type === 'checkbox') {
        if (!val) newErrors[field.id] = 'This field is required'
      } else if (field.type === 'multiselect') {
        if (!Array.isArray(val) || val.length === 0) {
          newErrors[field.id] = 'Please select at least one option'
        }
      } else if (!val || String(val).trim() === '') {
        newErrors[field.id] = 'This field is required'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    submitMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-400">
        Loading...
      </div>
    )
  }

  if (fetchError || !landing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Event not found</h1>
          <p className="mt-2 text-slate-500">This registration page does not exist.</p>
        </div>
      </div>
    )
  }

  const { event, landing: landingPage, formDefinition } = landing
  const primaryColor = landingPage?.primaryColor ?? '#7c3aed'

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="max-w-md text-center px-6 py-12 bg-white rounded-2xl shadow-lg">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Application Submitted!</h1>
          <p className="mt-3 text-slate-600">
            Thanks for applying to <strong>{event.name}</strong>. Check your email for a
            confirmation message.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Cover image */}
      {landingPage?.coverImageUrl && (
        <div className="h-48 bg-slate-300 overflow-hidden">
          <img
            src={landingPage.coverImageUrl}
            alt="Event cover"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Hero section */}
      <div style={{ backgroundColor: primaryColor }} className="py-12 px-6">
        <div className="max-w-2xl mx-auto text-center text-white">
          {landingPage?.logoUrl && (
            <img
              src={landingPage.logoUrl}
              alt="Event logo"
              className="h-16 mx-auto mb-4 object-contain"
            />
          )}
          <h1 className="text-3xl font-bold">{event.name}</h1>
          {landingPage?.heroText && (
            <p className="mt-3 text-lg text-white/90">{landingPage.heroText}</p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {landingPage?.description && (
          <div className="mb-8 prose prose-slate">
            <p className="text-slate-600 whitespace-pre-wrap">{landingPage.description}</p>
          </div>
        )}

        {!landingPage?.registrationOpen && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center mb-8">
            <p className="font-medium text-amber-800">Registration is currently closed.</p>
          </div>
        )}

        {landingPage?.registrationOpen && formDefinition && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Apply Now</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Core fields */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name *"
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); setErrors((p) => ({ ...p, firstName: '' })) }}
                  error={errors.firstName}
                />
                <Input
                  label="Last Name *"
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); setErrors((p) => ({ ...p, lastName: '' })) }}
                  error={errors.lastName}
                />
              </div>
              <Input
                label="Email *"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })) }}
                error={errors.email}
              />
              <Input
                label="School / University"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
              />

              {/* Dynamic fields */}
              {fields
                .filter((f) => isFieldVisible(f))
                .map((field) => (
                  <FieldRenderer
                    key={field.id}
                    field={field}
                    value={fieldValues[field.id]}
                    onChange={(val) => handleFieldChange(field.id, val)}
                    error={errors[field.id]}
                  />
                ))}

              {errors._form && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errors._form}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                loading={submitMutation.isPending}
                className="mt-2"
              >
                Submit Application
              </Button>
            </form>
          </div>
        )}

        {/* Social links */}
        {landingPage?.socialLinks && Object.keys(landingPage.socialLinks).length > 0 && (
          <div className="mt-8 flex justify-center gap-4">
            {Object.entries(landingPage.socialLinks).map(([platform, url]) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-slate-500 hover:text-slate-700 capitalize"
              >
                {platform}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
