import { useState, useCallback } from 'react'
import { Mountain, Users, Radio, Flag, ChevronLeft, X, Check } from 'lucide-react'
import type { SalidaFormData, User, SalidaRecord, SalidaStatus } from '../../types/salida'
import { saveDraft, loadDraft, loadDraftStep, clearDraft, saveDraftStep, saveGuestSalida } from '../../lib/storage'
import { createSalida } from '../../lib/api'
import { Button } from '../ui/Button'
import { Step1General } from './Step1General'
import { Step2Participants } from './Step2Participants'
import { Step3HumanTeam } from './Step3Equipment'
import { Step4Communications } from './Step4GPX'
import { Step5Status } from './Step5Status'

interface WizardLayoutProps {
  user: User
  isGuest: boolean
  onDone: () => void
  onCancel: () => void
  onCreateIntegrante: () => void
}

type StepId = 1 | 2 | 3 | 4 | 5

interface StepMeta {
  id: StepId
  label: string
  shortLabel: string
  icon: React.ReactNode
}

// Matches what Zod infers from step5Schema (incidentReport is optional)
interface Step5SubmitData {
  status: SalidaStatus
  incidentReport?: string
}

const STEPS: StepMeta[] = [
  { id: 1, label: 'Clasificacion de la Salida', shortLabel: 'Clasificacion', icon: <Mountain size={16} /> },
  { id: 2, label: 'Cronologia y Seguridad', shortLabel: 'Cronologia', icon: <Users size={16} /> },
  { id: 3, label: 'Equipo Humano', shortLabel: 'Equipo', icon: <Users size={16} /> },
  { id: 4, label: 'Comunicaciones y Equipo Crítico', shortLabel: 'Comunicaciones', icon: <Radio size={16} /> },
  { id: 5, label: 'Estado', shortLabel: 'Estado', icon: <Flag size={16} /> },
]

const EMPTY_FORM: Omit<SalidaFormData, 'gpxFile'> = {
  tipoSalida: 'NO_OFICIAL',
  disciplina: 'TREKKING',
  nombreActividad: '',
  ubicacionGeografica: '',
  fechaInicio: '',
  fechaRetornoEstimada: '',
  horaRetornoEstimada: '',
  horaAlerta: '',
  avisosExternos: [],
  liderCordada: '',
  participantes: [],
  coordinacionGrupal: false,
  matrizRiesgos: false,
  mediosComunicacion: [],
  idDispositivoFrecuencia: '',
  equipoColectivo: [],
  equipoColectivoOtro: '',
  status: 'BORRADOR',
  incidentReport: '',
}

function hasDraft(): boolean {
  const draft = loadDraft()
  return !!(draft && Object.keys(draft).length > 0)
}

