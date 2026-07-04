export interface DeleteSafetyFacts {
  childCount: number
  id: string
  label: string
  operationSurface: string | null
  type: string
}

export interface DeleteConfirmationRequirement {
  message: string
  required: boolean
  title: string
}

function getTargetLabel(facts: DeleteSafetyFacts): string {
  const trimmedLabel = facts.label.trim()
  return trimmedLabel.length > 0 ? trimmedLabel : facts.id
}

function nestedItemLabel(count: number): string {
  return count === 1 ? "1 nested item" : `${count} nested items`
}

export function getDeleteConfirmationRequirement(facts: DeleteSafetyFacts): DeleteConfirmationRequirement {
  const targetLabel = getTargetLabel(facts)
  const nestedMessage = facts.childCount > 0
    ? ` and ${nestedItemLabel(facts.childCount)}`
    : ""

  return {
    message: `Delete ${targetLabel}${nestedMessage}?`,
    required: true,
    title: "Confirm delete",
  }
}
