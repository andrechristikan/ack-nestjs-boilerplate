import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
} from '@generated/prisma-client/client';
import type { IUserCreateContracts } from '@modules/user/interfaces/user.interface';

/**
 * Per-create-flow user rule, keyed by sign-up, social sign-in, and admin create or import: the logged created and personal-workspace actions, whether the rows name the acting admin, whether a verification email request is logged, and the password-history type.
 * @public
 */
export const UserCreateContract: IUserCreateContracts = {
    signUp: {
        createdAction: EnumActivityLogAction.userSignedUp,
        logsVerificationEmailRequest: true,
        passwordHistoryType: EnumPasswordHistoryType.signUp,
        personalWorkspaceAction: EnumActivityLogAction.workspaceCreated,
        logsActingAdmin: false,
    },
    social: {
        createdAction: EnumActivityLogAction.userCreated,
        logsVerificationEmailRequest: false,
        passwordHistoryType: null,
        personalWorkspaceAction: EnumActivityLogAction.workspaceCreated,
        logsActingAdmin: false,
    },
    admin: {
        createdAction: EnumActivityLogAction.userCreatedByAdmin,
        logsVerificationEmailRequest: true,
        passwordHistoryType: EnumPasswordHistoryType.admin,
        personalWorkspaceAction: EnumActivityLogAction.workspaceCreatedByAdmin,
        logsActingAdmin: true,
    },
};
