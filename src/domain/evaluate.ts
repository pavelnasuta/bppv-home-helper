export type Answer = 'yes' | 'no' | 'unknown' | 'unanswered'
export type Side = 'right' | 'left' | 'unknown'
export type SafetyRoute = 'emergency' | 'urgent_assessment' | 'movement_review' | 'incomplete_screen' | 'preparation_missing' | 'no_reported_blockers'
export type Pattern = 'insufficient_data' | 'positional_symptoms_only' | 'posterior_pattern' | 'posterior_pattern_uncertain' | 'bilateral_or_complex' | 'horizontal_geotropic_pattern' | 'horizontal_apogeotropic_pattern' | 'horizontal_pattern_unresolved' | 'atypical_downbeat' | 'atypical_or_unclear' | 'no_characteristic_nystagmus_observed' | 'no_characteristic_signs'

export interface Observation { test: 'dix_hallpike' | 'supine_roll' | 'other'; side: Side; status: 'completed' | 'partial' | 'aborted'; vertigo: Answer; eyeVisibility: 'adequate' | 'limited' | 'closed' | 'unknown'; nystagmus: 'observed' | 'not_seen' | 'uncertain' | 'not_observed'; vertical: 'up' | 'down' | 'none' | 'unknown'; horizontal: 'patient_right' | 'patient_left' | 'none' | 'unknown'; torsion: 'patient_right' | 'patient_left' | 'none' | 'unknown'; durationSeconds: number | null }
export interface EvaluationInput { screen: { neurological: Answer; lossOfConsciousness: Answer; severeHeadache: Answer; neckTraumaPain: Answer; continuousVertigoAtRest: Answer; suddenHearingLoss: Answer; persistentVomiting: Answer; downbeatObserved: Answer; movementRestriction: Answer; complete: boolean }; observations: Observation[]; preparation: { adult: boolean; helper: boolean; safeSurface: boolean; training: boolean }; instruction: { procedure: 'home_epley'; side: 'right' | 'left'; applicable: boolean; trained: boolean } | null }
export interface Assessment { safetyRoute: SafetyRoute; pattern: Pattern; suggestedSide: Side; mechanism: 'not_determined'; matchedRuleIds: string[]; missingData: string[]; conflicts: string[]; reasons: string[]; allowedActions: string[]; blockedActions: Array<{ action: string; reasons: string[] }> }

const emergencyKeys: Array<keyof EvaluationInput['screen']> = ['neurological', 'lossOfConsciousness', 'severeHeadache', 'neckTraumaPain']
const urgentKeys: Array<keyof EvaluationInput['screen']> = ['continuousVertigoAtRest', 'suddenHearingLoss', 'persistentVomiting', 'downbeatObserved']
const requiredKeys: Array<keyof EvaluationInput['screen']> = ['neurological', 'lossOfConsciousness', 'severeHeadache', 'neckTraumaPain', 'continuousVertigoAtRest', 'suddenHearingLoss', 'persistentVomiting', 'downbeatObserved', 'movementRestriction']

function route(screen: EvaluationInput['screen']): SafetyRoute {
  if (emergencyKeys.some(k => screen[k] === 'yes')) return 'emergency'
  if (urgentKeys.some(k => screen[k] === 'yes')) return 'urgent_assessment'
  if (!screen.complete || requiredKeys.some(k => screen[k] === 'unknown' || screen[k] === 'unanswered')) return 'incomplete_screen'
  if (screen.movementRestriction === 'yes') return 'movement_review'
  return 'no_reported_blockers'
}

