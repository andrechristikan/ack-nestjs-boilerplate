/**
 * Reason an admin-authored policy rule is rejected; selects the `policy.error.invalidRule.<reason>` message.
 * @public
 */
export enum EnumPolicyInvalidRuleReason {
    roleScopeInvalid = 'roleScopeInvalid',
    actionInvalid = 'actionInvalid',
    actionDuplicate = 'actionDuplicate',
    actionEmpty = 'actionEmpty',
    conditionsNotAllowed = 'conditionsNotAllowed',
}
