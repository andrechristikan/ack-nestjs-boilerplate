import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import {
    EnumActivityLogAction,
    EnumUserReauthenticationAction,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { User, Verification } from '@generated/prisma-client/client';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { UserEmailAlreadyVerifiedException } from '@modules/user/exceptions/user.email-already-verified.exception';
import { UserReauthenticationOtpInvalidException } from '@modules/user/exceptions/user.reauthentication-otp-invalid.exception';
import { UserReauthenticationOtpResendLimitException } from '@modules/user/exceptions/user.reauthentication-otp-resend-limit.exception';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IUserVerificationEmailTarget,
    IUserVerificationMobileCreate,
    IUserVerificationReauthenticationCreate,
} from '@modules/user/interfaces/user.interface';
import type { IUserCreateVerification } from '@modules/user/interfaces/user.create.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

@Injectable()
export class UserVerificationService {
    private readonly otpLength: number;
    private readonly expiresInMinutes: number;
    private readonly retentionInMs: number;

    constructor(
        private readonly userVerificationRepository: UserVerificationRepository,
        private readonly userRepository: UserRepository,
        private readonly outboxService: OutboxService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly notificationQueue: NotificationQueue,
        private readonly helperHashService: HelperHashService,
        private readonly helperDateService: HelperDateService,
        private readonly helperNumberService: HelperNumberService,
        private readonly configService: ConfigService,
        private readonly userUtil: UserUtil,
        private readonly userVerificationUtil: UserVerificationUtil
    ) {
        this.otpLength = this.configService.get<number>(
            'verification.otpLength'
        )!;
        this.expiresInMinutes = this.configService.get<number>(
            'verification.expiresInMinutes'
        )!;
        this.retentionInMs = this.configService.get<number>(
            'verification.retentionInMs'
        )!;
    }

    private createReauthentication(
        email: string,
        action: EnumUserReauthenticationAction
    ): IUserVerificationReauthenticationCreate {
        const otp = this.helperNumberService.randomDigits(this.otpLength);
        const token = this.helperHashService.sha256Hash(otp);
        const reference = this.userVerificationUtil.createReference();
        const expiredAt = this.userVerificationUtil.createExpiredAt();

        return {
            verification: {
                reference,
                token,
                type: EnumVerificationType.reauthentication,
                action,
                mobileNumberId: null,
                to: email,
                expiredAt,
                verifiedAt: null,
                isUsed: false,
            },
            otp,
            action,
            expiredInMinutes: this.expiresInMinutes,
        };
    }

    private createMobile(
        to: string,
        mobileNumberId: string
    ): IUserVerificationMobileCreate {
        const otp = this.helperNumberService.randomDigits(this.otpLength);
        const token = this.helperHashService.sha256Hash(otp);
        const reference = this.userVerificationUtil.createReference();
        const expiredAt = this.userVerificationUtil.createExpiredAt();

        return {
            verification: {
                reference,
                token,
                type: EnumVerificationType.mobileNumber,
                action: null,
                mobileNumberId,
                to,
                expiredAt,
                verifiedAt: null,
                isUsed: false,
            },
            otp,
            expiredInMinutes: this.expiresInMinutes,
        };
    }

    /** Resolves the unused, unexpired email verification of a raw token for an active user, with that user; throws when none matches or the user is already verified. */
    async getOneActiveByEmailToken(
        token: string
    ): Promise<IUserVerificationEmailTarget> {
        const hashedToken = this.helperHashService.sha256Hash(token);
        const found =
            await this.userVerificationRepository.findOneActiveByVerificationEmailToken(
                hashedToken
            );
        if (!found) {
            throw new UserTokenInvalidException();
        }

        const { user, ...verification } = found;
        if (user.isVerified) {
            throw new UserEmailAlreadyVerifiedException();
        }

        return { verification, user };
    }