export function evaluateEpisode(input: EvaluationInput): Assessment {
  const safetyRoute = route(input.screen)
  const base: Assessment = { safetyRoute, pattern: 'insufficient_data', suggestedSide: 'unknown', mechanism: 'not_determined', matchedRuleIds: [], missingData: [], conflicts: [], reasons: [], allowedActions: ['record_observations', 'export_report'], blockedActions: [] }
  if (safetyRoute !== 'no_reported_blockers') {
    base.matchedRuleIds.push('R01'); base.reasons.push(safetyRoute === 'emergency' ? 'Есть новый опасный симптом: прекратите пробы и обратитесь за экстренной помощью.' : 'Домашние процедуры закрыты до очной оценки или уточнения скрининга.')
    base.blockedActions.push({ action: 'start_home_epley', reasons: [safetyRoute] }); return base
  }
  const observations = input.observations
  if (!observations.length) { base.missingData.push('Нет записей проб текущей сессии.'); base.reasons.push('Добавьте наблюдения или сохраните самочувствие в дневник.'); return base }
  if (observations.some(o => o.status !== 'completed' || o.eyeVisibility !== 'adequate' || o.nystagmus === 'uncertain' || o.nystagmus === 'not_observed')) {
    base.matchedRuleIds.push('R02'); base.missingData.push('Наблюдение неполное, прервано или глаза были видны недостаточно.'); base.reasons.push('Это не считается отрицательной пробой.'); return base
  }
  const downbeat = observations.find(o => o.nystagmus === 'observed' && o.vertical === 'down')
  if (downbeat) { return { ...base, safetyRoute: 'urgent_assessment', pattern: 'atypical_downbeat', matchedRuleIds: ['R14'], reasons: ['Отмечено преимущественно нисходящее движение глаз. Домашние манёвры не предлагать; нужна очная оценка.'], blockedActions: [{ action: 'start_home_epley', reasons: ['atypical_downbeat'] }] } }
  const posterior = observations.filter(o => o.test === 'dix_hallpike' && o.nystagmus === 'observed' && o.vertigo === 'yes' && o.vertical === 'up' && o.horizontal === 'none' && o.torsion === (o.side === 'right' ? 'patient_right' : o.side === 'left' ? 'patient_left' : 'none'))
  if (posterior.length >= 2 && new Set(posterior.map(o => o.side)).size > 1) return { ...base, pattern: 'bilateral_or_complex', matchedRuleIds: ['R07'], reasons: ['Характерные реакции записаны с обеих сторон; не выбирать сторону или два манёвра подряд.'] }
  if (posterior.length === 1) {
    const item = posterior[0]
    if (item.durationSeconds === null || item.durationSeconds >= 60) return { ...base, pattern: 'posterior_pattern_uncertain', suggestedSide: item.side, matchedRuleIds: ['R06'], reasons: ['Картина похожа на заднеканальную, но длительность не позволяет выбрать домашний сценарий.'] }
    return { ...base, pattern: 'posterior_pattern', suggestedSide: item.side, matchedRuleIds: [item.side === 'right' ? 'R04' : 'R05'], reasons: [`Наблюдения похожи на паттерн ${item.side === 'right' ? 'правого' : 'левого'} заднего канала. Это не диагноз.`] }
  }
  if (observations.some(o => o.test === 'dix_hallpike' && o.nystagmus === 'observed' && o.horizontal !== 'none')) return { ...base, pattern: 'horizontal_pattern_unresolved', matchedRuleIds: ['R13'], reasons: ['Горизонтальная реакция при пробе Дикса–Холлпайка не классифицируется как задний канал.'] }
  if (observations.some(o => o.nystagmus === 'observed' && (o.vertical === 'up' || o.horizontal !== 'none'))) return { ...base, pattern: 'atypical_or_unclear', matchedRuleIds: ['R15'], reasons: ['Направление движений глаз не образует пригодный для домашнего выбора паттерн.'] }
  if (observations.every(o => o.nystagmus === 'not_seen')) return { ...base, pattern: 'no_characteristic_nystagmus_observed', matchedRuleIds: ['R16'], reasons: ['Характерные движения глаз не зарегистрированы. Это не исключает ДППГ и другие причины.'] }
  return { ...base, pattern: 'positional_symptoms_only', matchedRuleIds: ['R03'], reasons: ['Есть позиционные симптомы, но направление движений глаз не определено.'] }
}

export function getProcedureEligibility(input: EvaluationInput, assessment = evaluateEpisode(input)) {
  const reasons: string[] = ['Пошаговый домашний манёвр закрыт до клинической проверки протокола.']
  if (assessment.safetyRoute !== 'no_reported_blockers') reasons.push('Текущий скрининг не разрешает домашнюю процедуру.')
  if (!input.preparation.adult || !input.preparation.helper || !input.preparation.safeSurface || !input.preparation.training) reasons.push('Не подтверждены возраст, помощник, безопасное место или обучение.')
  if (!input.instruction || !input.instruction.applicable || !input.instruction.trained) reasons.push('Нет применимой ранее показанной рекомендации специалиста.')
  if (input.instruction && assessment.suggestedSide !== 'unknown' && assessment.suggestedSide !== input.instruction.side) reasons.push('Новые наблюдения противоречат ранее указанной стороне.')
  if (['atypical_downbeat', 'atypical_or_unclear', 'bilateral_or_complex', 'posterior_pattern_uncertain'].includes(assessment.pattern)) reasons.push('Наблюдения не позволяют запускать домашний манёвр.')
  return { eligible: reasons.length === 0, reasons }
}
