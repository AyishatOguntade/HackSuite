import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { apiClient } from '../../../api/client'
import { useEvent } from '../../../hooks/useEvent'
import type { LandingPage } from '@hacksuite/shared'

interface LandingResponse {
  data: {
    event: { id: string; name: string }
    landing: LandingPage | null
    formDefinition: unknown
  }
}

interface SocialLink {
  platform: string
  url: string
}

export default function LandingPageEditor() {
  const { slug: orgSlug, eventSlug } = useParams<{ slug: string; eventSlug: string }>()
  const { data: eventData } = useEvent(orgSlug, eventSlug)
  const eventId = eventData?.data?.id

  const [logoUrl, setLogoUrl] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#7c3aed')
  const [heroText, setHeroText] = useState('')
  const [description, setDescription] = useState('')
  const [registrationOpen, setRegistrationOpen] = useState(true)
  const [published, setPublished] = useState(false)
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([
    { platform: 'discord', url: '' },
    { platform: 'twitter', url: '' },
    { platform: 'instagram', url: '' },
  ])
  const [saveSuccess, setSaveSuccess] = useState(false)

  const { data: landingData } = useQuery({
    queryKey: ['landing-editor', eventId],
    queryFn: () => apiClient.get<LandingResponse>(`/events/${eventId}/landing`),
    enabled: !!eventId,
  })

  useEffect(() => {
    const l = landingData?.data?.landing
    if (!l) return
    setLogoUrl(l.logoUrl ?? '')
    setCoverImageUrl(l.coverImageUrl ?? '')
    setPrimaryColor(l.primaryColor ?? '#7c3aed')
    setHeroText(l.heroText ?? '')
    setDescription(l.description ?? '')
    setRegistrationOpen(l.registrationOpen)
    setPublished(l.published)

    if (l.socialLinks && Object.keys(l.socialLinks).length > 0) {
      const existing = Object.entries(l.socialLinks).map(([platform, url]) => ({ platform, url }))
      setSocialLinks(existing.length > 0 ? existing : socialLinks)
    }
  }, [landingData])

  const saveMutation = useMutation({
    mutationFn: (body: Partial<LandingPage>) =>
      apiClient.patch(`/events/${eventId}/landing`, body),
    onSuccess: () => {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    },
  })

  function handleSave() {
    const links: Record<string, string> = {}
    for (const { platform, url } of socialLinks) {
      if (platform.trim() && url.trim()) {
        links[platform.trim()] = url.trim()
      }
    }
    saveMutation.mutate({
      logoUrl: logoUrl || null,
      coverImageUrl: coverImageUrl || null,
      primaryColor,
      heroText: heroText || null,
      description: description || null,
      socialLinks: links,
      registrationOpen,
      published,
    } as Partial<LandingPage>)
  }

  function updateSocialLink(idx: number, field: 'platform' | 'url', value: string) {
    setSocialLinks((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)))
  }

  function addSocialLink() {
    setSocialLinks((prev) => [...prev, { platform: '', url: '' }])
  }

  function removeSocialLink(idx: number) {
    setSocialLinks((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Landing Page</h1>
        <div className="flex items-center gap-3">
          {saveSuccess && <span className="text-sm text-green-600 font-medium">Saved!</span>}
          <Button onClick={handleSave} loading={saveMutation.isPending}>
            Save Changes
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Branding */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Branding</h2>
          <div className="flex flex-col gap-4">
            <div>
              <Input
                label="Logo URL"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              {logoUrl && (
                <img src={logoUrl} alt="Logo preview" className="mt-2 h-12 object-contain rounded border border-slate-200 p-1" />
              )}
            </div>
            <div>
              <Input
                label="Cover Image URL"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://example.com/cover.jpg"
              />
              {coverImageUrl && (
                <img src={coverImageUrl} alt="Cover preview" className="mt-2 h-32 w-full object-cover rounded border border-slate-200" />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-10 rounded cursor-pointer border border-slate-300"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#7c3aed"
                  className="font-mono"
                />
                <div
                  className="h-10 w-10 rounded border border-slate-300 flex-shrink-0"
                  style={{ backgroundColor: primaryColor }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Content</h2>
          <div className="flex flex-col gap-4">
            <Input
              label="Hero Text"
              value={heroText}
              onChange={(e) => setHeroText(e.target.value)}
              placeholder="Build. Hack. Create."
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell participants about your hackathon..."
                rows={5}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none"
              />
            </div>
          </div>
        </section>

        {/* Social Links */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">Social Links</h2>
            <Button size="sm" variant="secondary" onClick={addSocialLink}>
              Add Link
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {socialLinks.map((link, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <Input
                  value={link.platform}
                  onChange={(e) => updateSocialLink(idx, 'platform', e.target.value)}
                  placeholder="discord"
                  className="w-28"
                />
                <Input
                  value={link.url}
                  onChange={(e) => updateSocialLink(idx, 'url', e.target.value)}
                  placeholder="https://discord.gg/..."
                  className="flex-1"
                />
                <button
                  onClick={() => removeSocialLink(idx)}
                  className="text-red-400 hover:text-red-600 px-2"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Settings */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Settings</h2>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Registration Open</p>
                <p className="text-xs text-slate-500">Allow participants to submit applications</p>
              </div>
              <button
                onClick={() => setRegistrationOpen(!registrationOpen)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  registrationOpen ? 'bg-primary-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    registrationOpen ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Published</p>
                <p className="text-xs text-slate-500">Make the landing page publicly visible</p>
              </div>
              <button
                onClick={() => setPublished(!published)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  published ? 'bg-primary-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    published ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Public link */}
        {eventId && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">Public registration link:</p>
            <p className="text-sm font-mono text-slate-700 mt-1">/events/{eventId}/apply</p>
          </div>
        )}
      </div>
    </div>
  )
}
