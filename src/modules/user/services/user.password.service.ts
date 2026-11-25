import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { MessageService } from '@common/message/services/message.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { ForgotPassword, User } from '@generated/prisma-client/client';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import {
    EnumNotificationKind,
    EnumNotificationLoginLockedMethod,
} from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import type {
    IUser,
    IUserCredential,
    IUserForgotPassword,
    IUserForgotPasswordCreate,
    IUserForgotPasswordPrepared,
    IUserPasswordAttemptLimit,
    IUserPasswordSet,
    IUserPasswordTemporary,
} from '@modules/user/interfaces/user.interface';
import { UserForgotPasswordRepository } from '@modules/user/repositories/user.forgot-password.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserService } from '@modules/user/services/user.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { Duration } from 'luxon';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

@Injectable()
export class UserPasswordService {
    private readonly baseUrl: string;
    private readonly forgotPasswordReferencePrefix: string;
    private readonly forgotPasswordReferenceLength: number;
    private readonly expiresInMinutes: number;
    private readonly tokenLength: number;
    private readonly resendInMinutes: number;
    private readonly linkPattern: string;
    private readonly retentionInMs: number;

    constructor(
        private readonly userForgotPasswordRepository: UserForgotPasswordRepository,
        private readonly userRepository: UserRepository,
        private readonly userUtil: UserUtil,
        private readonly helperHashService: HelperHashService,
        private readonly helperStringService: HelperStringService,
        private readonly helperDateService: HelperDateService,
        private readonly userService: UserService,
        private readonly outboxService: OutboxService,
        private readonly notificationQueue: NotificationQueue,
        private readonly authPasswordService: AuthPasswordService,
        private readonly featureFlagService: FeatureFlagService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly messageService: MessageService,
        private readonly configService: ConfigService
    ) {
        this.baseUrl = this.configService.get<string>('frontend.baseUrl')!;

        this.forgotPasswordReferencePrefix = this.configService.get<string>(
            'forgotPassword.reference.prefix'
        )!;
        this.forgotPasswordReferenceLength = this.configService.get<number>(
            'forgotPassword.reference.length'
        )!;
        this.expiresInMinutes = this.configService.get<number>(
            'forgotPassword.expiresInMinutes'
        )!;
        this.tokenLength = this.configService.get<number>(
            'forgotPassword.tokenLength'
        )!;
        this.resendInMinutes = this.configService.get<number>(
            'forgotPassword.resendInMinutes'
        )!;
        this.linkPattern = this.configService.get<string>(
            'forgotPassword.linkPattern'
        )!;
        this.retentionInMs = this.configService.get<number>(
            'forgotPassword.retentionInMs'
        )!;
    }

    private hasPassword(user: IUser): user is IUserPasswordSet {
        return user.password !== null;
    }

