import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumUserStatus, TwoFactor } from '@generated/prisma-client';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { AuthTwoFactorAlreadyEnabledException } from '@modules/auth/exceptions/auth.two-factor-already-enabled.exception';
import { AuthTwoFactorChallengeInvalidException } from '@modules/auth/exceptions/auth.two-factor-challenge-invalid.exception';
import { AuthTwoFactorNotEnabledException } from '@modules/auth/exceptions/auth.two-factor-not-enabled.exception';
import { AuthTwoFactorNotRequiredSetupException } from '@modules/auth/exceptions/auth.two-factor-not-required-setup.exception';
import { AuthTwoFactorRequiredSetupException } from '@modules/auth/exceptions/auth.two-factor-required-setup.exception';
import { AuthTwoFactorSetupRequiredException } from '@modules/auth/exceptions/auth.two-factor-setup-required.exception';
import {
    IAuthToken,
    IAuthTwoFactorVerify,
} from '@modules/auth/interfaces/auth.interface';
import { AuthTwoFactorUtil } from '@modules/auth/utils/auth.two-factor.util';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { UserBlockedInvalidException } from '@modules/user/exceptions/user.blocked-invalid.exception';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import { UserInactiveForbiddenException } from '@modules/user/exceptions/user.inactive-forbidden.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserNotSelfException } from '@modules/user/exceptions/user.not-self.exception';
import {
    IUser,
    IUserTwoFactorSetup,
} from '@modules/user/interfaces/user.interface';
import { IUserTwoFactorService } from '@modules/user/interfaces/user.two-factor.service.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserTwoFactorRepository } from '@modules/user/repositories/user.two-factor.repository';
import { UserLoginService } from '@modules/user/services/user.login.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserTwoFactorService implements IUserTwoFactorService {
    constructor(
        private readonly userTwoFactorRepository: UserTwoFactorRepository,
        private readonly userRepository: UserRepository,
        private readonly userLoginService: UserLoginService,
        private readonly authTwoFactorUtil: AuthTwoFactorUtil,
        private readonly notificationUtil: NotificationUtil,
        private readonly helperDateService: HelperDateService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async loginVerifyTwoFactor(
        challengeToken: string,
        { code, backupCode, method }: IAuthTwoFactorVerify
    ): Promise<IAuthToken> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const challenge =
            await this.authTwoFactorUtil.getChallenge(challengeToken);
        if (!challenge) {
            throw new AuthTwoFactorChallengeInvalidException();
        }

        const user = await this.userRepository.findOneWithRoleById(
            challenge.userId
        );
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.status !== EnumUserStatus.active) {
            throw new UserInactiveForbiddenException();
        } else if (!user.isVerified) {
            throw new UserEmailNotVerifiedException();
        } else if (!user.twoFactor?.enabled) {
            throw new AuthTwoFactorNotEnabledException();
        } else if (user.twoFactor?.requiredSetup) {
            throw new AuthTwoFactorRequiredSetupException();
        }

        const twoFactorVerified =
            await this.userLoginService.handleTwoFactorValidation(user, {
                method,
                code,
                backupCode,
            });

        try {
            const loginAt = this.helperDateService.create();
            const [tokens] = await Promise.all([
                this.userLoginService.createTokenAndSession(
                    user,
                    challenge.device,
                    challenge.loginFrom,
                    challenge.loginWith,
                    loginAt
                ),
                this.authTwoFactorUtil.clearChallenge(challengeToken),
                this.userTwoFactorRepository.verifyTwoFactor(
                    user.id,
                    twoFactorVerified,
                    requestLog
                ),
            ]);

            return tokens;
        } catch (err: unknown) {
            throw new AppUnknownException(err);
        }
    }

    async loginSetupTwoFactor(
        challengeToken: string,
        code: string
    ): Promise<string[]> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const challenge =
            await this.authTwoFactorUtil.getChallenge(challengeToken);
        if (!challenge) {
            throw new AuthTwoFactorChallengeInvalidException();
        }

        const user = await this.userRepository.findOneWithRoleById(
            challenge.userId
        );
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.status !== EnumUserStatus.active) {
            throw new UserInactiveForbiddenException();
        } else if (!user.isVerified) {
            throw new UserEmailNotVerifiedException();
        } else if (!user.twoFactor?.enabled) {
            throw new AuthTwoFactorNotEnabledException();
        } else if (!user.twoFactor?.requiredSetup) {
            throw new AuthTwoFactorNotRequiredSetupException();
        }

        await this.userLoginService.handleTwoFactorValidation(user, {
            method: EnumAuthTwoFactorMethod.code,
            code,
        });

        try {
            const backupCodes = this.authTwoFactorUtil.generateBackupCodes();
            await this.userTwoFactorRepository.enableTwoFactor(
                user.id,
                backupCodes.hashes,
                requestLog
            );

            return backupCodes.codes;
        } catch (err: unknown) {
            throw new AppUnknownException(err);
        }
    }

    getTwoFactorStatus(user: IUser): TwoFactor {
        return user.twoFactor!;
    }

    async setupTwoFactor(user: IUser): Promise<IUserTwoFactorSetup> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        if (user.twoFactor?.enabled) {
            throw new AuthTwoFactorAlreadyEnabledException();
        }

        try {
            const { encryptedSecret, otpauthUrl, secret, iv } =
                await this.authTwoFactorUtil.setupTwoFactor(user.email);
            await this.userTwoFactorRepository.setupTwoFactor(
                user.id,
                encryptedSecret,
                iv,
                requestLog
            );

            return {
                secret,
                otpauthUrl,
            };
        } catch (err: unknown) {
            throw new AppUnknownException(err);
        }
    }

    async enableTwoFactor(user: IUser, code: string): Promise<string[]> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        if (user.twoFactor?.enabled) {
            throw new AuthTwoFactorAlreadyEnabledException();
        } else if (!user.twoFactor?.iv || !user.twoFactor?.secret) {
            throw new AuthTwoFactorSetupRequiredException();
        }

        await this.userLoginService.handleTwoFactorValidation(user, {
            method: EnumAuthTwoFactorMethod.code,
            code,
        });

        try {
            const backupCodes = this.authTwoFactorUtil.generateBackupCodes();
            await this.userTwoFactorRepository.enableTwoFactor(
                user.id,
                backupCodes.hashes,
                requestLog
            );

            return backupCodes.codes;
        } catch (err: unknown) {
            throw new AppUnknownException(err);
        }
    }

    async disableTwoFactor(
        user: IUser,
        { code, backupCode, method }: IAuthTwoFactorVerify
    ): Promise<void> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        if (!user.twoFactor?.enabled) {
            throw new AuthTwoFactorNotEnabledException();
        }

        await this.userLoginService.handleTwoFactorValidation(user, {
            method,
            code,
            backupCode,
        });

        try {
            await this.userLoginService.revokeAllSessions(user.id);
            await this.userTwoFactorRepository.disableTwoFactor(
                user.id,
                requestLog
            );

            return;
        } catch (err: unknown) {
            throw new AppUnknownException(err);
        }
    }

    async regenerateTwoFactorBackupCodes(
        user: IUser,
        code: string
    ): Promise<string[]> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        if (!user.twoFactor?.enabled) {
            throw new AuthTwoFactorNotEnabledException();
        }

        await this.userLoginService.handleTwoFactorValidation(user, {
            method: EnumAuthTwoFactorMethod.code,
            code,
        });

        try {
            const backupCodes = this.authTwoFactorUtil.generateBackupCodes();
            await this.userTwoFactorRepository.regenerateTwoFactorBackupCodes(
                user.id,
                backupCodes.hashes,
                requestLog
            );

            return backupCodes.codes;
        } catch (err: unknown) {
            throw new AppUnknownException(err);
        }
    }

    async resetTwoFactorByAdmin(
        userId: string,
        updatedBy: string
    ): Promise<void> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        if (userId === updatedBy) {
            throw new UserNotSelfException();
        }

        const user = await this.userRepository.findOneWithRoleById(userId);
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.status === EnumUserStatus.blocked) {
            throw new UserBlockedInvalidException();
        } else if (!user.twoFactor?.enabled) {
            throw new AuthTwoFactorNotEnabledException();
        }

        try {
            await this.userLoginService.revokeAllSessions(userId);
            await Promise.all([
                this.userTwoFactorRepository.resetTwoFactorByAdmin(
                    userId,
                    updatedBy,
                    requestLog
                ),
                this.authTwoFactorUtil.clearLockTwoFactorAttempt(user),
            ]);

            await this.notificationUtil.sendResetTwoFactorByAdmin(
                user.id,
                updatedBy
            );

            return;
        } catch (err: unknown) {
            throw new AppUnknownException(err);
        }
    }
}
