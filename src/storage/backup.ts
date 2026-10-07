import { z } from 'zod'
import type { SavedEpisode } from './db'

const answerSchema = z.enum(['yes', 'no', 'unknown', 'unanswered'])
const sideSchema = z.enum(['right', 'left', 'unknown'])
const observationSchema = z.object({
  test: z.enum(['dix_hallpike', 'supine_roll', 'other']),
  side: sideSchema,
  status: z.enum(['completed', 'partial', 'aborted']),
  vertigo: answerSchema,
  eyeVisibility: z.enum(['adequate', 'limited', 'closed', 'unknown']),
  nystagmus: z.enum(['observed', 'not_seen', 'uncertain', 'not_observed']),
  vertical: z.enum(['up', 'down', 'none', 'unknown']),
  horizontal: z.enum(['patient_right', 'patient_left', 'none', 'unknown']),
  torsion: z.enum(['patient_right', 'patient_left', 'none', 'unknown']),
  durationSeconds: z.number().finite().nonnegative().nullable(),
}).strict()

const evaluationInputSchema = z.object({
  screen: z.object({
    neurological: answerSchema,
    lossOfConsciousness: answerSchema,
    severeHeadache: answerSchema,
    neckTraumaPain: answerSchema,
    continuousVertigoAtRest: answerSchema,
    suddenHearingLoss: answerSchema,
    persistentVomiting: answerSchema,
    downbeatObserved: answerSchema,
    movementRestriction: answerSchema,
    complete: z.boolean(),
  }).strict(),
  observations: z.array(observationSchema),
  preparation: z.object({ adult: z.boolean(), helper: z.boolean(), safeSurface: z.boolean(), training: z.boolean() }).strict(),
  instruction: z.object({
    procedure: z.literal('home_epley'),
    side: z.enum(['right', 'left']),
    applicable: z.boolean(),
    trained: z.boolean(),
  }).strict().nullable(),
}).strict()

const backupSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string().datetime({ offset: true }),
  episodes: z.array(z.object({
    id: z.string().trim().min(1),
    createdAt: z.string().datetime({ offset: true }),
    label: z.string().trim().min(1).max(200),
    input: evaluationInputSchema,
  }).strict()),
}).strict()

export interface LocalBackup {
  schemaVersion: 1
  exportedAt: string
  episodes: SavedEpisode[]
}

export function parseBackupText(text: string): LocalBackup {
  try {
    return parseBackup(JSON.parse(text) as unknown)
  } catch (error) {
    if (error instanceof Error && error.message === 'В резервной копии повторяется идентификатор эпизода.') throw error
    throw new Error('Файл не соответствует формату резервной копии приложения.')
  }
}

export function parseBackup(value: unknown): LocalBackup {
  const parsed = backupSchema.safeParse(value)
  if (!parsed.success) throw new Error('Файл не соответствует формату резервной копии приложения.')

  const ids = new Set<string>()
  for (const episode of parsed.data.episodes) {
    if (ids.has(episode.id)) throw new Error('В резервной копии повторяется идентификатор эпизода.')
    ids.add(episode.id)
  }
  return parsed.data as LocalBackup
}
