const ENABLED_CONFIG_VALUES = new Set(["1", "true", "yes", "on"])

export function resolveFlowDocLayoutQaEnabled(configuredValue: string | undefined): boolean {
  return ENABLED_CONFIG_VALUES.has(configuredValue?.trim().toLowerCase() ?? "")
}
