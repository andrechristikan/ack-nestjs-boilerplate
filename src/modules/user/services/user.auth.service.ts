import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumTermPolicyType,
    EnumUserLoginWith,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client';
import { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { CountryService } from '@modules/country/services/country.service';
import { FeatureFlagCacheService } from '@modules/feature-flag/services/feature-flag.cache.service';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleService } from '@modules/role/services/role.service';
import { EnumUserCreateMode } from '@modules/user/enums/user.enum';
import { UserCreateModeRules } from '@modules/user/constants/user.create-mode.constant';
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
import { IUserAuthService } from '@modules/user/interfaces/user.auth.service.interface';
import {
    IUser,
    IUserLoginCredential,
    IUserLoginOutcome,
    IUserLoginSocial,
    IUserSignUp,
    IUserSignUpWorkspaceContext,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { UserOnboardingRepository } from '@modules/user/repositories/user.onboarding.repository';
import { UserPasswordRepository } from '@modules/user/repositories/user.password.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserSessionRepository } from '@modules/user/repositories/user.session.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { UserLoginService } from '@modules/user/services/user.login.service';
import { UserOnboardingService } from '@modules/user/services/user.onboarding.service';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserAuthService implements IUserAuthService {
    private readonly userRoleName: string;

    constructor(
        private readonly userRepository: UserRepository,
        private readonly userOnboardingRepository: UserOnboardingRepository,
        private readonly userPasswordRepository: UserPasswordRepository,
        private readonly userSessionRepository: UserSessionRepository,
        private readonly userVerificationRepository: UserVerificationRepository,
        private readonly roleService: RoleService,
        private readonly countryService: CountryService,
        private readonly userUtil: UserUtil,
        private readonly userVerificationService: UserVerificationService,
        private readonly helperHashService: HelperHashService,
        private readonly userOnboardingUtil: UserOnboardingUtil,
        private readonly userOnboardingService: UserOnboardingService,
        private readonly userLoginService: UserLoginService,
        private readonly authPasswordService: AuthPasswordService,
        private readonly featureFlagCacheService: FeatureFlagCacheService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly notificationQueue: NotificationQueue,
        private readonly helperDateService: HelperDateService,
        private readonly requestStoreService: RequestStoreService,
        private readonly configService: ConfigService
    ) {
        this.userRoleName =
            this.configService.get<string>('user.default.role')!;
    }

    private async resolveWorkspaceContext(
        username: string,
        email: string,
        workspaceInviteToken?: string
    ): Promise<IUserSignUpWorkspaceContext> {
        if (workspaceInviteToken) {
            await this.userLoginService.assertWorkspaceInvitationAllowed();
        }

        const [personalContext] =
            this.userOnboardingService.buildPersonalWorkspaceContexts([
                username,
            ]);
        const workspaceContext = workspaceInviteToken
            ? await this.userOnboardingRepository.resolveInviteWorkspaceContext(
                  this.helperHashService.sha256Hash(workspaceInviteToken),
                  email,
                  this.helperDateService.create()
              )
            : personalContext;
        if (workspaceInviteToken && !workspaceContext) {
            throw new WorkspaceInviteInvalidException();
        }

        return workspaceContext!;
    }

    async loginCredential({
        email,
        password,
        from,
        device,
    }: IUserLoginCredential): Promise<IUserLoginOutcome> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const user = await this.userRepository.findOneWithRoleByEmail(email);
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.status !== EnumUserStatus.active) {
            throw new UserInactiveForbiddenException();
        } else if (!user.password) {
            throw new UserPasswordNotSetException();
        }

        if (this.authPasswordService.checkPasswordAttempt(user)) {
            await this.userPasswordRepository.reachMaxPasswordAttempt(
                user.id,
                requestLog
            );

            throw new UserPasswordAttemptMaxException();
        } else if (
            !this.authPasswordService.validatePassword(password, user.password)
        ) {
            await this.userPasswordRepository.increasePasswordAttempt(user.id);

            throw new UserPasswordNotMatchException();
        }

        await this.userPasswordRepository.resetPasswordAttempt(user.id);

        const checkPasswordExpired: boolean =
            this.authPasswordService.checkPasswordExpired(
                user.passwordExpired!
            );
        if (checkPasswordExpired) {
            throw new UserPasswordExpiredException();
        }

        return this.userLoginService.handleLogin(
            user,
            device,
            from,
            EnumUserLoginWith.credential,
            this.helperDateService.create()
        );
    }

    async loginWithSocial(
        email: string,
        loginWith: EnumUserLoginWith,
        {
            from,
            device,
            username,
            workspaceInviteToken,
            name,
            countryId,
            cookies,
            marketing,
        }: IUserLoginSocial
    ): Promise<IUserLoginOutcome> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const featureFlag =
            await this.featureFlagCacheService.getMetadataByKeyAndCache<{
                signUpAllowed: boolean;
            }>(
                loginWith === EnumUserLoginWith.socialGoogle
                    ? 'loginWithGoogle'
                    : 'loginWithApple'
            );
        let user = await this.userRepository.findOneWithRoleByEmail(email);

        if (!user && featureFlag?.signUpAllowed) {
            const role = await this.roleService.existByName(this.userRoleName);
            if (!role) {
                throw new RoleNotFoundException();
            }

            const [checkUsernamePattern, checkUsernameBadWord, usernameExist] =
                await Promise.all([
                    this.userUtil.checkUsernamePattern(username),
                    this.userUtil.checkBadWord(username),
                    this.userRepository.existByUsername(username),
                ]);
            if (checkUsernamePattern) {
                throw new UserUsernameNotAllowedException();
            } else if (checkUsernameBadWord) {
                throw new UserUsernameContainBadWordException();
            } else if (usernameExist) {
                throw new UserUsernameExistException();
            }

            const workspaceContext = await this.resolveWorkspaceContext(
                username,
                email,
                workspaceInviteToken
            );

            const userId = this.databaseUtil.createId();
            let createdUser: IUser;
            try {
                createdUser =
                    await this.userOnboardingRepository.createWithWorkspace({
                        userId,
                        email,
                        name,
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
                            [EnumTermPolicyType.cookies]: cookies,
                            [EnumTermPolicyType.marketing]: marketing,
                            [EnumTermPolicyType.privacy]: true,
                            [EnumTermPolicyType.termsOfService]: true,
                        },
                        acceptedTermPolicyTypes: [
                            EnumTermPolicyType.termsOfService,
                            EnumTermPolicyType.privacy,
                            ...(cookies ? [EnumTermPolicyType.cookies] : []),
                            ...(marketing
                                ? [EnumTermPolicyType.marketing]
                                : []),
                        ],
                        password: null,
                        passwordHistoryType:
                            UserCreateModeRules[EnumUserCreateMode.social]
                                .passwordHistoryType,
                        verification: null,
                        activityLogs:
                            this.userOnboardingService.buildOnboardingActivityLogs(
                                EnumUserCreateMode.social,
                                workspaceContext,
                                requestLog,
                                userId
                            ),
                        workspaceContext,
                        workspaceRows:
                            this.userOnboardingService.buildWorkspaceRows(
                                userId,
                                workspaceContext,
                                userId
                            ),
                        createdBy: userId,
                    });
            } catch (error: unknown) {
                throw this.userOnboardingUtil.mapCreateCollision(error);
            }

            user = createdUser;

            await this.notificationQueue.sendWelcomeSocial(user.id);
        }

        if (user!.status !== EnumUserStatus.active) {
            throw new UserInactiveForbiddenException();
        }

        if (!user!.isVerified) {
            const updatedUser = await this.userVerificationRepository.verify(
                user!.id,
                requestLog
            );
            user!.isVerified = updatedUser.isVerified;
        }

        return this.userLoginService.handleLogin(
            user!,
            device,
            from,
            loginWith,
            this.helperDateService.create()
        );
    }

    async refresh(user: IUser, refreshToken: string): Promise<IAuthToken> {
        return this.userLoginService.refreshSession(user, refreshToken);
    }

    async signUp({
        countryId,
        email,
        username,
        password: passwordString,
        workspaceInviteToken,
        name,
        from,
        cookies,
        marketing,
    }: IUserSignUp): Promise<void> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const [role, emailExist, checkCountry] = await Promise.all([
            this.roleService.existByName(this.userRoleName),
            this.userRepository.existByEmail(email),
            this.countryService.existById(countryId),
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
                this.userRepository.existByUsername(username),
            ]);
        if (checkUsernamePattern) {
            throw new UserUsernameNotAllowedException();
        } else if (checkUsernameBadWord) {
            throw new UserUsernameContainBadWordException();
        } else if (usernameExist) {
            throw new UserUsernameExistException();
        }

        const workspaceContext = await this.resolveWorkspaceContext(
            username,
            email,
            workspaceInviteToken
        );

        try {
            const userId = this.databaseUtil.createId();
            const password = this.authPasswordService.createPassword(
                userId,
                passwordString
            );
            const emailVerification =
                this.userVerificationService.verificationCreateVerification(
                    userId,
                    EnumVerificationType.email
                ) as IUserVerificationEmailCreate;

            let created: IUser;
            try {
                created =
                    await this.userOnboardingRepository.createWithWorkspace({
                        userId,
                        email,
                        name,
                        username,
                        countryId,
                        roleId: role.id,
                        signUpFrom: from,
                        signUpWith: EnumUserSignUpWith.credential,
                        isVerified: false,
                        termPolicy: {
                            [EnumTermPolicyType.cookies]: cookies,
                            [EnumTermPolicyType.marketing]: marketing,
                            [EnumTermPolicyType.privacy]: true,
                            [EnumTermPolicyType.termsOfService]: true,
                        },
                        acceptedTermPolicyTypes: [
                            EnumTermPolicyType.termsOfService,
                            EnumTermPolicyType.privacy,
                            ...(cookies ? [EnumTermPolicyType.cookies] : []),
                            ...(marketing
                                ? [EnumTermPolicyType.marketing]
                                : []),
                        ],
                        password,
                        passwordHistoryType:
                            UserCreateModeRules[EnumUserCreateMode.signUp]
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
                        activityLogs:
                            this.userOnboardingService.buildOnboardingActivityLogs(
                                EnumUserCreateMode.signUp,
                                workspaceContext,
                                requestLog,
                                userId
                            ),
                        workspaceContext,
                        workspaceRows:
                            this.userOnboardingService.buildWorkspaceRows(
                                userId,
                                workspaceContext,
                                userId
                            ),
                        createdBy: userId,
                    });
            } catch (error: unknown) {
                throw this.userOnboardingUtil.mapCreateCollision(error);
            }

            await this.notificationQueue.sendWelcome(created.id, {
                expiredAt: this.helperDateService.formatToIso(
                    emailVerification.expiredAt
                ),
                reference: emailVerification.reference,
                link: emailVerification.encryptedLink,
                expiredInMinutes: emailVerification.expiredInMinutes,
            });

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async logout(
        userId: string,
        sessionId: string,
        deviceOwnershipId: string
    ): Promise<void> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        await this.userLoginService.revokeSession(userId, sessionId);

        try {
            await this.userSessionRepository.logout(
                userId,
                sessionId,
                deviceOwnershipId,
                requestLog
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
