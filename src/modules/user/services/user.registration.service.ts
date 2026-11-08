import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import {
    EnumUserSignUpWith,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { EnumUserLoginWith } from '@generated/prisma-client/client';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { EnumFeatureFlagMetadataKey } from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserSignUp,
    IUserSignUpPrepared,
    IUserSignUpResolved,
} from '@modules/user/interfaces/user.interface';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserService } from '@modules/user/services/user.service';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserRegistrationService {
    constructor(
        private readonly userService: UserService,
        private readonly userAuthService: UserAuthService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly notificationService: NotificationService,
        private readonly featureFlagService: FeatureFlagService,
        private readonly userCreateUtil: UserCreateUtil,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly userVerificationUtil: UserVerificationUtil,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    /** Creates the users with their first password-history entries and default notification settings on the caller's transaction. */
    async createInTx(
        tx: IDatabaseTransactionClient,
        inputs: IUserCreateWithWorkspaceInput[]
    ): Promise<IUser[]> {
        const passwordHistories =
            this.userCreateUtil.buildPasswordHistoryEntries(inputs);
        const userIds = this.userCreateUtil.buildUserIds(inputs);

        const created = await this.userService.createManyInTx(tx, inputs);
        await this.passwordHistoryService.createManyInTx(tx, passwordHistories);
        await this.notificationService.createDefaultsManyInTx(tx, userIds);

        return created;
    }

    /** False when a user already holds the normalized email or the provider flag's signUpAllowed sub-key is not set. */
    async isSocialSignUpAllowed(
        email: string,
        loginWith: EnumUserLoginWith
    ): Promise<boolean> {
        const featureFlagKey =
            this.userCreateUtil.resolveSocialFeatureFlagKey(loginWith);
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
        const password =
            await this.authPasswordUtil.createPassword(passwordString);
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
}
