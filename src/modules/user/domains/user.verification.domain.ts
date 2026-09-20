import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    EnumActivityLogAction,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { Verification } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserEmailAlreadyVerifiedException } from '@modules/user/exceptions/user.email-already-verified.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import { UserVerificationEmailResendLimitExceededException } from '@modules/user/exceptions/user.verification-email-resend-limit-exceeded.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IUserOnboardingVerification,
    IUserVerificationCreate,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';
import ms from 'ms';

@Injectable()
export class UserVerificationDomain {
    private readonly homeUrl: string;

    private readonly verificationReferencePrefix: string;
    private readonly verificationReferenceLength: number;
    private readonly verificationOtpLength: number;
    private readonly verificationExpiredInMinutes: number;
    private readonly verificationTokenLength: number;
    private readonly verificationResendInMinutes: number;
    private readonly verificationLinkPattern: string;

    constructor(
        private readonly userVerificationRepository: UserVerificationRepository,
        private readonly userRepository: UserRepository,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseService: DatabaseService,
        private readonly helperHashService: HelperHashService,
        private readonly notificationQueue: NotificationQueue,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly helperNumberService: HelperNumberService
    ) {
        this.homeUrl = this.configService.get<string>('home.url')!;

        this.verificationReferencePrefix = this.configService.get<string>(
            'verification.reference.prefix'
        )!;
        this.verificationReferenceLength = this.configService.get<number>(
            'verification.reference.length'
        )!;
        this.verificationOtpLength = this.configService.get<number>(
            'verification.otpLength'
        )!;
        const verificationExpiredInMs = this.configService.get<number>(
            'verification.expiredInMs'
        )!;
        this.verificationExpiredInMinutes = verificationExpiredInMs / ms('1m');
        this.verificationTokenLength = this.configService.get<number>(
            'verification.tokenLength'
        )!;
        const verificationResendInMs = this.configService.get<number>(
            'verification.resendInMs'
        )!;
        this.verificationResendInMinutes = verificationResendInMs / ms('1m');
        this.verificationLinkPattern = this.configService.get<string>(
            'verification.linkPattern'
        )!;
    }

    verificationCreateReference(): string {
        const random = this.helperStringService.random(
            this.verificationReferenceLength
        );

        return `${this.verificationReferencePrefix}-${random}`;
    }

    verificationCreateOtp(): string {
        return this.helperNumberService.randomDigits(
            this.verificationOtpLength
        );
    }

    verificationCreateToken(): string {
        return this.helperStringService.random(this.verificationTokenLength);
    }

    verificationSetExpiredDate(): Date {
        const now = this.helperDateService.create();

        return this.helperDateService.forward(
            now,
            Duration.fromObject({ minutes: this.verificationExpiredInMinutes })
        );
    }

    /** Builds an OTP verification for mobile numbers or a tokenized link verification for email. */
    verificationCreateVerification(
        type: EnumVerificationType
    ): IUserVerificationCreate {
        if (type === EnumVerificationType.mobileNumber) {
            const token = this.verificationCreateOtp();
            const hashedToken = this.helperHashService.sha256Hash(token);
            const reference = this.verificationCreateReference();
            const expiredAt = this.verificationSetExpiredDate();

            return {
                reference,
                expiredAt,
                type: EnumVerificationType.mobileNumber,
                token,
                hashedToken,
                expiredInMinutes: this.verificationExpiredInMinutes,
                resendInMinutes: this.verificationResendInMinutes,
            };
        }

        const token = this.verificationCreateToken();
        const hashedToken = this.helperHashService.sha256Hash(token);
        const link = this.helperStringService.fillPattern(
            this.verificationLinkPattern,
            { homeUrl: this.homeUrl, token }
        );

        const reference = this.verificationCreateReference();
        const expiredAt = this.verificationSetExpiredDate();

        return {
            reference,
            expiredAt,
            type: EnumVerificationType.email,
            token,
            hashedToken,
            expiredInMinutes: this.verificationExpiredInMinutes,
            link,
            resendInMinutes: this.verificationResendInMinutes,
        };
    }

    async verifyEmail(token: string): Promise<void> {
        const hashedToken = this.helperHashService.sha256Hash(token);
        const verification =
            await this.userVerificationRepository.findOneActiveByVerificationEmailToken(
                hashedToken
            );
        if (!verification) {
            throw new UserTokenInvalidException();
        }

        try {
            const events = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userVerifiedEmail,
                    userId: verification.userId,
                    createdBy: verification.userId,
                }),
            ];
            const verifiedAt = this.helperDateService.create();
            await this.databaseService.withTransaction(async tx => {
                await this.userVerificationRepository.markUsedInTx(
                    tx,
                    verification.id,
                    verifiedAt
                );
                await this.userRepository.markVerifiedInTx(
                    tx,
                    verification.userId,
                    verifiedAt
                );
            });

            this.activityLogDomain.stagePrepared(events);

            await this.notificationQueue.sendVerifiedEmail(
                verification.userId,
                {
                    reference: verification.reference,
                }
            );

            return;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async sendVerificationEmail(email: string): Promise<void> {
        const user = await this.userRepository.findOneActiveByEmail(email);
        if (!user) {
            throw new UserNotFoundException();
        } else if (user.isVerified) {
            throw new UserEmailAlreadyVerifiedException();
        }

        const lastVerification =
            await this.userVerificationRepository.findOneLatestByVerificationEmail(
                user.id
            );
        if (lastVerification) {
            const today = this.helperDateService.create();
            const canResendAt = this.helperDateService.forward(
                lastVerification.createdAt,
                Duration.fromObject({
                    minutes: this.verificationExpiredInMinutes,
                })
            );

            if (today < canResendAt) {
                const resendDuration = this.helperDateService.diff(
                    today,
                    canResendAt
                );

                throw new UserVerificationEmailResendLimitExceededException(
                    resendDuration.minutes
                );
            }
        }

        try {
            const emailVerification = this.verificationCreateVerification(
                EnumVerificationType.email
            ) as IUserVerificationEmailCreate;

            const today = this.helperDateService.create();
            const events = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userSendVerificationEmail,
                    userId: user.id,
                    createdBy: user.id,
                }),
            ];
            await this.userVerificationRepository.createReplacingActive(
                user.id,
                user.email,
                emailVerification,
                today
            );

            this.activityLogDomain.stagePrepared(events);

            const expiredAt = this.helperDateService.formatToIso(
                emailVerification.expiredAt
            );
            await this.notificationQueue.sendVerificationEmail(user.id, {
                expiredAt,
                reference: emailVerification.reference,
                link: emailVerification.link,
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

    async markVerified(userId: string): Promise<void> {
        const verifiedAt = this.helperDateService.create();
        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userVerifiedEmail,
                userId: userId,
                createdBy: userId,
            }),
        ];

        await this.userRepository.markVerified(userId, verifiedAt);

        this.activityLogDomain.stagePrepared(events);
    }

    async persistVerificationEmail(
        userId: string,
        email: string,
        verification: IUserVerificationCreate
    ): Promise<void> {
        const today = this.helperDateService.create();
        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userSendVerificationEmail,
                userId: userId,
                createdBy: userId,
            }),
        ];

        await this.userVerificationRepository.createReplacingActive(
            userId,
            email,
            verification,
            today
        );

        this.activityLogDomain.stagePrepared(events);
    }

    async createFromOnboardingInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        verification: IUserOnboardingVerification,
        createdBy: string
    ): Promise<Verification> {
        return this.userVerificationRepository.createFromOnboardingInTx(
            tx,
            userId,
            verification,
            createdBy
        );
    }
}
