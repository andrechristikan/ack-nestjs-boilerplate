import {
    EnumActivityLogAction,
    EnumUserSignUpWith,
} from '@generated/prisma-client/client';
import { EnumFeatureFlagKey } from '@modules/feature-flag/enums/feature-flag.enum';
import type { IUserSocialLoginContracts } from '@modules/user/interfaces/user.interface';

/** @public */
export const UserSocialLoginContract: IUserSocialLoginContracts = {
    socialGoogle: {
        signUpWith: EnumUserSignUpWith.socialGoogle,
        featureFlagKey: EnumFeatureFlagKey.loginWithGoogle,
        loginAction: EnumActivityLogAction.userLoginGoogle,
    },
    socialApple: {
        signUpWith: EnumUserSignUpWith.socialApple,
        featureFlagKey: EnumFeatureFlagKey.loginWithApple,
        loginAction: EnumActivityLogAction.userLoginApple,
    },
    socialGithub: {
        signUpWith: EnumUserSignUpWith.socialGithub,
        featureFlagKey: EnumFeatureFlagKey.loginWithGithub,
        loginAction: EnumActivityLogAction.userLoginGithub,
    },
};
