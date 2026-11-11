import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import type { IActivityLogStageInput } from '@modules/activity-log/interfaces/activity-log.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import type {
    IUser,
    IUserCredentialAttempt,
    IUserForgotPassword,
    IUserForgotPasswordCreate,
    IUserForgotPasswordPrepared,
    IUserPasswordSet,
    IUserPasswordTemporary,
} from '@modules/user/interfaces/user.interface';
import { UserPasswordRepository } from '@modules/user/repositories/user.password.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserService } from '@modules/user/services/user.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { Duration } from 'luxon';

@Injectable()
export class UserPasswordService {
    private readonly passwordAttemptEnabled: boolean;
    private readonly passwordMaxAttempt: number;
    private readonly homeUrl: string;
    private readonly forgotPasswordReferencePrefix: string;
    private readonly forgotPasswordReferenceLength: number;
    private readonly forgotExpiredInMinutes: number;
    private readonly forgotTokenLength: number;
    private readonly forgotResendInMinutes: number;
    private readonly forgotLinkPattern: string;

    constructor(
        private readonly userPasswordRepository: UserPasswordRepository,
        private readonly userRepository: UserRepository,
        private readonly userUtil: UserUtil,
        private readonly helperHashService: HelperHashService,
        private readonly helperStringService: HelperStringService,
        private readonly helperDateService: HelperDateService,
        private readonly userService: UserService,
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly featureFlagService: FeatureFlagService,
        private readonly configService: ConfigService
    ) {
        this.passwordAttemptEnabled = this.configService.get<boolean>(
            'auth.password.attempt'
        )!;
        this.passwordMaxAttempt = this.configService.get<number>(
            'auth.password.maxAttempt'
        )!;
        this.homeUrl = this.configService.get<string>('home.url')!;

        this.forgotPasswordReferencePrefix = this.configService.get<string>(
            'forgotPassword.reference.prefix'
        )!;
        this.forgotPasswordReferenceLength = this.configService.get<number>(
            'forgotPassword.reference.length'
        )!;
        this.forgotExpiredInMinutes = this.configService.get<number>(
            'forgotPassword.expiredInMinutes'
        )!;
        this.forgotTokenLength = this.configService.get<number>(
            'forgotPassword.tokenLength'
        )!;
        this.forgotResendInMinutes = this.configService.get<number>(
            'forgotPassword.resendInMinutes'
        )!;
        this.forgotLinkPattern = this.configService.get<string>(
            'forgotPassword.linkPattern'
        )!;
    }

    private hasPassword(user: IUser): user is IUserPasswordSet {
        return user.password !== null;
    }

    private buildPasswordLockoutStages(
        userId: string
    ): IActivityLogStageInput<EnumActivityLogAction>[] {
        return [
            {
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId,
                createdBy: userId,
            },
            {
                action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                userId,
                createdBy: userId,
            },
        ];
    }

    private createReference(): string {
        const random = this.helperStringService.random(
            this.forgotPasswordReferenceLength
        );

        return `${this.forgotPasswordReferencePrefix}-${random}`;
    }

    private createToken(): string {
        return this.helperStringService.random(this.forgotTokenLength);
    }

    private createExpiredAt(): Date {
        const now = this.helperDateService.create();

        return this.helperDateService.forward(
            now,
            Duration.fromObject({ minutes: this.forgotExpiredInMinutes })
        );
    }

    private createForgot(): IUserForgotPasswordCreate {
        const token = this.createToken();
        const hashedToken = this.helperHashService.sha256Hash(token);
        const link = this.helperStringService.fillPattern(
            this.forgotLinkPattern,
            { homeUrl: this.homeUrl, token }
        );
        const reference = this.createReference();
        const expiredAt = this.createExpiredAt();

        return {
            reference,
            expiredAt,
            token,
            hashedToken,
            expiredInMinutes: this.forgotExpiredInMinutes,
            resendInMinutes: this.forgotResendInMinutes,
            link,
        };
    }

