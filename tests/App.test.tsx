import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

vi.mock('../src/storage/db', () => ({
  importEpisodes: vi.fn(),
  listEpisodes: vi.fn().mockResolvedValue([]),
  saveEpisode: vi.fn(),
}))

import App from '../src/App'

describe('onboarding consent', () => {
  beforeEach(() => localStorage.clear())

  it('requires an explicit acknowledgement before entering the app', async () => {
    const user = userEvent.setup()
    render(<App />)

    const start = screen.getByRole('button', { name: 'Начать' })
    expect(start).toBeDisabled()

    await user.click(screen.getByRole('checkbox', { name: /Мне 18\+/ }))
    expect(start).toBeEnabled()

    await user.click(start)
    expect(screen.getByRole('heading', { name: 'Позиционное головокружение' })).toBeInTheDocument()
  })

  it('offers a labelled manual observation form rather than recording a preset clinical finding', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('checkbox', { name: /Мне 18\+/ }))
    await user.click(screen.getByRole('button', { name: 'Начать' }))
    await user.click(screen.getByRole('button', { name: 'Наблюдения' }))

    expect(screen.getByRole('heading', { name: 'Добавить наблюдение' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Статус выполнения' })).toHaveValue('partial')
    expect(screen.getByRole('button', { name: 'Добавить наблюдение' })).toBeInTheDocument()
  })
})
