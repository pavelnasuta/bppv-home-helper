import { describe, expect, it } from 'vitest'
import { parseBackup, parseBackupText } from '../src/storage/backup'

const episode = {
  id: 'episode-1',
  createdAt: '2026-10-07T12:00:00.000Z',
  label: 'Наблюдение',
  input: {
    screen: { neurological: 'no', lossOfConsciousness: 'no', severeHeadache: 'no', neckTraumaPain: 'no', continuousVertigoAtRest: 'no', suddenHearingLoss: 'no', persistentVomiting: 'no', downbeatObserved: 'no', movementRestriction: 'no', complete: true },
    observations: [],
    preparation: { adult: false, helper: false, safeSurface: false, training: false },
    instruction: null,
  },
}

describe('local backup validation', () => {
  it('accepts a version 1 backup without changing its episode data', () => {
    const backup = { schemaVersion: 1, exportedAt: '2026-10-07T12:00:00.000Z', episodes: [episode] }

    expect(parseBackup(backup)).toEqual(backup)
  })

  it('rejects an unsupported backup version before importing any episode', () => {
    expect(() => parseBackup({ schemaVersion: 2, exportedAt: '2026-10-07T12:00:00.000Z', episodes: [episode] })).toThrow('Файл не соответствует формату резервной копии приложения.')
  })

  it('rejects an episode whose observations are not an array', () => {
    const corruptEpisode = { ...episode, input: { ...episode.input, observations: 'not an array' } }

    expect(() => parseBackup({ schemaVersion: 1, exportedAt: '2026-10-07T12:00:00.000Z', episodes: [corruptEpisode] })).toThrow('Файл не соответствует формату резервной копии приложения.')
  })

  it('rejects invalid dates, invalid observation values, and duplicate episode ids', () => {
    const invalidDate = { ...episode, createdAt: 'not a date' }
    const invalidObservation = { ...episode, input: { ...episode.input, observations: [{ test: 'dix_hallpike', side: 'right', status: 'completed', vertigo: 'maybe', eyeVisibility: 'adequate', nystagmus: 'observed', vertical: 'up', horizontal: 'none', torsion: 'patient_right', durationSeconds: 30 }] } }

    expect(() => parseBackup({ schemaVersion: 1, exportedAt: '2026-10-07T12:00:00.000Z', episodes: [invalidDate] })).toThrow('Файл не соответствует формату резервной копии приложения.')
    expect(() => parseBackup({ schemaVersion: 1, exportedAt: '2026-10-07T12:00:00.000Z', episodes: [invalidObservation] })).toThrow('Файл не соответствует формату резервной копии приложения.')
    expect(() => parseBackup({ schemaVersion: 1, exportedAt: '2026-10-07T12:00:00.000Z', episodes: [episode, episode] })).toThrow('В резервной копии повторяется идентификатор эпизода.')
  })

  it('normalizes invalid JSON text to the safe import validation error', () => {
    expect(() => parseBackupText('{not json}')).toThrow('Файл не соответствует формату резервной копии приложения.')
  })
})
