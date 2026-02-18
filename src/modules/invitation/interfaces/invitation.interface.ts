import { EnumRoleScope, EnumUserSignUpFrom } from '@prisma/client';

/**
 * Discriminator for invitation origins handled by the generic invitation flow.
 *
 * This value is:
 * - persisted in verification metadata for traceability,
 * - propagated to email payloads for context-aware copy,
 * - used by providers/services to keep behavior explicit per origin.
 */
export type InvitationType = 'project_member' | 'tenant_member';

/**
 * Canonical invitation context payload assembled by `InvitationService`
 * and forwarded to user/email layers when sending an invitation.
 *
 * The object is intentionally compact and serializable because it is also
 * stored inside verification metadata for auditability and deterministic
 * invitation rendering.
 */
export interface InvitationContext {
    /**
     * Origin of the invitation flow (project member vs tenant member).
     *
     * Used to:
     * - identify which business flow generated the invitation,
     * - drive invitation-specific email content decisions,
     * - make invitation metadata self-describing for future analysis.
     */
    invitationType: InvitationType;

    /**
     * Authorization scope associated with the invited role.
     *
     * The scope is used by role resolution and by email copy
     * (for example: "join the project" / "join the tenant").
     */
    roleScope: EnumRoleScope;

    /**
     * Identifier of the concrete context instance where membership is created.
     *
     * Examples:
     * - project id when inviting a project member
     * - tenant id when inviting a tenant member
     *
     * Stored in metadata to keep a strong link between token and source context.
     */
    contextId: string;

    /**
     * Human-readable name of the target context.
     *
     * This is resolved by the provider at send time and included in email data
     * so recipients understand exactly which entity they are joining.
     */
    contextName: string;
}

/**
 * Provider contract consumed by `InvitationService`.
 *
 * A provider adapts one domain (project, tenant, future domains) to the
 * generic invitation workflow by exposing:
 * - static context metadata (`invitationType`, `roleScope`, `signUpFrom`),
 * - membership operations (`existsMember`, `addMember`, `findMemberUserId`),
 * - context lookup (`getContextName`).
 *
 * This keeps invitation orchestration centralized while preserving domain
 * isolation inside each provider implementation.
 */
export interface InvitationProvider {
    /**
     * Fixed invitation flow discriminator for the implementing provider.
     *
     * Example:
     * - `project_member` in `ProjectInvitationProvider`
     * - `tenant_member` in `TenantInvitationProvider`
     */
    invitationType: InvitationType;

    /**
     * Fixed role scope used when validating role names for this invitation flow.
     *
     * `InvitationService.createInvitation` uses this scope to ensure role lookup
     * is performed in the correct namespace.
     */
    roleScope: EnumRoleScope;

    /**
     * Signup origin to assign when creating a new user from invitation.
     *
     * This provides analytics/audit value and removes invitation-type-to-signup
     * mapping logic from the central service.
     */
    signUpFrom: EnumUserSignUpFrom;

    /**
     * Resolves the human-readable context name for email and metadata.
     *
     * @param contextId - Identifier of the context entity (project/tenant id).
     * @returns Context name when found, otherwise `null`.
     *
     * Returning `null` indicates the context does not exist or is not readable,
     * and causes invitation sending to fail with a not-found error.
     */
    getContextName(contextId: string): Promise<string | null>;

    /**
     * Checks whether the target user is already a member of the context.
     *
     * @param contextId - Identifier of the context entity.
     * @param userId - User identifier to check.
     * @returns `true` when membership already exists, otherwise `false`.
     *
     * This guard prevents duplicate memberships before attempting `addMember`.
     */
    existsMember(
        contextId: string,
        userId: string
    ): Promise<boolean>;

    /**
     * Creates a membership record for the given user inside the context.
     *
     * @param contextId - Identifier of the context entity.
     * @param userId - User identifier being invited/added.
     * @param roleId - Role id resolved in `roleScope`.
     * @param createdBy - Actor id that initiated the operation.
     * @returns Newly created membership id.
     *
     * Implementations should create an active membership compatible with their
     * domain model so invitation sending can target this member afterwards.
     */
    addMember(
        contextId: string,
        userId: string,
        roleId: string,
        createdBy: string
    ): Promise<string>;

    /**
     * Resolves the user id from a context-specific membership id.
     *
     * @param contextId - Identifier of the context entity.
     * @param memberId - Membership id within that context.
     * @returns Member user id when found, otherwise `null`.
     *
     * Used by invitation resend/send endpoints where the API receives a member id
     * and `InvitationService` needs the corresponding user id.
     */
    findMemberUserId(
        contextId: string,
        memberId: string
    ): Promise<string | null>;
}
