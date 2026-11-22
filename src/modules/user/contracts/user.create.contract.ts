import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
} from '@generated/prisma-client/client';
import type { IUserCreateContracts } from '@modules/user/interfaces/user.interface';

/** @public */
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
        logsVerificationEmailRequest: false,
        passwordHistoryType: EnumPasswordHistoryType.admin,
        personalWorkspaceAction: EnumActivityLogAction.workspaceCreatedByAdmin,
        logsActingAdmin: true,
    },
};
