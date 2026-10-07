import { openDB } from 'idb'
import type { EvaluationInput } from '../domain/evaluate'

export interface SavedEpisode { id: string; createdAt: string; label: string; input: EvaluationInput }
const dbPromise = openDB('bppv-home-helper-v1', 1, { upgrade(db) { db.createObjectStore('episodes', { keyPath: 'id' }) } })
export async function saveEpisode(episode: SavedEpisode) { await (await dbPromise).put('episodes', episode) }
export async function listEpisodes() { return (await dbPromise).getAll('episodes') as Promise<SavedEpisode[]> }
export async function importEpisodes(episodes: SavedEpisode[]) { const db = await dbPromise; const tx = db.transaction('episodes', 'readwrite'); for (const episode of episodes) await tx.store.put(episode); await tx.done }