    /** Marks the verification used and the user verified, and adds the verifiedEmail effect and the activity entry on the caller's transaction; a verification used first throws UserTokenInvalidException. */
    async verifyEmailInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        verification: Verification
    ): Promise<void> {
        const verifiedAt = this.helperDateService.now();
        const isMarkedUsed = await this.userVerificationRepository.markUsedInTx(
            tx,
            verification.id,
            verifiedAt,
            verification.userId
        );
        if (!isMarkedUsed) {
            throw new UserTokenInvalidException();
        }
        await this.userRepository.markVerifiedInTx(
            tx,
            verification.userId,
            verifiedAt
        );
        const effect = this.notificationQueue.notify(
            EnumNotificationKind.verifiedEmail,
            {
                userId: verification.userId,
                proceedBy: verification.userId,
                reference: verification.reference,
            }
        );
        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            null,
            null,
            {
                action: EnumActivityLogAction.userEmailVerified,
                userId: verification.userId,
                createdBy: verification.userId,
            }
        );
        await this.outboxService.addManyInTx(tx, [entry, effect]);
    }

    /** False when the user is verified or the last verification email is inside the resend window. */
    async isEmailResendable(user: User): Promise<boolean> {
        if (user.isVerified) {
            return false;
        }

        const lastVerification =
            await this.userVerificationRepository.findOneLatestByVerificationEmail(
                user.id
            );
        if (!lastVerification) {
            return true;
        }

        const isInsideResendWindow = this.userUtil.isInsideResendWindow(
            lastVerification.createdAt,
            this.userVerificationUtil.resendInMinutes
        );

        return !isInsideResendWindow;
    }

    /** Resolves the active user of an email when isEmailResendable holds for it; null otherwise. */
    async getOneForResendByEmail(email: string): Promise<User | null> {
        const user = await this.userRepository.findOneActiveByEmail(email);
        if (!user) {
            return null;
        }

        const isResendable = await this.isEmailResendable(user);

        return isResendable ? user : null;
    }

    /** Marks the user verified and clears its password, password dates, and password attempt counter in the same write, on the caller's transaction. */
    async markVerifiedBySocialInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<User> {
        const verifiedAt = this.helperDateService.now();

        return this.userRepository.markVerifiedBySocialInTx(
            tx,
            userId,
            verifiedAt
        );
    }

    /** Creates an email verification for the user, replacing its active one, and adds the verificationEmail effect on the caller's transaction. */
    async sendEmailInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        email: string
    ): Promise<void> {
        const verification = this.userVerificationUtil.createEmail();
        const today = this.helperDateService.now();

        await this.userVerificationRepository.createReplacingActiveInTx(
            tx,
            userId,
            email,
            verification,
            today
        );
        const context = this.userVerificationUtil.mapEmailContext(
            userId,
            verification
        );
        const effect = this.notificationQueue.notify(
            EnumNotificationKind.verificationEmail,
            context
        );
        await this.outboxService.addInTx(tx, effect);
    }

    /** Resolves the unused, unexpired reauthentication row of the user, action, and code; throws when none matches, writing nothing. */
    async getOneActiveReauthentication(
        userId: string,
        action: EnumUserReauthenticationAction,
        otp: string
    ): Promise<Verification> {
        const hashedOtp = this.helperHashService.sha256Hash(otp);
        const verification =
            await this.userVerificationRepository.findOneActiveReauthentication(
                userId,
                action,
                hashedOtp
            );
        if (!verification) {
            throw new UserReauthenticationOtpInvalidException();
        }

        return verification;
    }

    /** Throws when the latest code of the user and action, used or not, was created inside the resend window. */
    async assertReauthenticationResendable(
        userId: string,
        action: EnumUserReauthenticationAction
    ): Promise<void> {
        const lastVerification =
            await this.userVerificationRepository.findOneLatestReauthentication(
                userId,
                action
            );
        if (!lastVerification) {
            return;
        }

        const isInsideResendWindow = this.userUtil.isInsideResendWindow(
            lastVerification.createdAt,
            this.userVerificationUtil.resendInMinutes
        );
        if (isInsideResendWindow) {
            throw new UserReauthenticationOtpResendLimitException();
        }
    }

    /** Marks the user's unused codes of the action used, creates the new code row, and adds the reauthenticationOtp effect on the caller's transaction. */
    async sendReauthenticationInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        email: string,
        action: EnumUserReauthenticationAction
    ): Promise<void> {
        const created = this.createReauthentication(email, action);

        await this.userVerificationRepository.markUnusedReauthenticationUsedInTx(
            tx,
            userId,
            action
        );
        const verification = await this.userVerificationRepository.createInTx(
            tx,
            userId,
            created.verification,
            userId
        );
        const effect = this.notificationQueue.notify(
            EnumNotificationKind.reauthenticationOtp,
            {
                userId,
                proceedBy: userId,
                verificationId: verification.id,
                otp: created.otp,
                action: created.action,
                expiredInMinutes: created.expiredInMinutes,
            }
        );
        await this.outboxService.addInTx(tx, effect);
    }

    /** False while the number's latest code, used or not, was created inside the resend window. */
    async isMobileResendable(
        userId: string,
        mobileNumberId: string
    ): Promise<boolean> {
        const lastVerification =
            await this.userVerificationRepository.findOneLatestByMobileNumber(
                userId,
                mobileNumberId
            );
        if (!lastVerification) {
            return true;
        }

        const isInsideResendWindow = this.userUtil.isInsideResendWindow(
            lastVerification.createdAt,
            this.userVerificationUtil.resendInMinutes
        );

        return !isInsideResendWindow;
    }

    /** Resolves the unused, unexpired code row of the user, number, and code; throws when none matches, writing nothing. */
    async getOneActiveByMobileOtp(
        userId: string,
        mobileNumberId: string,
        otp: string
    ): Promise<Verification> {
        const hashedOtp = this.helperHashService.sha256Hash(otp);
        const verification =
            await this.userVerificationRepository.findOneActiveByMobileOtp(
                userId,
                mobileNumberId,
                hashedOtp
            );
        if (!verification) {
            throw new UserTokenInvalidException();
        }

        return verification;
    }

    /** Marks the number's unused codes used on the caller's transaction, so a code sent for the number's earlier digits stops working. */
    async expireActiveByMobileNumberInTx(
        tx: IDatabaseTransactionClient,
        mobileNumberId: string
    ): Promise<void> {
        await this.userVerificationRepository.markUnusedMobileUsedInTx(
            tx,
            mobileNumberId
        );
    }

    /** The number a code row was sent to while the row is unused and unexpired; null otherwise. */
    async getOneActiveMobileRecipient(
        verificationId: string
    ): Promise<string | null> {
        const verification =
            await this.userVerificationRepository.findOneActiveMobileById(
                verificationId
            );

        return verification?.to ?? null;
    }

    /** Marks the number's unused codes used, creates the new code row, and adds the verificationMobileNumber effect on the caller's transaction. */
    async sendMobileInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        mobileNumberId: string,
        to: string
    ): Promise<void> {
        const created = this.createMobile(to, mobileNumberId);

        await this.userVerificationRepository.markUnusedMobileUsedInTx(
            tx,
            mobileNumberId
        );
        const verification = await this.userVerificationRepository.createInTx(
            tx,
            userId,
            created.verification,
            userId
        );
        const effect = this.notificationQueue.notify(
            EnumNotificationKind.verificationMobileNumber,
            {
                userId,
                proceedBy: userId,
                verificationId: verification.id,
                otp: created.otp,
                reference: created.verification.reference,
                expiredInMinutes: created.expiredInMinutes,
            }
        );
        await this.outboxService.addInTx(tx, effect);
    }

    /** Marks the verification used now; false when it was used or expired first. */
    async markUsedInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        userId: string
    ): Promise<boolean> {
        const verifiedAt = this.helperDateService.now();

        return this.userVerificationRepository.markUsedInTx(
            tx,
            id,
            verifiedAt,
            userId
        );
    }

    /** Marks the mobile verification used now; a verification used or expired first throws UserTokenInvalidException. */
    async markMobileUsedInTx(
        tx: IDatabaseTransactionClient,
        verificationId: string,
        userId: string
    ): Promise<void> {
        const isMarkedUsed = await this.markUsedInTx(
            tx,
            verificationId,
            userId
        );
        if (!isMarkedUsed) {
            throw new UserTokenInvalidException();
        }
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        verification: IUserCreateVerification,
        createdBy: string
    ): Promise<Verification> {
        return this.userVerificationRepository.createInTx(
            tx,
            userId,
            verification,
            createdBy
        );
    }

    /** Deletes the verifications that expired longer ago than verification.retentionInMs; returns the count. */
    async purgeExpired(): Promise<number> {
        const now = this.helperDateService.now();
        const retention = this.helperDateService.createDuration({
            milliseconds: this.retentionInMs,
        });
        const threshold = this.helperDateService.backward(now, retention);

        return this.userVerificationRepository.deleteExpiredBefore(threshold);
    }
}
