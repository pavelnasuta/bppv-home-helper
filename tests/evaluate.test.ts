import { describe, expect, it } from 'vitest'
import { evaluateEpisode, getProcedureEligibility, type EvaluationInput } from '../src/domain/evaluate'

const safe: EvaluationInput = {
  screen: { neurological: 'no', lossOfConsciousness: 'no', severeHeadache: 'no', neckTraumaPain: 'no', continuousVertigoAtRest: 'no', suddenHearingLoss: 'no', persistentVomiting: 'no', downbeatObserved: 'no', movementRestriction: 'no', complete: true },
  observations: [],
  preparation: { adult: true, helper: true, safeSurface: true, training: true },
  instruction: { procedure: 'home_epley', side: 'right', applicable: true, trained: true },
}

describe('safety-first assessment', () => {
  it('R01 makes emergency route override a classic posterior observation', () => {
    const result = evaluateEpisode({ ...safe, screen: { ...safe.screen, neurological: 'yes' }, observations: [{ test: 'dix_hallpike', side: 'right', status: 'completed', vertigo: 'yes', eyeVisibility: 'adequate', nystagmus: 'observed', vertical: 'up', horizontal: 'none', torsion: 'patient_right', durationSeconds: 30 }] })
    expect(result.safetyRoute).toBe('emergency')
    expect(result.allowedActions).not.toContain('start_home_epley')
  })

  it('R04 recognises a short right posterior pattern without claiming a diagnosis', () => {
    const result = evaluateEpisode({ ...safe, observations: [{ test: 'dix_hallpike', side: 'right', status: 'completed', vertigo: 'yes', eyeVisibility: 'adequate', nystagmus: 'observed', vertical: 'up', horizontal: 'none', torsion: 'patient_right', durationSeconds: 30 }] })
    expect(result.pattern).toBe('posterior_pattern')
    expect(result.suggestedSide).toBe('right')
    expect(result.matchedRuleIds).toContain('R04')
  })

  it('R14 routes downbeat observation to same-day assessment', () => {
    const result = evaluateEpisode({ ...safe, observations: [{ test: 'dix_hallpike', side: 'left', status: 'completed', vertigo: 'yes', eyeVisibility: 'adequate', nystagmus: 'observed', vertical: 'down', horizontal: 'none', torsion: 'none', durationSeconds: 20 }] })
    expect(result.pattern).toBe('atypical_downbeat')
    expect(result.safetyRoute).toBe('urgent_assessment')
  })

  it('does not unlock Epley without a clinician instruction and training', () => {
    const assessment = evaluateEpisode({ ...safe, instruction: null, preparation: { ...safe.preparation, training: false } })
    expect(getProcedureEligibility({ ...safe, instruction: null, preparation: { ...safe.preparation, training: false } }, assessment).eligible).toBe(false)
  })

  it('keeps home Epley unavailable while clinical review is pending even when all recorded prerequisites are met', () => {
    const assessment = evaluateEpisode({
      ...safe,
      observations: [{ test: 'dix_hallpike', side: 'right', status: 'completed', vertigo: 'yes', eyeVisibility: 'adequate', nystagmus: 'observed', vertical: 'up', horizontal: 'none', torsion: 'patient_right', durationSeconds: 30 }],
    })

    const eligibility = getProcedureEligibility({
      ...safe,
      observations: [{ test: 'dix_hallpike', side: 'right', status: 'completed', vertigo: 'yes', eyeVisibility: 'adequate', nystagmus: 'observed', vertical: 'up', horizontal: 'none', torsion: 'patient_right', durationSeconds: 30 }],
    }, assessment)

    expect(eligibility.eligible).toBe(false)
    expect(eligibility.reasons).toContain('Пошаговый домашний манёвр закрыт до клинической проверки протокола.')
  })
})
