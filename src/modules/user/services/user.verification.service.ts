import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumVerificationType } from '@generated/prisma-client';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserEmailAlreadyVerifiedException } from '@modules/user/exceptions/user.email-already-verified.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import { UserVerificationEmailResendLimitExceededException } from '@modules/user/exceptions/user.verification-email-resend-limit-exceeded.exception';
import {
    IUserVerificationCreate,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { IUserVerificationService } from '@modules/user/interfaces/user.verification.service.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';
import ms from 'ms';

@Injectable()
export class UserVerificationService implements IUserVerificationService {
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
        private readonly helperHashService: HelperHashService,
        private readonly notificationQueue: NotificationQueue,
        private readonly helperDateService: HelperDateService,
        private readonly requestStoreService: RequestStoreService,
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly helperNumberService: HelperNumberService,
        private readonly helperEncryptionService: HelperEncryptionService
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
        this.verificationExpiredInMinutes =
            this.configService.get<number>('verification.expiredInMs')! /
            ms('1m');
        this.verificationTokenLength = this.configService.get<number>(
            'verification.tokenLength'
        )!;
        this.verificationResendInMinutes =
            this.configService.get<number>('verification.resendInMs')! /
            ms('1m');
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
        userId: string,
        type: EnumVerificationType
    ): IUserVerificationCreate {
        if (type === EnumVerificationType.mobileNumber) {
            const token = this.verificationCreateOtp();
            const hashedToken = this.helperHashService.sha256Hash(token);

            return {
                reference: this.verificationCreateReference(),
                expiredAt: this.verificationSetExpiredDate(),
                type: EnumVerificationType.mobileNumber,
                token,
                hashedToken,
                expiredInMinutes: this.verificationExpiredInMinutes,
                resendInMinutes: this.verificationResendInMinutes,
            };
        }

        const token = this.verificationCreateToken();
        const hashedToken = this.helperHashService.sha256Hash(token);
        const link = this.verificationLinkPattern
            .replace('{homeUrl}', this.homeUrl)
            .replace('{token}', token);
        const encryptedLink = this.helperEncryptionService.aes256EncryptSimple(
            link ?? '',
            userId
        );

        return {
            reference: this.verificationCreateReference(),
            expiredAt: this.verificationSetExpiredDate(),
            type: EnumVerificationType.email,
            token,
            hashedToken,
            expiredInMinutes: this.verificationExpiredInMinutes,
            link: link,
            encryptedLink: encryptedLink,
            resendInMinutes: this.verificationResendInMinutes,
        };
    }

    async verifyEmail(token: string): Promise<void> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const hashedToken = this.helperHashService.sha256Hash(token);
        const verification =
            await this.userVerificationRepository.findOneActiveByVerificationEmailToken(
                hashedToken
            );
        if (!verification) {
            throw new UserTokenInvalidException();
        }

        try {
            await this.userVerificationRepository.verifyEmail(
                verification.id,
                verification.userId,
                requestLog
            );

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
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

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
                throw new UserVerificationEmailResendLimitExceededException(
                    this.helperDateService.diff(today, canResendAt).minutes
                );
            }
        }

        try {
            const emailVerification = this.verificationCreateVerification(
                user.id,
                EnumVerificationType.email
            ) as IUserVerificationEmailCreate;

            await this.userVerificationRepository.requestVerificationEmail(
                user.id,
                user.email,
                emailVerification,
                requestLog
            );

            await this.notificationQueue.sendVerificationEmail(user.id, {
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
}
