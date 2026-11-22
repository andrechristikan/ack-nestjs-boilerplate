import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumTermPolicyType,
    EnumUserLoginWith,
    EnumUserSignUpWith,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { IActivityLogInput } from '@modules/activity-log/interfaces/activity-log.interface';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserTermPolicyContract } from '@modules/user/contracts/user.term-policy.contract';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserLoginSocial,
    IUserSignUp,
    IUserSignUpPrepared,
    IUserSignUpResolved,
} from '@modules/user/interfaces/user.interface';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserRegistrationService {
    constructor(
        private readonly userAuthService: UserAuthService,
        private readonly featureFlagService: FeatureFlagService,
        private readonly userCreateUtil: UserCreateUtil,
        private readonly authPasswordService: AuthPasswordService,
        private readonly userVerificationUtil: UserVerificationUtil,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService
    ) {}

    private buildAcceptedTermPolicyTypes(
        cookies: boolean,
        marketing: boolean
    ): EnumTermPolicyType[] {
        return [
            ...UserTermPolicyContract.requiredTypes,
            ...(cookies ? [EnumTermPolicyType.cookies] : []),
            ...(marketing ? [EnumTermPolicyType.marketing] : []),
        ];
    }

    private resolveSocialFeatureFlagKey(
        loginWith: EnumUserLoginWith
    ): EnumFeatureFlagKey {
        return loginWith === EnumUserLoginWith.socialGoogle
            ? EnumFeatureFlagKey.loginWithGoogle
            : EnumFeatureFlagKey.loginWithApple;
    }

    /** False when a user already holds the normalized email or the provider flag's signUpAllowed sub-key is not set. */
    async isSocialSignUpAllowed(
        email: string,
        loginWith: EnumUserLoginWith
    ): Promise<boolean> {
        const featureFlagKey = this.resolveSocialFeatureFlagKey(loginWith);
        const [featureFlag, existing] = await Promise.all([
            this.featureFlagService.getMetadataByKey<{
                [EnumFeatureFlagMetadataKey.signUpAllowed]: boolean;
            }>(featureFlagKey),
            this.userAuthService.getOneByEmail(email),
        ]);

        const signUpAllowed =
            featureFlag?.[EnumFeatureFlagMetadataKey.signUpAllowed] === true;

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
        }: IUserSignUp,
        { roleId, workspaceContext }: IUserSignUpResolved
    ): Promise<IUserSignUpPrepared> {
        const userId = this.databaseUtil.createId();
        const password = await this.authPasswordService.create(passwordString);
        const emailVerification = this.userVerificationUtil.createEmail();
        const acceptedTermPolicyTypes = this.buildAcceptedTermPolicyTypes(
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
                workspaceContext,
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
        { roleId, workspaceContext }: IUserSignUpResolved
    ): IUserCreateWithWorkspaceInput {
        const userId = this.databaseUtil.createId();
        const verifiedAt = this.helperDateService.create();
        const acceptedTermPolicyTypes = this.buildAcceptedTermPolicyTypes(
            cookies,
            marketing
        );

        return {
            userId,
            email: email.trim().toLowerCase(),
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
            verifiedAt,
            acceptedTermPolicyTypes,
            password: null,
            passwordHistoryType: UserCreateContract.social.passwordHistoryType,
            verification: null,
            workspaceContext,
            createdBy: userId,
        };
    }

    buildCreateByAdminStages(
        input: IUserCreateWithWorkspaceInput,
        user: IUser
    ): IActivityLogInput<EnumActivityLogAction>[] {
        const stages = this.userCreateUtil.buildStages(
            UserCreateContract.admin,
            [input],
            [user]
        );

        return [
            {
                action: EnumActivityLogAction.adminUserCreated,
                metadata: {
                    targetUserId: user.id,
                    targetUsername: user.username,
                    timestamp: user.createdAt,
                },
            },
            ...stages,
        ];
    }
}
