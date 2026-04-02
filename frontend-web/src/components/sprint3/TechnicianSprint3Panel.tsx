import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera,
  CheckCircle2,
  Clock3,
  Crosshair,
  History,
  MapPin,
  QrCode,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { addInterventionEvidence, updateInterventionFieldCheck } from '@/services/interventionApi'
import type { InterventionRecord } from '@/types/auth.types'

type TechnicianSprint3PanelProps = {
  interventions: InterventionRecord[]
  onRefresh: () => Promise<void> | void
}

const formatDate = (value?: string | null) => {
  if (!value) return 'Pas encore'

  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: { data?: { message?: string } } }).response?.data?.message
  ) {
    return (error as { response?: { data?: { message?: string } } }).response!.data!.message!
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'))
    reader.readAsDataURL(file)
  })

const getStageState = (intervention: InterventionRecord) => ({
  gpsDone: Boolean(intervention.gpsConfirmedAt),
  qrDone: Boolean(intervention.qrVerifiedAt),
  evidenceCount: intervention.evidences.length,
})

export function TechnicianSprint3Panel({
  interventions,
  onRefresh,
}: TechnicianSprint3PanelProps) {
  const [selectedInterventionId, setSelectedInterventionId] = useState<number | null>(
    interventions[0]?.id ?? null
  )
  const [evidenceNote, setEvidenceNote] = useState('')
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [manualQrValue, setManualQrValue] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerMessage, setScannerMessage] = useState('Ouvre la camera ou saisis le code.')
  const [busyAction, setBusyAction] = useState<'gps' | 'qr' | 'evidence' | null>(null)
  const scannerHostId = `qr-reader-${selectedInterventionId ?? 'none'}`
  const scannerCleanupRef = useRef<null | (() => Promise<void>)>(null)

  const historicalInterventions = useMemo(
    () =>
      [...interventions]
        .sort(
          (left, right) =>
            new Date(right.dateFin ?? right.dateCreation).getTime() -
            new Date(left.dateFin ?? left.dateCreation).getTime()
        )
        .slice(0, 6),
    [interventions]
  )

  const selectedIntervention =
    interventions.find((item) => item.id === selectedInterventionId) ??
    historicalInterventions[0] ??
    null

  const summary = useMemo(
    () => ({
      gps: interventions.filter((item) => item.gpsConfirmedAt).length,
      qr: interventions.filter((item) => item.qrVerifiedAt).length,
      evidences: interventions.reduce((total, item) => total + item.evidences.length, 0),
    }),
    [interventions]
  )

  useEffect(() => {
    if (selectedInterventionId && !interventions.some((item) => item.id === selectedInterventionId)) {
      setSelectedInterventionId(interventions[0]?.id ?? null)
    }
  }, [interventions, selectedInterventionId])

  useEffect(() => {
    setManualQrValue('')
    setEvidenceNote('')
    setEvidenceFile(null)
    setScannerOpen(false)
    setScannerMessage('Ouvre la camera ou saisis le code.')
  }, [selectedInterventionId])

  useEffect(() => {
    if (!scannerOpen || !selectedIntervention) {
      return
    }

    let isCancelled = false

    const startScanner = async () => {
      try {
        const qrModule = await import('html5-qrcode')
        if (isCancelled) {
          return
        }

        const scanner = new qrModule.Html5Qrcode(scannerHostId)
        scannerCleanupRef.current = async () => {
          try {
            if (scanner.isScanning) {
              await scanner.stop()
            }
          } finally {
            await scanner.clear()
          }
        }

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          async (decodedText) => {
            try {
              setBusyAction('qr')
              await updateInterventionFieldCheck(selectedIntervention.id, {
                qrCodeValue: decodedText,
              })
              setManualQrValue(decodedText)
              setScannerMessage('QR code valide.')
              setScannerOpen(false)
              await onRefresh()
              toast.success('QR code valide.')
            } catch (error) {
              toast.error(getErrorMessage(error, 'Validation du QR code impossible.'))
            } finally {
              setBusyAction(null)
            }
          },
          () => {}
        )

        setScannerMessage('Camera active.')
      } catch (error) {
        setScannerOpen(false)
        setScannerMessage('Camera indisponible.')
        toast.error(getErrorMessage(error, 'Impossible d ouvrir la camera.'))
      }
    }

    void startScanner()

    return () => {
      isCancelled = true
      if (scannerCleanupRef.current) {
        void scannerCleanupRef.current()
        scannerCleanupRef.current = null
      }
    }
  }, [onRefresh, scannerHostId, scannerOpen, selectedIntervention])

  const handleConfirmGps = async () => {
    if (!selectedIntervention) {
      return
    }

    setBusyAction('gps')

    try {
      if (!('geolocation' in navigator)) {
        await updateInterventionFieldCheck(selectedIntervention.id, {})
        await onRefresh()
        toast.success('Presence enregistree.')
        return
      }

      const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position.coords),
          (error) => reject(error),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
      })

      await updateInterventionFieldCheck(selectedIntervention.id, {
        gpsLatitude: Number(coords.latitude.toFixed(6)),
        gpsLongitude: Number(coords.longitude.toFixed(6)),
      })
      await onRefresh()
      toast.success('Presence GPS confirmee.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'GPS indisponible.'))
    } finally {
      setBusyAction(null)
    }
  }

  const handleManualQrValidation = async () => {
    if (!selectedIntervention) {
      return
    }

    const value = manualQrValue.trim()
    if (!value) {
      toast.error('Renseigne un code QR.')
      return
    }

    setBusyAction('qr')

    try {
      await updateInterventionFieldCheck(selectedIntervention.id, {
        qrCodeValue: value,
      })
      await onRefresh()
      toast.success('QR code enregistre.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Validation du QR code impossible.'))
    } finally {
      setBusyAction(null)
    }
  }

  const handleEvidenceSubmit = async () => {
    if (!selectedIntervention || !evidenceFile || !evidenceNote.trim()) {
      toast.error('Photo et commentaire requis.')
      return
    }

    setBusyAction('evidence')

    try {
      const photoData = await readFileAsDataUrl(evidenceFile)
      await addInterventionEvidence(selectedIntervention.id, {
        commentaire: evidenceNote.trim(),
        photoName: evidenceFile.name,
        photoData,
      })
      setEvidenceNote('')
      setEvidenceFile(null)
      await onRefresh()
      toast.success('Preuve ajoutee.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Ajout de preuve impossible.'))
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <section className='mt-6 grid gap-6 xl:grid-cols-[1.12fr_0.88fr]'>
      <article className='dashboard-panel rounded-[2rem] border border-white/30 bg-[linear-gradient(180deg,rgba(248,252,251,0.98)_0%,rgba(236,246,243,0.96)_100%)] p-6 sm:p-8'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <div className='inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs uppercase tracking-[0.24em] text-emerald-700'>
              <MapPin className='h-4 w-4' />
              Terrain
            </div>
            <h2 className='mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950'>
              Controle mission
            </h2>
            <p className='mt-3 max-w-2xl text-sm leading-7 text-slate-600'>
              Valide la presence, le QR et les preuves depuis une fiche unique, plus lisible et plus rapide a utiliser.
            </p>
          </div>

          <div className='grid gap-3 sm:grid-cols-3'>
            <div className='rounded-[1.3rem] border border-slate-200 bg-white px-4 py-3'>
              <p className='text-xs uppercase tracking-[0.18em] text-slate-500'>GPS</p>
              <p className='mt-2 text-2xl font-semibold text-slate-950'>{summary.gps}</p>
            </div>
            <div className='rounded-[1.3rem] border border-slate-200 bg-white px-4 py-3'>
              <p className='text-xs uppercase tracking-[0.18em] text-slate-500'>QR</p>
              <p className='mt-2 text-2xl font-semibold text-slate-950'>{summary.qr}</p>
            </div>
            <div className='rounded-[1.3rem] border border-slate-200 bg-white px-4 py-3'>
              <p className='text-xs uppercase tracking-[0.18em] text-slate-500'>Preuves</p>
              <p className='mt-2 text-2xl font-semibold text-slate-950'>{summary.evidences}</p>
            </div>
          </div>
        </div>

        <div className='mt-6 grid gap-5 lg:grid-cols-[0.76fr_1.24fr]'>
          <div className='space-y-3'>
            <p className='text-xs uppercase tracking-[0.18em] text-slate-500'>Liste des missions</p>
            {interventions.length === 0 ? (
              <div className='rounded-[1.4rem] border border-slate-200 bg-white p-5 text-sm text-slate-600'>
                Aucune intervention disponible.
              </div>
            ) : (
              interventions.map((intervention) => {
                const state = getStageState(intervention)

                return (
                  <button
                    key={intervention.id}
                    type='button'
                    onClick={() => setSelectedInterventionId(intervention.id)}
                    className={`w-full rounded-[1.4rem] border p-4 text-left transition ${
                      selectedIntervention?.id === intervention.id
                        ? 'border-emerald-300 bg-emerald-50 shadow-[0_16px_40px_rgba(16,185,129,0.08)]'
                        : 'border-slate-200 bg-white hover:border-emerald-200'
                    }`}
                  >
                    <div className='flex items-start justify-between gap-4'>
                      <div>
                        <p className='text-sm font-semibold text-slate-950'>{intervention.titre}</p>
                        <p className='mt-2 text-xs uppercase tracking-[0.18em] text-slate-500'>
                          {intervention.statut.replace('_', ' ')}
                        </p>
                      </div>
                      <span className='rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-500'>
                        {state.evidenceCount} preuve{state.evidenceCount > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className='mt-4 flex flex-wrap gap-2'>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${state.gpsDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        GPS {state.gpsDone ? 'ok' : 'a faire'}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${state.qrDone ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>
                        QR {state.qrDone ? 'ok' : 'a faire'}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {selectedIntervention ? (
            <div className='space-y-5'>
              <div className='rounded-[1.6rem] border border-slate-200 bg-white p-5'>
                <div className='flex flex-wrap items-center justify-between gap-4'>
                  <div>
                    <p className='text-xs uppercase tracking-[0.18em] text-emerald-700'>Fiche mission</p>
                    <h3 className='mt-2 text-2xl font-semibold text-slate-950'>
                      {selectedIntervention.titre}
                    </h3>
                  </div>
                  <div className='inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs uppercase tracking-[0.18em] text-emerald-700'>
                    <ShieldCheck className='h-4 w-4' />
                    {selectedIntervention.statut.replace('_', ' ')}
                  </div>
                </div>
                <div className='mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2'>
                  <p>Adresse: <span className='font-medium text-slate-900'>{selectedIntervention.adresse}</span></p>
                  <p>Cloture: <span className='font-medium text-slate-900'>{formatDate(selectedIntervention.dateFin ?? selectedIntervention.dateCreation)}</span></p>
                </div>
              </div>

              <div className='grid gap-5 lg:grid-cols-2'>
                <div className='rounded-[1.6rem] border border-slate-200 bg-white p-5'>
                  <div className='flex items-center gap-3 text-emerald-700'>
                    <Crosshair className='h-5 w-5' />
                    <p className='text-xs uppercase tracking-[0.18em]'>Presence</p>
                  </div>
                  <h4 className='mt-4 text-lg font-semibold text-slate-950'>Confirmation GPS</h4>
                  <p className='mt-2 text-sm text-slate-600'>
                    Derniere confirmation: {formatDate(selectedIntervention.gpsConfirmedAt)}
                  </p>
                  <p className='mt-1 text-sm text-slate-500'>
                    Coordonnees:{' '}
                    {selectedIntervention.gpsLatitude !== undefined
                      ? `${selectedIntervention.gpsLatitude ?? 'n/a'}, ${selectedIntervention.gpsLongitude ?? 'n/a'}`
                      : 'non capturees'}
                  </p>
                  <button
                    type='button'
                    onClick={() => void handleConfirmGps()}
                    disabled={busyAction === 'gps'}
                    className='mt-4 inline-flex items-center gap-2 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60'
                  >
                    <CheckCircle2 className='h-4 w-4' />
                    Confirmer
                  </button>
                </div>

                <div className='rounded-[1.6rem] border border-slate-200 bg-white p-5'>
                  <div className='flex items-center gap-3 text-sky-700'>
                    <QrCode className='h-5 w-5' />
                    <p className='text-xs uppercase tracking-[0.18em]'>Controle acces</p>
                  </div>
                  <h4 className='mt-4 text-lg font-semibold text-slate-950'>Scan QR</h4>
                  <p className='mt-2 text-sm text-slate-600'>{scannerMessage}</p>
                  <p className='mt-1 text-sm text-slate-500'>
                    Dernier code: {selectedIntervention.qrCodeValue ?? 'aucun'}
                  </p>
                  <div className='mt-4 flex flex-wrap gap-3'>
                    <button
                      type='button'
                      onClick={() => setScannerOpen((current) => !current)}
                      className='rounded-[1rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700 transition hover:bg-sky-100'
                    >
                      <Camera className='mr-2 inline h-4 w-4' />
                      {scannerOpen ? 'Fermer la camera' : 'Ouvrir la camera'}
                    </button>
                  </div>
                  {scannerOpen ? (
                    <div
                      id={scannerHostId}
                      className='mt-4 overflow-hidden rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3'
                    />
                  ) : null}
                  <div className='mt-4 flex flex-col gap-3'>
                    <input
                      value={manualQrValue}
                      onChange={(event) => setManualQrValue(event.target.value)}
                      placeholder='Code QR'
                      className='dashboard-input rounded-[1rem] px-4 py-3 text-sm'
                    />
                    <button
                      type='button'
                      onClick={() => void handleManualQrValidation()}
                      disabled={busyAction === 'qr'}
                      className='rounded-[1rem] border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-60'
                    >
                      Valider le code
                    </button>
                  </div>
                </div>
              </div>

              <div className='rounded-[1.6rem] border border-slate-200 bg-white p-5'>
                <div className='flex items-center gap-3 text-emerald-700'>
                  <Upload className='h-5 w-5' />
                  <p className='text-xs uppercase tracking-[0.18em]'>Preuves</p>
                </div>
                <h4 className='mt-4 text-lg font-semibold text-slate-950'>Documents terrain</h4>
                <p className='mt-2 text-sm text-slate-600'>
                  Ajout autorise uniquement pendant une intervention en cours.
                </p>
                <div className='mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr_auto]'>
                  <textarea
                    value={evidenceNote}
                    onChange={(event) => setEvidenceNote(event.target.value)}
                    rows={3}
                    placeholder='Commentaire utile'
                    className='dashboard-input rounded-[1rem] px-4 py-3 text-sm'
                  />
                  <label className='dashboard-input flex cursor-pointer items-center rounded-[1rem] px-4 py-3 text-sm text-slate-500'>
                    <input
                      type='file'
                      accept='image/*'
                      className='hidden'
                      onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
                    />
                    {evidenceFile?.name || 'Choisir une photo'}
                  </label>
                  <button
                    type='button'
                    onClick={() => void handleEvidenceSubmit()}
                    disabled={busyAction === 'evidence'}
                    className='rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60'
                  >
                    Ajouter
                  </button>
                </div>
                <div className='mt-5 space-y-3'>
                  {selectedIntervention.evidences.length === 0 ? (
                    <div className='rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600'>
                      Aucune preuve pour cette mission.
                    </div>
                  ) : (
                    selectedIntervention.evidences.map((evidence) => (
                      <div key={evidence.id} className='rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4'>
                        <div className='flex flex-wrap items-center justify-between gap-3'>
                          <p className='text-sm font-medium text-slate-950'>{evidence.photoName}</p>
                          <span className='text-xs uppercase tracking-[0.18em] text-slate-500'>
                            {formatDate(evidence.createdAt)}
                          </span>
                        </div>
                        <p className='mt-2 text-sm text-slate-700'>{evidence.commentaire}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </article>

      <article className='dashboard-panel rounded-[2rem] border border-white/30 bg-[linear-gradient(180deg,rgba(252,254,254,0.98)_0%,rgba(238,247,244,0.94)_100%)] p-6 sm:p-8'>
        <div className='flex items-center gap-3 text-emerald-700'>
          <History className='h-5 w-5' />
          <p className='text-xs uppercase tracking-[0.24em]'>Historique personnel</p>
        </div>
        <h2 className='mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-950'>
          Historique
        </h2>
        <p className='mt-3 text-sm leading-7 text-slate-600'>
          Vue compacte des missions deja traitees avec les points de controle realises.
        </p>

        <div className='mt-6 space-y-4'>
          {historicalInterventions.length === 0 ? (
            <div className='rounded-[1.4rem] border border-slate-200 bg-white p-5 text-sm text-slate-600'>
              Aucun historique disponible.
            </div>
          ) : (
            historicalInterventions.map((intervention) => (
              <div key={intervention.id} className='rounded-[1.4rem] border border-slate-200 bg-white p-5'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div>
                    <p className='text-sm font-semibold text-slate-950'>{intervention.titre}</p>
                    <p className='mt-2 text-xs uppercase tracking-[0.18em] text-slate-500'>
                      {intervention.statut.replace('_', ' ')}
                    </p>
                  </div>
                  <div className='inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500'>
                    <Clock3 className='h-4 w-4' />
                    {formatDate(intervention.dateFin ?? intervention.updatedAt ?? intervention.dateCreation)}
                  </div>
                </div>
                <div className='mt-4 flex flex-wrap gap-2'>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${intervention.gpsConfirmedAt ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    GPS {intervention.gpsConfirmedAt ? 'ok' : 'non confirme'}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${intervention.qrVerifiedAt ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>
                    QR {intervention.qrVerifiedAt ? 'valide' : 'non scanne'}
                  </span>
                  <span className='rounded-full bg-amber-100 px-3 py-1 text-[11px] font-medium text-amber-700'>
                    {intervention.evidences.length} preuve{intervention.evidences.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </article>
    </section>
  )
}
