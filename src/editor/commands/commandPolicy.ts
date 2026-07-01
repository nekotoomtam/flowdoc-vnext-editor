export interface CommandReadiness {
  canExecute: boolean
  reason: string
}

export function createBlockedCommand(reason: string): CommandReadiness {
  return {
    canExecute: false,
    reason,
  }
}
