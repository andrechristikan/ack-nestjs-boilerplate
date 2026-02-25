import {
    EnumInvitationType,
    EnumRoleScope,
    EnumUserSignUpFrom,
    Prisma,
} from '@prisma/client';

export type InvitationMemberStatus = 'pending' | 'active' | 'inactive';

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
     * Origin of the invitation flow.
     */
    invitationType: EnumInvitationType;

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

export interface InvitationAcceptanceTarget {
    invitationType: EnumInvitationType;
    contextId: string;
    memberId?: string;
}

export interface InvitationTokenPayload {
    expiresAt: Date;
    expiredInMinutes: number;
    resendInMinutes: number;
    reference: string;
    token: string;
    link: string;
}

export interface InvitationProviderMember {
    id: string;
    status: InvitationMemberStatus;
}

/**
 * Provider contract consumed by `InvitationService` for current
 * tenant/project invitation flows.
 *
 * Membership and context operations are required to preserve strong
 * compile-time guarantees for context-bound invitations.
 */
export interface InvitationProvider {
    /**
     * Fixed invitation flow discriminator for the implementing provider.
     *
     * Example:
     * - `EnumInvitationType.projectMember` in `ProjectInvitationProvider`
     * - `EnumInvitationType.tenantMember` in `TenantInvitationProvider`
     */
    invitationType: EnumInvitationType;

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
     * Finds an existing membership for the user in the target context,
     * regardless of status, to support invitation idempotency and status-aware flows.
     */
    findMemberByUserId(
        contextId: string,
        userId: string
    ): Promise<InvitationProviderMember | null>;

    /**
     * Creates a membership record for the given user inside the context.
     *
     * @param contextId - Identifier of the context entity.
     * @param userId - User identifier being invited/added.
     * @param roleId - Role id resolved in `roleScope`.
     * @param createdBy - Actor id that initiated the operation.
     * @returns Newly created membership id.
     *
     * Implementations should create a membership record compatible with their
     * domain model (typically `pending` for invitation acceptance flows).
     */
    createMember(
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

export type InvitationWithUser = Prisma.InvitationGetPayload<{
    include: { user: true };
}>;

export interface IInvitationCreate {
    userId: string;
    userEmail: string;
    token: string;
    reference: string;
    expiresAt: Date;
    invitationType: EnumInvitationType;
    roleScope: EnumRoleScope;
    contextId: string;
    contextName: string;
    memberId?: string;
    metadata?: Prisma.InputJsonValue;
    requestedBy: string;
}