const STORAGE_KEY = 'veritrust-ai-prototype-v1'

export function loadWorkspace(initialAgents) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (stored && Array.isArray(stored.agents) && Array.isArray(stored.logs)) return stored
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
  return { agents: initialAgents, logs: [] }
}

export function persistWorkspace(agents, logs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ agents, logs }))
}