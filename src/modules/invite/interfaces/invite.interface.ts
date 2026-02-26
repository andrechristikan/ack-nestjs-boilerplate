import {
    EnumInviteType,
    EnumRoleScope,
    EnumUserSignUpFrom,
    Prisma,
} from '@prisma/client';

export type InviteMemberStatus = 'pending' | 'active' | 'inactive';

export interface InviteTokenPayload {
    expiresAt: Date;
    expiredInMinutes: number;
    resendInMinutes: number;
    reference: string;
    token: string;
    link: string;
}

export interface InviteProviderMember {
    id: string;
    status: InviteMemberStatus;
}

/**
 * Provider contract consumed by `InviteService` for current
 * tenant/project invitation flows.
 *
 * Membership and context operations are required to preserve strong
 * compile-time guarantees for context-bound invitations.
 */
export interface InviteProvider {
    /**
     * Fixed invitation flow discriminator for the implementing provider.
     *
     * Example:
     * - `EnumInviteType.projectMember` in `ProjectInviteProvider`
     * - `EnumInviteType.tenantMember` in `TenantInviteProvider`
     */
    invitationType: EnumInviteType;

    /**
     * Fixed role scope used when validating role names for this invitation flow.
     *
     * `InviteService.createInvite` uses this scope to ensure role lookup
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
    ): Promise<InviteProviderMember | null>;

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
     * and `InviteService` needs the corresponding user id.
     */
    findMemberUserId(
        contextId: string,
        memberId: string
    ): Promise<string | null>;

    activateMemberForInvite(
        contextId: string,
        userId: string,
        memberId?: string
    ): Promise<void>;
}

export type InviteWithUser = Prisma.InviteGetPayload<{
    include: { user: true };
}>;

export interface IInviteCreate {
    userId: string;
    userEmail: string;
    token: string;
    reference: string;
    expiresAt: Date;
    invitationType: EnumInviteType;
    roleScope: EnumRoleScope;
    contextId: string;
    contextName: string;
    memberId?: string;
    metadata?: Prisma.InputJsonValue;
    requestedBy: string;
}
