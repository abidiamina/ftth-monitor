import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquareQuote, PenTool, Star, ThumbsUp } from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'
import { toast } from 'react-hot-toast'
import { submitInterventionClientApproval } from '@/services/interventionApi'
import type { InterventionRecord } from '@/types/auth.types'

type ClientSprint3PanelProps = {
  interventions: InterventionRecord[]
  signerName: string
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

export function ClientSprint3Panel({
  interventions,
  signerName,
  onRefresh,
}: ClientSprint3PanelProps) {
  const [selectedInterventionId, setSelectedInterventionId] = useState<number | null>(
    interventions.find((item) => item.statut === 'TERMINEE')?.id ?? null
  )
  const [feedbackComment, setFeedbackComment] = useState('')
  const [feedbackRating, setFeedbackRating] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const signatureRef = useRef<SignatureCanvas | null>(null)

  const completableInterventions = useMemo(
    () => interventions.filter((item) => item.statut === 'TERMINEE'),
    [interventions]
  )

  const selectedIntervention =
    interventions.find((item) => item.id === selectedInterventionId) ??
    completableInterventions[0] ??
    null

  const completionSummary = useMemo(
    () => ({
      completed: completableInterventions.length,
      signed: interventions.filter((item) => item.clientSignatureAt).length,
      feedbacks: interventions.filter((item) => item.clientFeedbackAt).length,
    }),
    [completableInterventions.length, interventions]
  )

  useEffect(() => {
    if (
      selectedInterventionId &&
      !completableInterventions.some((item) => item.id === selectedInterventionId)
    ) {
      setSelectedInterventionId(completableInterventions[0]?.id ?? null)
    }
  }, [completableInterventions, selectedInterventionId])

  const handleClearSignature = () => {
    signatureRef.current?.clear()
  }

  const handleSubmitApproval = async () => {
    if (!selectedIntervention) {
      return
    }

    if (selectedIntervention.clientSignatureAt || selectedIntervention.clientFeedbackAt) {
      toast.error('Cette intervention a deja ete validee.')
      return
    }

    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      toast.error('Signature requise.')
      return
    }

    setSubmitting(true)

    try {
      await submitInterventionClientApproval(selectedIntervention.id, {
        signature: signatureRef.current.toDataURL('image/png'),
        signatureBy: signerName,
        feedbackRating,
        feedbackComment,
      })
      await onRefresh()
      signatureRef.current.clear()
      setFeedbackComment('')
      setFeedbackRating(5)
      toast.success('Validation client enregistree.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Validation client impossible.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className='mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]'>
      <article className='dashboard-panel rounded-[2rem] border border-white/30 bg-[linear-gradient(180deg,rgba(248,252,251,0.98)_0%,rgba(236,246,243,0.96)_100%)] p-6 sm:p-8'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <div className='inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs uppercase tracking-[0.24em] text-emerald-700'>
              <PenTool className='h-4 w-4' />
              Validation client
            </div>
            <h2 className='mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950'>
              Signature
            </h2>
            <p className='mt-3 max-w-2xl text-sm leading-7 text-slate-600'>
              Valide une intervention terminee avec une signature propre, puis enchaine avec une evaluation claire.
            </p>
          </div>

          <div className='grid gap-3 sm:grid-cols-3'>
            <div className='rounded-[1.3rem] border border-slate-200 bg-white px-4 py-3'>
              <p className='text-xs uppercase tracking-[0.18em] text-slate-500'>Terminees</p>
              <p className='mt-2 text-2xl font-semibold text-slate-950'>{completionSummary.completed}</p>
            </div>
            <div className='rounded-[1.3rem] border border-slate-200 bg-white px-4 py-3'>
              <p className='text-xs uppercase tracking-[0.18em] text-slate-500'>Signatures</p>
              <p className='mt-2 text-2xl font-semibold text-slate-950'>{completionSummary.signed}</p>
            </div>
            <div className='rounded-[1.3rem] border border-slate-200 bg-white px-4 py-3'>
              <p className='text-xs uppercase tracking-[0.18em] text-slate-500'>Feedbacks</p>
              <p className='mt-2 text-2xl font-semibold text-slate-950'>{completionSummary.feedbacks}</p>
            </div>
          </div>
        </div>

        <div className='mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]'>
          <div className='space-y-3'>
            <p className='text-xs uppercase tracking-[0.18em] text-slate-500'>Interventions terminees</p>
            {completableInterventions.length === 0 ? (
              <div className='rounded-[1.4rem] border border-slate-200 bg-white p-5 text-sm text-slate-600'>
                Aucune intervention terminee.
              </div>
            ) : (
              completableInterventions.map((intervention) => (
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
                  <p className='text-sm font-semibold text-slate-950'>{intervention.titre}</p>
                  <p className='mt-2 text-xs uppercase tracking-[0.18em] text-slate-500'>
                    {intervention.validee ? 'Validee' : 'Terminee'}
                  </p>
                  <div className='mt-4 flex flex-wrap gap-2'>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${intervention.clientSignatureAt ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      Signature {intervention.clientSignatureAt ? 'ok' : 'a faire'}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${intervention.clientFeedbackAt ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                      Feedback {intervention.clientFeedbackAt ? 'ok' : 'a faire'}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          {selectedIntervention ? (
            <div className='space-y-5'>
              <div className='rounded-[1.6rem] border border-slate-200 bg-white p-5'>
                <p className='text-xs uppercase tracking-[0.18em] text-emerald-700'>Fiche validation</p>
                <h3 className='mt-2 text-2xl font-semibold text-slate-950'>
                  {selectedIntervention.titre}
                </h3>
                <div className='mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2'>
                  <p>
                    Technicien:{' '}
                    <span className='font-medium text-slate-900'>
                      {selectedIntervention.technicien
                        ? `${selectedIntervention.technicien.utilisateur.prenom} ${selectedIntervention.technicien.utilisateur.nom}`
                        : 'Non renseigne'}
                    </span>
                  </p>
                  <p>
                    Signataire: <span className='font-medium text-slate-900'>{signerName}</span>
                  </p>
                </div>
              </div>

              <div className='rounded-[1.6rem] border border-slate-200 bg-white p-5'>
                <p className='text-xs uppercase tracking-[0.18em] text-emerald-700'>Signature</p>
                {selectedIntervention.clientSignatureAt ? (
                  <div className='mt-4 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
                    Cette intervention a deja ete signee le {formatDate(selectedIntervention.clientSignatureAt)}.
                  </div>
                ) : null}
                <div className='mt-4 overflow-hidden rounded-[1.3rem] border border-slate-200 bg-white'>
                  <SignatureCanvas
                    ref={(instance) => {
                      signatureRef.current = instance
                    }}
                    penColor='#0f172a'
                    canvasProps={{
                      className: 'h-[220px] w-full',
                    }}
                  />
                </div>
                <div className='mt-4 flex flex-wrap gap-3'>
                  <button
                    type='button'
                    onClick={() => void handleSubmitApproval()}
                    disabled={submitting || Boolean(selectedIntervention.clientSignatureAt)}
                    className='rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60'
                  >
                    Enregistrer
                  </button>
                  <button
                    type='button'
                    onClick={handleClearSignature}
                    className='rounded-[1rem] border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200'
                  >
                    Effacer
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </article>

      <article className='dashboard-panel rounded-[2rem] border border-white/30 bg-[linear-gradient(180deg,rgba(252,254,254,0.98)_0%,rgba(238,247,244,0.94)_100%)] p-6 sm:p-8'>
        <div className='flex items-center gap-3 text-emerald-700'>
          <MessageSquareQuote className='h-5 w-5' />
          <p className='text-xs uppercase tracking-[0.24em]'>Retour client</p>
        </div>
        <h2 className='mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-950'>
          Evaluation
        </h2>
        <p className='mt-3 text-sm leading-7 text-slate-600'>
          Donne une note rapide et un commentaire lisible pour cloturer l experience de service.
        </p>

        {selectedIntervention ? (
          <div className='mt-6 space-y-5'>
            <div className='rounded-[1.6rem] border border-slate-200 bg-white p-5'>
              <div className='flex flex-wrap items-center gap-3'>
                {[1, 2, 3, 4, 5].map((value) => {
                  const active = value <= feedbackRating

                  return (
                    <button
                      key={value}
                      type='button'
                      disabled={Boolean(selectedIntervention.clientFeedbackAt)}
                      onClick={() => setFeedbackRating(value)}
                      className={`rounded-full border px-4 py-3 transition ${
                        active
                          ? 'border-amber-300/40 bg-amber-100 text-amber-700'
                          : 'border-slate-200 bg-white text-slate-500'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <Star className={`h-4 w-4 ${active ? 'fill-current' : ''}`} />
                    </button>
                  )
                })}
              </div>
              <textarea
                value={feedbackComment}
                onChange={(event) => setFeedbackComment(event.target.value)}
                rows={5}
                placeholder='Votre commentaire'
                disabled={Boolean(selectedIntervention.clientFeedbackAt)}
                className='dashboard-input mt-4 rounded-[1rem] px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60'
              />
            </div>

            <div className='rounded-[1.6rem] border border-slate-200 bg-white p-5'>
              <div className='flex items-center gap-3 text-emerald-700'>
                <ThumbsUp className='h-5 w-5' />
                <p className='text-xs uppercase tracking-[0.18em]'>Synthese</p>
              </div>
              <div className='mt-4 grid gap-3 text-sm text-slate-600'>
                <p>Signature: {formatDate(selectedIntervention.clientSignatureAt)}</p>
                <p>
                  Note: {selectedIntervention.clientFeedbackRating ? `${selectedIntervention.clientFeedbackRating}/5` : 'Non attribuee'}
                </p>
                <p>Feedback: {selectedIntervention.clientFeedbackAt ? formatDate(selectedIntervention.clientFeedbackAt) : 'Pas encore'}</p>
              </div>
              <p className='mt-4 text-sm leading-7 text-slate-700'>
                {selectedIntervention.clientFeedbackComment ?? 'Aucun commentaire.'}
              </p>
            </div>
          </div>
        ) : (
          <div className='mt-6 rounded-[1.4rem] border border-slate-200 bg-white p-5 text-sm text-slate-600'>
            Une intervention terminee est requise.
          </div>
        )}
      </article>
    </section>
  )
}
