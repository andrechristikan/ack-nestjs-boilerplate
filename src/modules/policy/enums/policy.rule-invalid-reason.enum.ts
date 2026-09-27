/**
 * Reasons a policy rule is rejected before storage; each selects one i18n message.
 * @public
 */
export enum EnumPolicyRuleInvalidReason {
    actionNotAllowed = 'actionNotAllowed',
    roleScopeInvalid = 'roleScopeInvalid',
    scopeMissing = 'scopeMissing',
}
