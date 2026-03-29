import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { clsx } from 'clsx'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { apiClient } from '../../../api/client'
import { useEvent } from '../../../hooks/useEvent'
import type { FormField, FormFieldType, FormDefinition } from '@hacksuite/shared'

const FIELD_TYPES: { type: FormFieldType; label: string }[] = [
  { type: 'text', label: 'Text' },
  { type: 'textarea', label: 'Textarea' },
  { type: 'email', label: 'Email' },
  { type: 'select', label: 'Select' },
  { type: 'multiselect', label: 'Multi-select' },
  { type: 'checkbox', label: 'Checkbox' },
  { type: 'file', label: 'File Upload' },
  { type: 'header', label: 'Section Header' },
  { type: 'mlh_consent', label: 'MLH Consent' },
]

function nanoid8(): string {
  return Math.random().toString(36).slice(2, 10)
}

function createField(type: FormFieldType): FormField {
  return {
    id: nanoid8(),
    type,
    label: FIELD_TYPES.find((t) => t.type === type)?.label ?? type,
    required: false,
  }
}

interface FieldPreviewProps {
  field: FormField
  selected: boolean
  onSelect: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  isFirst: boolean
  isLast: boolean
}

function FieldPreview({
  field,
  selected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDelete,
  isFirst,
  isLast,
}: FieldPreviewProps) {
  return (
    <div
      onClick={onSelect}
      className={clsx(
        'rounded-lg border px-4 py-3 cursor-pointer transition-colors',
        selected ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white hover:border-slate-300'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700">
            {field.label}
            {field.required && <span className="ml-1 text-red-500">*</span>}
          </p>
          <p className="text-xs text-slate-400 mt-0.5 capitalize">{field.type.replace('_', ' ')}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onMoveUp() }}
            disabled={isFirst}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
            title="Move up"
          >
            ↑
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveDown() }}
            disabled={isLast}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
            title="Move down"
          >
            ↓
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="rounded p-1 text-red-400 hover:bg-red-50"
            title="Delete field"
          >
            ×
          </button>
        </div>
      </div>

      {/* Simple field render */}
      <div className="mt-2">
        {field.type === 'header' && (
          <p className="text-base font-semibold text-slate-800">{field.label}</p>
        )}
        {['text', 'email'].includes(field.type) && (
          <input
            readOnly
            placeholder={field.placeholder ?? field.label}
            className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-slate-400 bg-slate-50"
          />
        )}
        {field.type === 'textarea' && (
          <textarea
            readOnly
            placeholder={field.placeholder ?? field.label}
            rows={2}
            className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-slate-400 bg-slate-50 resize-none"
          />
        )}
        {['select', 'multiselect'].includes(field.type) && (
          <select disabled className="w-full rounded border border-slate-200 px-2 py-1 text-sm text-slate-400 bg-slate-50">
            <option>Select an option</option>
            {field.options?.map((o) => <option key={o}>{o}</option>)}
          </select>
        )}
        {field.type === 'checkbox' && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" readOnly className="rounded" />
            {field.label}
          </label>
        )}
        {field.type === 'file' && (
          <input type="file" disabled className="w-full text-sm text-slate-400" />
        )}
        {field.type === 'mlh_consent' && (
          <p className="text-xs text-slate-500 italic">MLH consent checkboxes will appear here</p>
        )}
        {field.helpText && (
          <p className="text-xs text-slate-400 mt-1">{field.helpText}</p>
        )}
      </div>
    </div>
  )
}

interface PropertiesPanelProps {
  field: FormField
  allFields: FormField[]
  onChange: (updated: FormField) => void
}

