import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumRoleScope,
    EnumTermPolicyType,
    EnumUserLoginWith,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { FeatureFlagCache } from '@modules/feature-flag/caches/feature-flag.cache';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumUserCreateMode } from '@modules/user/enums/user.enum';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserTermPolicyContract } from '@modules/user/contracts/user.term-policy.contract';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import { UserInactiveForbiddenException } from '@modules/user/exceptions/user.inactive-forbidden.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import { UserPasswordNotMatchException } from '@modules/user/exceptions/user.password-not-match.exception';
import { UserPasswordNotSetException } from '@modules/user/exceptions/user.password-not-set.exception';
import { UserUsernameContainBadWordException } from '@modules/user/exceptions/user.username-contain-bad-word.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import { UserUsernameNotAllowedException } from '@modules/user/exceptions/user.username-not-allowed.exception';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserLoginCredential,
    IUserLoginOutcome,
    IUserLoginSocial,
    IUserSignUp,
    IUserSignUpWorkspaceContext,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserLoginDomain } from '@modules/user/domains/user.login.domain';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserAuthDomain {
    private readonly userRoleKey: string;

    constructor(
        private readonly userRepository: UserRepository,
        private readonly userPasswordDomain: UserPasswordDomain,
        private readonly roleDomain: RoleDomain,
        private readonly countryDomain: CountryDomain,
        private readonly userUtil: UserUtil,
        private readonly userVerificationDomain: UserVerificationDomain,
        private readonly userLoginDomain: UserLoginDomain,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly featureFlagCache: FeatureFlagCache,
        private readonly databaseUtil: DatabaseUtil,
        private readonly notificationQueue: NotificationQueue,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {
        this.userRoleKey = this.configService.get<string>('user.default.role')!;
    }

    async assertWorkspaceInvitationAllowed(): Promise<void> {
        await this.userLoginDomain.assertWorkspaceInvitationAllowed();
    }

    async loginCredential({
        email,
        password,
        from,
        device,
    }: IUserLoginCredential): Promise<IUserLoginOutcome> {
        const user = await this.userRepository.findOneWithRoleByEmail(email);
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.status !== EnumUserStatus.active) {
            throw new UserInactiveForbiddenException();
        } else if (!user.password) {
            throw new UserPasswordNotSetException();
        }

        const isPasswordAttemptMaxed =
            this.authPasswordUtil.checkPasswordAttempt(user);
        if (isPasswordAttemptMaxed) {
            await this.userPasswordDomain.reachMaxPasswordAttempt(user.id);

            throw new UserPasswordAttemptMaxException();
        }

        const isPasswordValid = this.authPasswordUtil.validatePassword(
            password,
            user.password
        );
        if (!isPasswordValid) {
            await this.userLoginDomain.recordLoginFailed(user.id);

            throw new UserPasswordNotMatchException();
        }

        await this.userPasswordDomain.resetPasswordAttempt(user.id);

        const checkPasswordExpired: boolean =
            this.authPasswordUtil.checkPasswordExpired(user.passwordExpired!);
        if (checkPasswordExpired) {
            throw new UserPasswordExpiredException();
        }

        const now = this.helperDateService.create();

        return this.userLoginDomain.handleLogin(
            user,
            device,
            from,
            EnumUserLoginWith.credential,
            now
        );
    }

    async prepareSocialCreate(
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
        workspaceContext: IUserSignUpWorkspaceContext
    ): Promise<IUserCreateWithWorkspaceInput | null> {
        const featureFlag =
            await this.featureFlagCache.getMetadataByKeyAndCache<{
                signUpAllowed: boolean;
            }>(
                loginWith === EnumUserLoginWith.socialGoogle
                    ? 'loginWithGoogle'
                    : 'loginWithApple'
            );
        const user = await this.userRepository.findOneWithRoleByEmail(email);
        if (user || !featureFlag?.signUpAllowed) {
            return null;
        }

        const role = await this.roleDomain.getByScopeAndKey(
            EnumRoleScope.platform,
            this.userRoleKey
        );
        if (!role) {
            throw new RoleNotFoundException();
        }

        const [checkUsernamePattern, checkUsernameBadWord, usernameExist] =
            await Promise.all([
                this.userUtil.checkUsernamePattern(username),
                this.userUtil.checkBadWord(username),
                this.userRepository.existsByUsername(username),
            ]);
        if (checkUsernamePattern) {
            throw new UserUsernameNotAllowedException();
        } else if (checkUsernameBadWord) {
            throw new UserUsernameContainBadWordException();
        } else if (usernameExist) {
            throw new UserUsernameExistException();
        }

        const userId = this.databaseUtil.createId();

        return {
            userId,
            email,
            name: name ?? null,
            username,
            countryId,
            roleId: role.id,
            signUpFrom: from,
            signUpWith:
                loginWith === EnumUserLoginWith.socialApple
                    ? EnumUserSignUpWith.socialApple
                    : EnumUserSignUpWith.socialGoogle,
            isVerified: true,
            termPolicy: {
                ...UserTermPolicyContract.defaults,
                [EnumTermPolicyType.cookies]: cookies,
                [EnumTermPolicyType.marketing]: marketing,
            },
            acceptedTermPolicyTypes: [
                ...UserTermPolicyContract.requiredTypes,
                ...(cookies ? [EnumTermPolicyType.cookies] : []),
                ...(marketing ? [EnumTermPolicyType.marketing] : []),
            ],
            password: null,
            passwordHistoryType:
                UserCreateContract[EnumUserCreateMode.social]
                    .passwordHistoryType,
            verification: null,
            workspaceContext,
            createdBy: userId,
        };
    }

    async loginWithSocial(
        email: string,
        loginWith: EnumUserLoginWith,
        { from, device }: IUserLoginSocial
    ): Promise<IUserLoginOutcome> {
        const user = await this.userRepository.findOneWithRoleByEmail(email);
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.status !== EnumUserStatus.active) {
            throw new UserInactiveForbiddenException();
        }

        if (!user.isVerified) {
            await this.userVerificationDomain.markVerified(user.id);
            user.isVerified = true;
        }

        const now = this.helperDateService.create();

        return this.userLoginDomain.handleLogin(
            user,
            device,
            from,
            loginWith,
            now
        );
    }

    async refresh(user: IUser, refreshToken: string): Promise<IAuthToken> {
        return this.userLoginDomain.refreshSession(user, refreshToken);
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
        workspaceContext: IUserSignUpWorkspaceContext
    ): Promise<{
        input: IUserCreateWithWorkspaceInput;
        emailVerification: IUserVerificationEmailCreate;
    }> {
        const [role, emailExist, checkCountry] = await Promise.all([
            this.roleDomain.getByScopeAndKey(
                EnumRoleScope.platform,
                this.userRoleKey
            ),
            this.userRepository.existsByEmail(email),
            this.countryDomain.existsById(countryId),
        ]);
        if (!role) {
            throw new RoleNotFoundException();
        } else if (!checkCountry) {
            throw new CountryNotFoundException();
        } else if (emailExist) {
            throw new UserEmailExistException();
        }

        const [checkUsernamePattern, checkUsernameBadWord, usernameExist] =
            await Promise.all([
                this.userUtil.checkUsernamePattern(username),
                this.userUtil.checkBadWord(username),
                this.userRepository.existsByUsername(username),
            ]);
        if (checkUsernamePattern) {
            throw new UserUsernameNotAllowedException();
        } else if (checkUsernameBadWord) {
            throw new UserUsernameContainBadWordException();
        } else if (usernameExist) {
            throw new UserUsernameExistException();
        }

        const userId = this.databaseUtil.createId();
        const password = this.authPasswordUtil.createPassword(passwordString);
        const emailVerification =
            this.userVerificationDomain.verificationCreateVerification(
                EnumVerificationType.email
            ) as IUserVerificationEmailCreate;

        return {
            input: {
                userId,
                email,
                name: name ?? null,
                username,
                countryId,
                roleId: role.id,
                signUpFrom: from,
                signUpWith: EnumUserSignUpWith.credential,
                isVerified: false,
                termPolicy: {
                    ...UserTermPolicyContract.defaults,
                    [EnumTermPolicyType.cookies]: cookies,
                    [EnumTermPolicyType.marketing]: marketing,
                },
                acceptedTermPolicyTypes: [
                    ...UserTermPolicyContract.requiredTypes,
                    ...(cookies ? [EnumTermPolicyType.cookies] : []),
                    ...(marketing ? [EnumTermPolicyType.marketing] : []),
                ],
                password,
                passwordHistoryType:
                    UserCreateContract[EnumUserCreateMode.signUp]
                        .passwordHistoryType,
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

    async notifyWelcome(
        userId: string,
        emailVerification: IUserVerificationEmailCreate
    ): Promise<void> {
        const expiredAt = this.helperDateService.formatToIso(
            emailVerification.expiredAt
        );
        await this.notificationQueue.sendWelcome(userId, {
            expiredAt,
            reference: emailVerification.reference,
            link: emailVerification.link,
            expiredInMinutes: emailVerification.expiredInMinutes,
        });
    }

    async logout(
        userId: string,
        sessionId: string,
        deviceOwnershipId: string
    ): Promise<void> {
        try {
            await this.userLoginDomain.logout(
                userId,
                sessionId,
                deviceOwnershipId
            );

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }
}