export function WizardLayout({ user, isGuest, onDone, onCancel, onCreateIntegrante }: WizardLayoutProps) {
  const [currentStep, setCurrentStep] = useState<StepId>(1)
  const [formData, setFormData] = useState<Omit<SalidaFormData, 'gpxFile'>>(EMPTY_FORM)
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(new Set())
  // Initialize banner from localStorage directly in useState — no effect needed
  const [showDraftBanner, setShowDraftBanner] = useState<boolean>(hasDraft)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const restoreDraft = useCallback(() => {
    const draft = loadDraft()
    const step = loadDraftStep() as StepId
    if (draft) {
      setFormData((prev) => ({ ...prev, ...draft }))
    }
    if (step >= 1 && step <= 5) {
      setCurrentStep(step)
    }
    setShowDraftBanner(false)
  }, [])

  const discardDraft = useCallback(() => {
    clearDraft()
    setShowDraftBanner(false)
    setFormData(EMPTY_FORM)
    setCurrentStep(1)
  }, [])

  const updateFormData = useCallback(
    (data: Partial<Omit<SalidaFormData, 'gpxFile'>>) => {
      setFormData((prev) => {
        const updated = { ...prev, ...data }
        saveDraft(updated)
        return updated
      })
    },
    [],
  )

  const handleStepComplete = useCallback(
    (stepId: StepId, data: Partial<Omit<SalidaFormData, 'gpxFile'>>) => {
      updateFormData(data)
      setCompletedSteps((prev) => new Set([...prev, stepId]))

      if (stepId < 5) {
        const next = (stepId + 1) as StepId
        setCurrentStep(next)
        saveDraftStep(next)
      }
    },
    [updateFormData],
  )

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      const prev = (currentStep - 1) as StepId
      setCurrentStep(prev)
      saveDraftStep(prev)
    }
  }, [currentStep])

  const handleFinalSubmit = useCallback(
    async (step5Data: Step5SubmitData) => {
      const finalData: Omit<SalidaFormData, 'gpxFile'> = {
        ...formData,
        status: step5Data.status,
        incidentReport: step5Data.incidentReport ?? '',
      }
      setIsSubmitting(true)
      setSubmitError(null)

      try {
        if (isGuest) {
          // Save locally for guest users
          const localRecord: SalidaRecord = {
            id: `guest-${Date.now()}`,
            ...finalData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: user.id,
          }
          saveGuestSalida(localRecord)
        } else {
          await createSalida(finalData)
        }

        clearDraft()
        setSubmitSuccess(true)
        setTimeout(onDone, 1500)
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : 'Error al guardar la salida',
        )
        setIsSubmitting(false)
      }
    },
    [formData, isGuest, user.id, onDone],
  )

  // Success screen
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-[#f2f0ec] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#e8f0ea] mx-auto mb-4">
            <Check size={32} className="text-[#4E805D]" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Salida registrada
          </h2>
          <p className="text-[#757874] text-sm">Redirigiendo...</p>
        </div>
      </div>
    )
  }

  const currentStepMeta = STEPS[currentStep - 1]

  return (
    <div className="min-h-screen bg-[#f2f0ec] flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-[#687C6B]/15 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-sm text-[#757874] hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4E805D] rounded transition-colors"
            aria-label="Cancelar y volver"
          >
            <X size={18} />
            <span className="hidden sm:inline">Cancelar</span>
          </button>

          <div className="flex items-center gap-2">
            <Mountain size={18} className="text-[#4E805D]" />
            <span className="font-semibold text-slate-800 text-sm">
              Nueva Salida
            </span>
          </div>

          <span className="text-xs text-[#757874] font-medium">
            {currentStep} / {STEPS.length}
          </span>
        </div>
      </header>

      {/* Bar stepper */}
      <div className="bg-white border-b border-[#687C6B]/10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-3 pb-2">
          {/* Progress bars */}
          <div className="flex gap-1.5 mb-2" role="list" aria-label="Progreso del formulario">
            {STEPS.map((step) => {
              const isCompleted = completedSteps.has(step.id)
              const isActive = step.id === currentStep
              return (
                <div
                  key={step.id}
                  role="listitem"
                  aria-label={`Paso ${step.id}: ${step.label}${isCompleted ? ' (completado)' : isActive ? ' (actual)' : ''}`}
                  className={[
                    'flex-1 h-1 rounded-full transition-colors duration-300',
                    isCompleted || (isActive && completedSteps.has(step.id))
                      ? 'bg-[#4E805D]'
                      : isActive
                      ? 'bg-[#4E805D]/60'
                      : 'bg-[#e2e5e2]',
                  ].join(' ')}
                />
              )
            })}
          </div>
          {/* Current step label */}
          <p className="text-xs font-semibold text-[#4E805D] uppercase tracking-wider">
            Paso {currentStep} &mdash; {STEPS[currentStep - 1].label}
          </p>
        </div>
      </div>

      {/* Draft banner */}
      {showDraftBanner && (
        <div className="bg-[#fef9f0] border-b border-[#A4636E]/30">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm">
            <p className="text-[#8b5a3a] flex-1">
              Tienes un borrador guardado. ¿Deseas continuar donde lo dejaste?
            </p>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={restoreDraft}>
                Continuar borrador
              </Button>
              <Button variant="ghost" size="sm" onClick={discardDraft}>
                Descartar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-[#4E805D] mb-1">
            {currentStepMeta.icon}
            <span className="text-xs font-semibold uppercase tracking-wider">
              Paso {currentStep} de {STEPS.length}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {currentStepMeta.label}
          </h2>
        </div>

        {submitError && (
          <div className="flex items-start gap-2 rounded-xl bg-[#f5e8ea] border border-[#A4636E]/30 p-3 mb-5 text-sm text-[#8b3a44]">
            <span>{submitError}</span>
          </div>
        )}

        {currentStep === 1 && (
          <Step1General
            defaultValues={{
              tipoSalida: formData.tipoSalida,
              disciplina: formData.disciplina,
              nombreActividad: formData.nombreActividad,
              ubicacionGeografica: formData.ubicacionGeografica,
            }}
            onSubmit={(data) => handleStepComplete(1, data)}
          />
        )}
        {currentStep === 2 && (
          <Step2Participants
            defaultValues={{
              fechaInicio: formData.fechaInicio,
              fechaRetornoEstimada: formData.fechaRetornoEstimada,
              horaRetornoEstimada: formData.horaRetornoEstimada,
              horaAlerta: formData.horaAlerta,
              avisosExternos: formData.avisosExternos,
            }}
            onSubmit={(data) => handleStepComplete(2, data)}
            onBack={goBack}
          />
        )}
        {currentStep === 3 && (
          <Step3HumanTeam
            defaultValues={{
              liderCordada: formData.liderCordada,
              participantes: formData.participantes,
              coordinacionGrupal: formData.coordinacionGrupal,
              matrizRiesgos: formData.matrizRiesgos,
            }}
            onSubmit={(data) => handleStepComplete(3, data)}
            onBack={goBack}
            onCreateIntegrante={onCreateIntegrante}
          />
        )}
        {currentStep === 4 && (
          <Step4Communications
            defaultValues={{
              mediosComunicacion: formData.mediosComunicacion,
              idDispositivoFrecuencia: formData.idDispositivoFrecuencia,
              equipoColectivo: formData.equipoColectivo,
              equipoColectivoOtro: formData.equipoColectivoOtro,
            }}
            onSubmit={(data) => handleStepComplete(4, data)}
            onBack={goBack}
          />
        )}
        {currentStep === 5 && (
          <Step5Status
            defaultValues={{
              status: formData.status,
              incidentReport: formData.incidentReport,
            }}
            isSubmitting={isSubmitting}
            onSubmit={handleFinalSubmit}
            onBack={goBack}
          />
        )}
      </main>

      {/* Back nav for step 2+ on mobile */}
      {currentStep > 1 && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#687C6B]/10 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ChevronLeft size={16} />
            Paso anterior
          </Button>
        </div>
      )}
    </div>
  )
}