    private async markUnusedResetsUsedInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        updatedBy: string
    ): Promise<void> {
        await this.userForgotPasswordRepository.markUnusedUsedByUserInTx(
            tx,
            userId,
            updatedBy
        );
    }

    private createReference(): string {
        const random = this.helperStringService.random(
            this.forgotPasswordReferenceLength
        );

        return `${this.forgotPasswordReferencePrefix}-${random}`;
    }

    private createToken(): string {
        return this.helperStringService.random(this.tokenLength);
    }

    private createExpiredAt(): Date {
        const now = this.helperDateService.now();

        return this.helperDateService.forward(
            now,
            Duration.fromObject({ minutes: this.expiresInMinutes })
        );
    }

    private createForgot(): IUserForgotPasswordCreate {
        const token = this.createToken();
        const hashedToken = this.helperHashService.sha256Hash(token);
        const link = this.helperStringService.fillPattern(this.linkPattern, {
            frontendBaseUrl: this.baseUrl,
            token,
        });
        const reference = this.createReference();
        const expiredAt = this.createExpiredAt();

        return {
            reference,
            expiredAt,
            token,
            hashedToken,
            expiredInMinutes: this.expiresInMinutes,
            resendInMinutes: this.resendInMinutes,
            link,
        };
    }

    async createTemporaryPassword(): Promise<IUserPasswordTemporary> {
        const passwordString = this.authPasswordService.createRandom();
        const password = await this.authPasswordService.create(passwordString, {
            temporary: true,
        });

        return { password, passwordString };
    }

    /** Throws UserPasswordAttemptMaxException while the lock of the user ends later than now. */
    assertPasswordAttemptAvailable({ passwordLockedUntil }: IUser): void {
        const now = this.helperDateService.now();
        if (passwordLockedUntil !== null && passwordLockedUntil > now) {
            throw new UserPasswordAttemptMaxException();
        }
    }

    /** Throws UserPasswordAttemptMaxException when the counted failure locked sign-in. */
    assertPasswordNotLocked(isLocked: boolean): void {
        if (isLocked) {
            throw new UserPasswordAttemptMaxException();
        }
    }

    /** Returns the user with its password hash; null for a passwordless user. */
    getCredential(user: IUser): IUserCredential | null {
        const hasPassword = this.hasPassword(user);
        if (!hasPassword) {
            return null;
        }

        return { user, hashedPassword: user.password };
    }

    async resetPasswordAttemptInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await this.userService.resetPasswordAttemptInTx(tx, userId);
    }

    /** Reads the password attempt budget and the lock duration from the loginWithCredential flag and answers the budget with the instant a lock reached now would end. */
    async getPasswordAttemptLimit(): Promise<IUserPasswordAttemptLimit> {
        const [maxAttempts, lockDurationInMinutes] = await Promise.all([
            this.featureFlagService.getMetadataNumber(
                EnumFeatureFlagKey.loginWithCredential,
                EnumFeatureFlagMetadataKey.passwordMaxAttempts
            ),
            this.featureFlagService.getMetadataNumber(
                EnumFeatureFlagKey.loginWithCredential,
                EnumFeatureFlagMetadataKey.passwordLockDurationInMinutes
            ),
        ]);
        const now = this.helperDateService.now();
        const lockedUntil = this.helperDateService.forward(
            now,
            Duration.fromObject({ minutes: lockDurationInMinutes })
        );

        return { maxAttempts, lockedUntil };
    }

    /** Counts one failed password attempt on the caller's transaction; true when it reached the budget, which locks sign-in until the limit's end and adds the reach-max entry and the loginLocked effect on that transaction. */
    async countFailedPasswordAttemptInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        userId: string,
        { maxAttempts, lockedUntil }: IUserPasswordAttemptLimit
    ): Promise<boolean> {
        const isLocked = await this.userRepository.incrementPasswordAttemptInTx(
            tx,
            userId,
            maxAttempts,
            lockedUntil
        );
        if (isLocked) {
            const entry = this.activityLogQueue.recordEffect(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userMaxPasswordAttemptReached,
                    userId,
                    createdBy: userId,
                }
            );
            const methodLabel = this.messageService.setMessage(
                'notification.loginLockedMethod.password'
            );
            const lockedUntilIso =
                this.helperDateService.formatToIso(lockedUntil);
            const effect = this.notificationQueue.notify(
                EnumNotificationKind.loginLocked,
                {
                    userId,
                    proceedBy: userId,
                    method: EnumNotificationLoginLockedMethod.password,
                    methodLabel,
                    lockedUntil: lockedUntilIso,
                }
            );
            await this.outboxService.addManyInTx(tx, [entry, effect]);
        }

        return isLocked;
    }

    /** Gates on `changePassword.forgotAllowed` and resolves the active user of an email with a reset payload; null when no active user holds the email or the last request is inside the resend window. */
    async prepareForgotPassword(
        email: string
    ): Promise<IUserForgotPasswordPrepared | null> {
        const [user] = await Promise.all([
            this.userRepository.findOneActiveByEmail(email),
            this.featureFlagService.validateFeatureFlagMetadata(
                EnumFeatureFlagKey.changePassword,
                EnumFeatureFlagMetadataKey.forgotAllowed
            ),
        ]);
        if (!user) {
            return null;
        }

        const lastForgotPassword =
            await this.userForgotPasswordRepository.findOneLatestByForgotPassword(
                user.id
            );
        if (lastForgotPassword) {
            const isInsideResendWindow = this.userUtil.isInsideResendWindow(
                lastForgotPassword.createdAt,
                this.resendInMinutes
            );
            if (isInsideResendWindow) {
                return null;
            }
        }

        const forgot = this.createForgot();

        return { user, forgot };
    }

    /** Replaces the user's unused requests with the new one and adds the forgotPassword effect and the activity entry on the caller's transaction. */
    async createForgotPasswordInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        userId: string,
        email: string,
        forgot: IUserForgotPasswordCreate
    ): Promise<void> {
        const expiredAt = this.helperDateService.formatToIso(forgot.expiredAt);

        await this.userForgotPasswordRepository.createReplacingUnusedInTx(
            tx,
            userId,
            email,
            forgot
        );
        const effect = this.notificationQueue.notify(
            EnumNotificationKind.forgotPassword,
            {
                userId,
                proceedBy: userId,
                link: forgot.link,
                reference: forgot.reference,
                expiredAt,
                expiredInMinutes: forgot.expiredInMinutes,
            }
        );
        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            null,
            null,
            {
                action: EnumActivityLogAction.userPasswordResetRequested,
                userId,
                createdBy: userId,
            }
        );
        await this.outboxService.addManyInTx(tx, [entry, effect]);
    }

    /** Gates on `changePassword.forgotAllowed` and reads the active reset of a token. */
    async getOneActiveReset(token: string): Promise<IUserForgotPassword> {
        const hashedToken = this.helperHashService.sha256Hash(token);
        const [reset] = await Promise.all([
            this.userForgotPasswordRepository.findOneActiveByForgotPasswordToken(
                hashedToken
            ),
            this.featureFlagService.validateFeatureFlagMetadata(
                EnumFeatureFlagKey.changePassword,
                EnumFeatureFlagMetadataKey.forgotAllowed
            ),
        ]);
        if (!reset) {
            throw new UserTokenInvalidException();
        }

        return reset;
    }

    /** Marks the reset used and returns its row; a reset used first rejects with UserTokenInvalidException. */
    async markResetUsedInTx(
        tx: IDatabaseTransactionClient,
        forgotPasswordId: string,
        usedAt: Date,
        userId: string
    ): Promise<ForgotPassword> {
        return this.userForgotPasswordRepository.markUsedInTx(
            tx,
            forgotPasswordId,
            usedAt,
            userId
        );
    }

    /** Writes the new password and marks the user's unused reset rows used; returns the updated user row. */
    async replaceInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        password: IAuthPassword,
        updatedBy: string
    ): Promise<User> {
        const [updated] = await Promise.all([
            this.userService.updatePasswordInTx(
                tx,
                userId,
                password,
                updatedBy
            ),
            this.markUnusedResetsUsedInTx(tx, userId, updatedBy),
        ]);

        return updated;
    }

    /** Deletes the reset rows that expired longer ago than forgotPassword.retentionInMs; returns the count. */
    async purgeExpired(): Promise<number> {
        const now = this.helperDateService.now();
        const retention = this.helperDateService.createDuration({
            milliseconds: this.retentionInMs,
        });
        const threshold = this.helperDateService.backward(now, retention);

        return this.userForgotPasswordRepository.deleteExpiredBefore(threshold);
    }
}
