import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
} from '@generated/prisma-client/client';
import { EnumUserCreateMode } from '@modules/user/enums/user.enum';
import type { IUserCreateContract } from '@modules/user/interfaces/user.interface';

/**
 * Per-create-mode user onboarding rule: the logged created and personal-workspace actions, whether the rows name the acting admin, whether a verification email request is logged, and the password-history type.
 * @public
 */
export const UserCreateContract: Record<
    EnumUserCreateMode,
    IUserCreateContract
> = {
    [EnumUserCreateMode.signUp]: {
        createdAction: EnumActivityLogAction.userSignedUp,
        logsVerificationEmailRequest: true,
        passwordHistoryType: EnumPasswordHistoryType.signUp,
        personalWorkspaceAction: EnumActivityLogAction.workspaceCreated,
        logsActingAdmin: false,
    },
    [EnumUserCreateMode.social]: {
        createdAction: EnumActivityLogAction.userCreated,
        logsVerificationEmailRequest: false,
        passwordHistoryType: null,
        personalWorkspaceAction: EnumActivityLogAction.workspaceCreated,
        logsActingAdmin: false,
    },
    [EnumUserCreateMode.admin]: {
        createdAction: EnumActivityLogAction.userCreatedByAdmin,
        logsVerificationEmailRequest: true,
        passwordHistoryType: EnumPasswordHistoryType.admin,
        personalWorkspaceAction: EnumActivityLogAction.workspaceCreatedByAdmin,
        logsActingAdmin: true,
    },
};
