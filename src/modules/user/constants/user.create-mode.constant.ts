import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
} from '@generated/prisma-client';
import { EnumUserCreateMode } from '@modules/user/enums/user.enum';
import { IUserCreateModeRule } from '@modules/user/interfaces/user.interface';

export const UserCreateModeRules: Record<
    EnumUserCreateMode,
    IUserCreateModeRule
> = {
    [EnumUserCreateMode.signUp]: {
        createdAction: EnumActivityLogAction.userSignedUp,
        logsVerificationEmailRequest: true,
        passwordHistoryType: EnumPasswordHistoryType.signUp,
    },
    [EnumUserCreateMode.social]: {
        createdAction: EnumActivityLogAction.userCreated,
        logsVerificationEmailRequest: false,
        passwordHistoryType: null,
    },
    [EnumUserCreateMode.admin]: {
        createdAction: EnumActivityLogAction.userCreated,
        logsVerificationEmailRequest: true,
        passwordHistoryType: EnumPasswordHistoryType.admin,
    },
};
