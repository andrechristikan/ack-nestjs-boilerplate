/** @public */
export enum EnumPolicyInvalidRuleReason {
    roleScopeInvalid = 'roleScopeInvalid',
    actionInvalid = 'actionInvalid',
    actionDuplicate = 'actionDuplicate',
    actionEmpty = 'actionEmpty',
    conditionsNotAllowed = 'conditionsNotAllowed',
}

/** @public */
export enum EnumPolicyConditionPlaceholder {
    userId = '${userId}',
    workspaceId = '${workspaceId}',
    projectId = '${projectId}',
}
