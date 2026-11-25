import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumUserLoginWith,
    EnumUserSignUpWith,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { IActivityLogInput } from '@modules/activity-log/interfaces/activity-log.interface';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import type {
    IUser,
    IUserCreateLogin,
    IUserCreateWithWorkspaceInput,
    IUserLoginSocial,
    IUserRegistration,
    IUserRegistrationPrepared,
    IUserRegistrationResolved,
} from '@modules/user/interfaces/user.interface';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserRegistrationService {
    constructor(
        private readonly featureFlagService: FeatureFlagService,
        private readonly userCreateUtil: UserCreateUtil,
        private readonly userUtil: UserUtil,
        private readonly authPasswordService: AuthPasswordService,
        private readonly userVerificationUtil: UserVerificationUtil,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    private resolveSocialFeatureFlagKey(
        loginWith: EnumUserLoginWith
    ): EnumFeatureFlagKey {
        return loginWith === EnumUserLoginWith.socialGoogle
            ? EnumFeatureFlagKey.loginWithGoogle
            : EnumFeatureFlagKey.loginWithApple;
    }

    /** False when the email already has a user row, or the provider flag is off or its signUpAllowed sub-key is not true. */
    async isSocialSignUpAllowed(
        existing: IUser | null,
        loginWith: EnumUserLoginWith
    ): Promise<boolean> {
        const featureFlagKey = this.resolveSocialFeatureFlagKey(loginWith);
        const signUpAllowed = await this.featureFlagService.isMetadataAllowed(
            featureFlagKey,
            EnumFeatureFlagMetadataKey.signUpAllowed
        );

        return existing === null && signUpAllowed;
    }

    async prepareSignUp(
        {
            countryId,
            email,
            username,
            password: passwordString,
            name,
            from,
            cookies,
            marketing,
        }: IUserRegistration,
        { roleId, workspaceContext }: IUserRegistrationResolved
    ): Promise<IUserRegistrationPrepared> {
        const userId = this.databaseUtil.createId();
        const createdAt = this.helperDateService.now();
        const password = await this.authPasswordService.create(passwordString);
        const emailVerification = this.userVerificationUtil.createEmail();
        const acceptedTermPolicyTypes =
            this.userCreateUtil.buildAcceptedTermPolicyTypes(
                cookies,
                marketing
            );

        return {
            input: {
                userId,
                email,
                name,
                username,
                countryId,
                roleId,
                signUpFrom: from,
                signUpWith: EnumUserSignUpWith.credential,
                isVerified: false,
                verifiedAt: null,
                acceptedTermPolicyTypes,
                password,
                passwordHistoryType:
                    UserCreateContract.signUp.passwordHistoryType,
                verification: {
                    reference: emailVerification.reference,
                    token: emailVerification.hashedToken,
                    type: EnumVerificationType.email,
                    action: null,
                    mobileNumberId: null,
                    to: email,
                    expiredAt: emailVerification.expiredAt,
                    verifiedAt: null,
                    isUsed: false,
                },
                login: null,
                workspaceContext,
                createdAt,
                createdBy: userId,
            },
            emailVerification,
        };
    }

    buildSocialCreate(
        email: string,
        loginWith: EnumUserLoginWith,
        {
            from,
            username,
            name,
            countryId,
            cookies,
            marketing,
        }: IUserLoginSocial,
        { roleId, workspaceContext }: IUserRegistrationResolved,
        login: IUserCreateLogin
    ): IUserCreateWithWorkspaceInput {
        const userId = this.databaseUtil.createId();
        const normalizedEmail = this.userUtil.normalizeEmail(email);
        const createdAt = this.helperDateService.now();
        const acceptedTermPolicyTypes =
            this.userCreateUtil.buildAcceptedTermPolicyTypes(
                cookies,
                marketing
            );

        return {
            userId,
            email: normalizedEmail,
            name,
            username,
            countryId,
            roleId,
            signUpFrom: from,
            signUpWith:
                loginWith === EnumUserLoginWith.socialApple
                    ? EnumUserSignUpWith.socialApple
                    : EnumUserSignUpWith.socialGoogle,
            isVerified: true,
            verifiedAt: createdAt,
            acceptedTermPolicyTypes,
            password: null,
            passwordHistoryType: UserCreateContract.social.passwordHistoryType,
            verification: null,
            login,
            workspaceContext,
            createdAt,
            createdBy: userId,
        };
    }

    buildCreateByAdminStages(
        input: IUserCreateWithWorkspaceInput
    ): IActivityLogInput<EnumActivityLogAction>[] {
        const stages = this.userCreateUtil.buildStages(
            UserCreateContract.admin,
            [input]
        );

        return [
            {
                action: EnumActivityLogAction.adminUserCreated,
                metadata: {
                    targetUserId: input.userId,
                    targetUsername: input.username,
                    timestamp: input.createdAt,
                },
            },
            ...stages,
        ];
    }
}
