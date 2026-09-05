import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumVerificationType } from '@generated/prisma-client';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { UserEmailAlreadyVerifiedException } from '@modules/user/exceptions/user.email-already-verified.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import { UserVerificationEmailResendLimitExceededException } from '@modules/user/exceptions/user.verification-email-resend-limit-exceeded.exception';
import { IUserVerificationEmailCreate } from '@modules/user/interfaces/user.interface';
import { IUserVerificationService } from '@modules/user/interfaces/user.verification.service.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import { Duration } from 'luxon';

@Injectable()
export class UserVerificationService implements IUserVerificationService {
    constructor(
        private readonly userVerificationRepository: UserVerificationRepository,
        private readonly userRepository: UserRepository,
        private readonly userUtil: UserUtil,
        private readonly notificationUtil: NotificationUtil,
        private readonly helperDateService: HelperDateService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async verifyEmail(token: string): Promise<void> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const hashedToken = this.userUtil.hashedToken(token);
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

            await this.notificationUtil.sendVerifiedEmail(verification.userId, {
                reference: verification.reference,
            });

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
                    minutes: this.userUtil.verificationExpiredInMinutes,
                })
            );

            if (today < canResendAt) {
                throw new UserVerificationEmailResendLimitExceededException(
                    this.helperDateService.diff(today, canResendAt).minutes
                );
            }
        }

        try {
            const emailVerification =
                this.userUtil.verificationCreateVerification(
                    user.id,
                    EnumVerificationType.email
                ) as IUserVerificationEmailCreate;

            await this.userVerificationRepository.requestVerificationEmail(
                user.id,
                user.email,
                emailVerification,
                requestLog
            );

            await this.notificationUtil.sendVerificationEmail(user.id, {
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