    private async incrementPasswordAttempt(userId: string): Promise<boolean> {
        if (!this.passwordAttemptEnabled) {
            return true;
        }

        try {
            return await this.outboxService.withTransaction(async tx => {
                const isCounted =
                    await this.userRepository.incrementPasswordAttemptInTx(
                        tx,
                        userId,
                        this.passwordMaxAttempt
                    );
                if (!isCounted) {
                    const effect =
                        this.userTwoFactorService.lockoutEffect(userId);
                    await this.outboxService.addInTx(tx, effect);
                }

                return isCounted;
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new UserPasswordAttemptMaxException();
            }

            throw new AppUnknownException(err);
        }
    }

    async resetPasswordAttempt(userId: string): Promise<User> {
        return this.userService.resetPasswordAttempt(userId);
    }

    async createTemporaryPassword(): Promise<IUserPasswordTemporary> {
        const passwordString = this.authPasswordUtil.createPasswordRandom();
        const password = await this.authPasswordUtil.createPassword(
            passwordString,
            { temporary: true }
        );

        return { password, passwordString };
    }

    /** Counts one password attempt for a user holding a password and, when the budget is spent, adds the lockout row in the count's transaction; null for a passwordless user, isAttemptCounted false with the lockout activity stages on a spent budget, lockoutStages empty otherwise; a write conflict throws UserPasswordAttemptMaxException. */
    async countPasswordAttempt(
        user: IUser
    ): Promise<IUserCredentialAttempt | null> {
        const hasPassword = this.hasPassword(user);
        if (!hasPassword) {
            return null;
        }

        const isAttemptCounted = await this.incrementPasswordAttempt(user.id);
        if (!isAttemptCounted) {
            const lockoutStages = this.buildPasswordLockoutStages(user.id);

            return {
                user,
                hashedPassword: user.password,
                isAttemptCounted,
                lockoutStages,
            };
        }

        return {
            user,
            hashedPassword: user.password,
            isAttemptCounted,
            lockoutStages: [],
        };
    }

    assertAttemptCounted(isAttemptCounted: boolean): void {
        if (!isAttemptCounted) {
            throw new UserPasswordAttemptMaxException();
        }
    }

    /** Gates on `changePassword.forgotAllowed`, then resolves the active user of an email with a reset payload; null when no active user holds the email or the last request is inside the resend window. */
    async prepareForgotPassword(
        email: string
    ): Promise<IUserForgotPasswordPrepared | null> {
        // Sequential by design: gate before the work it guards
        await this.featureFlagService.validateFeatureFlagMetadata(
            EnumFeatureFlagKey.changePassword,
            EnumFeatureFlagMetadataKey.forgotAllowed
        );

        const user = await this.userRepository.findOneActiveByEmail(email);
        if (!user) {
            return null;
        }

        const lastForgotPassword =
            await this.userPasswordRepository.findOneLatestByForgotPassword(
                user.id
            );
        if (lastForgotPassword) {
            const isInsideResendWindow = this.userUtil.isInsideResendWindow(
                lastForgotPassword.createdAt,
                this.forgotResendInMinutes
            );
            if (isInsideResendWindow) {
                return null;
            }
        }

        const forgot = this.createForgot();

        return { user, forgot };
    }

    async createForgotPassword(
        userId: string,
        email: string,
        forgot: IUserForgotPasswordCreate
    ): Promise<void> {
        await this.userPasswordRepository.createReplacingUnused(
            userId,
            email,
            forgot
        );
    }

    /** Gates on `changePassword.forgotAllowed`, then reads the active reset of a token. */
    async getOneActiveReset(token: string): Promise<IUserForgotPassword> {
        // Sequential by design: gate before the work it guards
        await this.featureFlagService.validateFeatureFlagMetadata(
            EnumFeatureFlagKey.changePassword,
            EnumFeatureFlagMetadataKey.forgotAllowed
        );

        const hashedToken = this.helperHashService.sha256Hash(token);
        const reset =
            await this.userPasswordRepository.findOneActiveByForgotPasswordToken(
                hashedToken
            );
        if (!reset) {
            throw new UserTokenInvalidException();
        }

        return reset;
    }

    async markResetUsedInTx(
        tx: IDatabaseTransactionClient,
        forgotPasswordId: string,
        usedAt: Date
    ): Promise<void> {
        const isMarkedUsed = await this.userPasswordRepository.markUsedInTx(
            tx,
            forgotPasswordId,
            usedAt
        );
        if (!isMarkedUsed) {
            throw new UserTokenInvalidException();
        }
    }

    async markUnusedResetsUsedInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await this.userPasswordRepository.markUnusedUsedByUserInTx(tx, userId);
    }
}