function PropertiesPanel({ field, allFields, onChange }: PropertiesPanelProps) {
  const [newOption, setNewOption] = useState('')

  const otherFields = allFields.filter((f) => f.id !== field.id && f.type !== 'header')

  return (
    <div className="flex flex-col gap-4 p-4">
      <h3 className="text-sm font-semibold text-slate-700">Field Properties</h3>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500 uppercase">Label</label>
        <Input
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
        />
      </div>

      {!['header', 'mlh_consent', 'checkbox'].includes(field.type) && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-500 uppercase">Required</label>
          <button
            onClick={() => onChange({ ...field, required: !field.required })}
            className={clsx(
              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
              field.required ? 'bg-primary-600' : 'bg-slate-200'
            )}
          >
            <span
              className={clsx(
                'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
                field.required ? 'translate-x-4' : 'translate-x-1'
              )}
            />
          </button>
        </div>
      )}

      {['text', 'textarea', 'email'].includes(field.type) && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase">Placeholder</label>
          <Input
            value={field.placeholder ?? ''}
            onChange={(e) => onChange({ ...field, placeholder: e.target.value || undefined })}
          />
        </div>
      )}

      {['text', 'textarea'].includes(field.type) && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase">Max Length</label>
          <Input
            type="number"
            value={field.maxLength ?? ''}
            onChange={(e) =>
              onChange({ ...field, maxLength: e.target.value ? parseInt(e.target.value, 10) : undefined })
            }
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500 uppercase">Help Text</label>
        <Input
          value={field.helpText ?? ''}
          onChange={(e) => onChange({ ...field, helpText: e.target.value || undefined })}
        />
      </div>

      {['select', 'multiselect'].includes(field.type) && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-slate-500 uppercase">Options</label>
          <div className="flex flex-col gap-1">
            {(field.options ?? []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm bg-slate-50">
                  {opt}
                </span>
                <button
                  onClick={() =>
                    onChange({
                      ...field,
                      options: field.options?.filter((_, idx) => idx !== i),
                    })
                  }
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              placeholder="Add option"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (newOption.trim()) {
                    onChange({ ...field, options: [...(field.options ?? []), newOption.trim()] })
                    setNewOption('')
                  }
                }
              }}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (newOption.trim()) {
                  onChange({ ...field, options: [...(field.options ?? []), newOption.trim()] })
                  setNewOption('')
                }
              }}
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {otherFields.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-500 uppercase">Conditional Display</label>
            <button
              onClick={() =>
                onChange({
                  ...field,
                  conditionalOn: field.conditionalOn
                    ? undefined
                    : { fieldId: otherFields[0].id, value: '' },
                })
              }
              className={clsx(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                field.conditionalOn ? 'bg-primary-600' : 'bg-slate-200'
              )}
            >
              <span
                className={clsx(
                  'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
                  field.conditionalOn ? 'translate-x-4' : 'translate-x-1'
                )}
              />
            </button>
          </div>
          {field.conditionalOn && (
            <div className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">Show when field</label>
                <select
                  value={field.conditionalOn.fieldId}
                  onChange={(e) =>
                    onChange({
                      ...field,
                      conditionalOn: { ...field.conditionalOn!, fieldId: e.target.value },
                    })
                  }
                  className="rounded border border-slate-200 px-2 py-1 text-sm"
                >
                  {otherFields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">equals value</label>
                <Input
                  value={field.conditionalOn.value}
                  onChange={(e) =>
                    onChange({
                      ...field,
                      conditionalOn: { ...field.conditionalOn!, value: e.target.value },
                    })
                  }
                  placeholder="Value to match"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function FormBuilder() {
  const { slug: orgSlug, eventSlug } = useParams<{ slug: string; eventSlug: string }>()
  const { data: eventData } = useEvent(orgSlug, eventSlug)
  const eventId = eventData?.data?.id

  const [fields, setFields] = useState<FormField[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const { data: formData, isLoading } = useQuery({
    queryKey: ['form', eventId],
    queryFn: () => apiClient.get<{ data: FormDefinition }>(`/events/${eventId}/form`),
    enabled: !!eventId,
  })

  useEffect(() => {
    if (formData?.data?.fields) {
      setFields(formData.data.fields as FormField[])
    }
  }, [formData])

  const saveMutation = useMutation({
    mutationFn: (fields: FormField[]) =>
      apiClient.request<{ data: FormDefinition }>('PUT', `/events/${eventId}/form`, { fields }),
    onSuccess: () => {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    },
  })

  function addField(type: FormFieldType) {
    const field = createField(type)
    setFields((prev) => [...prev, field])
    setSelectedFieldId(field.id)
  }

  function updateField(updated: FormField) {
    setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
  }

  function deleteField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id))
    if (selectedFieldId === id) setSelectedFieldId(null)
  }

  function moveField(idx: number, direction: 'up' | 'down') {
    const newFields = [...fields]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= newFields.length) return
    ;[newFields[idx], newFields[swapIdx]] = [newFields[swapIdx], newFields[idx]]
    setFields(newFields)
  }

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">Loading form...</div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Left panel: field type palette */}
      <div className="w-52 flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
        <div className="px-4 py-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700">Add Fields</h2>
        </div>
        <div className="p-3 flex flex-col gap-1">
          {FIELD_TYPES.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => addField(type)}
              className="w-full text-left rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors border border-transparent hover:border-slate-200"
            >
              + {label}
            </button>
          ))}
        </div>
      </div>

      {/* Center: form preview */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Form Preview</h2>
            <div className="flex items-center gap-3">
              {saveSuccess && (
                <span className="text-sm text-green-600 font-medium">Saved!</span>
              )}
              <Button
                loading={saveMutation.isPending}
                onClick={() => saveMutation.mutate(fields)}
              >
                Save Form
              </Button>
            </div>
          </div>

          {fields.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-300 p-12 text-center">
              <p className="text-slate-400">Add fields from the left panel to build your form</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {fields.map((field, idx) => (
                <FieldPreview
                  key={field.id}
                  field={field}
                  selected={selectedFieldId === field.id}
                  onSelect={() => setSelectedFieldId(field.id)}
                  onMoveUp={() => moveField(idx, 'up')}
                  onMoveDown={() => moveField(idx, 'down')}
                  onDelete={() => deleteField(field.id)}
                  isFirst={idx === 0}
                  isLast={idx === fields.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: properties */}
      <div className="w-64 flex-shrink-0 border-l border-slate-200 bg-white overflow-y-auto">
        {selectedField ? (
          <PropertiesPanel
            field={selectedField}
            allFields={fields}
            onChange={updateField}
          />
        ) : (
          <div className="flex items-center justify-center h-48 px-4 text-center">
            <p className="text-sm text-slate-400">Select a field to edit its properties</p>
          </div>
        )}
      </div>
    </div>
  )
}
