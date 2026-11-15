import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { MessageService } from '@common/message/services/message.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import {
    EnumNotificationKind,
    EnumNotificationLoginLockedMethod,
} from '@modules/notification/enums/notification.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import type {
    IUser,
    IUserCredential,
    IUserForgotPassword,
    IUserForgotPasswordCreate,
    IUserForgotPasswordPrepared,
    IUserPasswordSet,
    IUserPasswordTemporary,
} from '@modules/user/interfaces/user.interface';
import { UserPasswordRepository } from '@modules/user/repositories/user.password.repository';
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
    private readonly passwordMaxAttempt: number;
    private readonly passwordLockDurationInMs: number;
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
        private readonly outboxService: OutboxService,
        private readonly notificationService: NotificationService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly featureFlagService: FeatureFlagService,
        private readonly activityLogService: ActivityLogService,
        private readonly messageService: MessageService,
        private readonly configService: ConfigService
    ) {
        this.passwordMaxAttempt = this.configService.get<number>(
            'auth.password.maxAttempt'
        )!;
        this.passwordLockDurationInMs = this.configService.get<number>(
            'auth.password.lockDurationInMs'
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

    async createTemporaryPassword(): Promise<IUserPasswordTemporary> {
        const passwordString = this.authPasswordUtil.createPasswordRandom();
        const password = await this.authPasswordUtil.createPassword(
            passwordString,
            { temporary: true }
        );

        return { password, passwordString };
    }

    /** Throws UserPasswordAttemptMaxException while the lock of the user ends later than now. */
    assertPasswordAttemptAvailable({ passwordLockedUntil }: IUser): void {
        const now = this.helperDateService.create();
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

    /** Counts one failed password attempt in its own transaction; true when it reached the budget, which locks sign-in for the lock duration and adds the reach-max entry and the loginLocked effect in that transaction; a write conflict throws UserPasswordAttemptMaxException. */
    async countFailedPasswordAttempt(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        { id: userId }: IUser
    ): Promise<boolean> {
        const now = this.helperDateService.create();
        const lockedUntil = this.helperDateService.forward(
            now,
            Duration.fromObject({ milliseconds: this.passwordLockDurationInMs })
        );
        const lockedUntilIso = this.helperDateService.formatToIso(lockedUntil);

        try {
            return await this.outboxService.withTransaction(async tx => {
                const isLocked =
                    await this.userRepository.incrementPasswordAttemptInTx(
                        tx,
                        userId,
                        this.passwordMaxAttempt,
                        lockedUntil
                    );
                if (isLocked) {
                    const entry = this.activityLogService.recordEffect(
                        requestContext,
                        apiKeyContext,
                        null,
                        null,
                        {
                            action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                            userId,
                            createdBy: userId,
                        }
                    );
                    const methodLabel = this.messageService.setMessage(
                        'notification.loginLockedMethod.password'
                    );
                    const effect = this.notificationService.notify(
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

    /** Replaces the user's unused requests with the new one and adds the forgotPassword effect and the activity entry in the same transaction, dispatched after the commit. */
    async createForgotPassword(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        userId: string,
        email: string,
        forgot: IUserForgotPasswordCreate
    ): Promise<void> {
        const expiredAt = this.helperDateService.formatToIso(forgot.expiredAt);

        await this.outboxService.withTransaction(async tx => {
            await this.userPasswordRepository.createReplacingUnusedInTx(
                tx,
                userId,
                email,
                forgot
            );
            const effect = this.notificationService.notify(
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
            const entry = this.activityLogService.recordEffect(
                requestContext,
                apiKeyContext,
                null,
                null,
                {
                    action: EnumActivityLogAction.userForgotPassword,
                    userId,
                    createdBy: userId,
                }
            );
            await this.outboxService.addManyInTx(tx, [entry, effect]);
        });
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
