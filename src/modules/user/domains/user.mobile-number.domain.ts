import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { UserMobileNumberAlreadyVerifiedException } from '@modules/user/exceptions/user.mobile-number-already-verified.exception';
import { UserMobileNumberExistException } from '@modules/user/exceptions/user.mobile-number-exist.exception';
import { UserMobileNumberInvalidException } from '@modules/user/exceptions/user.mobile-number-invalid.exception';
import { UserMobileNumberNotFoundException } from '@modules/user/exceptions/user.mobile-number-not-found.exception';
import { UserMobileNumberOtpInvalidException } from '@modules/user/exceptions/user.mobile-number-otp-invalid.exception';
import { UserVerificationMobileNumberResendLimitExceededException } from '@modules/user/exceptions/user.verification-mobile-number-resend-limit-exceeded.exception';
import type {
    IUserMobileNumber,
    IUserMobileNumberInput,
    IUserMobileNumberVerificationCreate,
} from '@modules/user/interfaces/user.interface';
import { UserMobileNumberRepository } from '@modules/user/repositories/user.mobile-number.repository';
import { UserVerificationRepository } from '@modules/user/repositories/user.verification.repository';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';
import ms from 'ms';

@Injectable()
export class UserMobileNumberDomain {
    private readonly verificationReferencePrefix: string;
    private readonly verificationReferenceLength: number;
    private readonly verificationOtpLength: number;
    private readonly verificationExpiredInMs: number;
    private readonly verificationExpiredInMinutes: number;
    private readonly verificationResendInMs: number;

    constructor(
        private readonly userMobileNumberRepository: UserMobileNumberRepository,
        private readonly userVerificationRepository: UserVerificationRepository,
        private readonly userDomain: UserDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseService: DatabaseService,
        private readonly countryDomain: CountryDomain,
        private readonly userUtil: UserUtil,
        private readonly notificationQueue: NotificationQueue,
        private readonly configService: ConfigService,
        private readonly helperNumberService: HelperNumberService,
        private readonly helperStringService: HelperStringService,
        private readonly helperHashService: HelperHashService,
        private readonly helperDateService: HelperDateService
    ) {
        this.verificationReferencePrefix = this.configService.get<string>(
            'verification.reference.prefix'
        )!;
        this.verificationReferenceLength = this.configService.get<number>(
            'verification.reference.length'
        )!;
        this.verificationOtpLength = this.configService.get<number>(
            'verification.otpLength'
        )!;
        this.verificationExpiredInMs = this.configService.get<number>(
            'verification.expiredInMs'
        )!;
        this.verificationExpiredInMinutes =
            this.verificationExpiredInMs / ms('1m');
        this.verificationResendInMs = this.configService.get<number>(
            'verification.resendInMs'
        )!;
    }

    private async assertMobileVerificationCooldown(
        userId: string
    ): Promise<void> {
        const latest =
            await this.userVerificationRepository.findOneLatestMobileNumberByUser(
                userId
            );
        if (!latest) {
            return;
        }

        const now = this.helperDateService.create();
        const canResendAt = this.helperDateService.forward(
            latest.createdAt,
            Duration.fromMillis(this.verificationResendInMs)
        );
        if (now < canResendAt) {
            const remaining = this.helperDateService.diff(canResendAt, now);

            throw new UserVerificationMobileNumberResendLimitExceededException(
                Math.ceil(remaining.as('minutes'))
            );
        }
    }

    private createMobileVerification(): IUserMobileNumberVerificationCreate {
        const otp = this.helperNumberService.randomDigits(
            this.verificationOtpLength
        );
        const hashedOtp = this.helperHashService.sha256Hash(otp);
        const random = this.helperStringService.random(
            this.verificationReferenceLength
        );
        const now = this.helperDateService.create();
        const expiredAt = this.helperDateService.forward(
            now,
            Duration.fromMillis(this.verificationExpiredInMs)
        );

        return {
            otp,
            hashedOtp,
            reference: `${this.verificationReferencePrefix}-${random}`,
            expiredAt,
            expiredInMinutes: this.verificationExpiredInMinutes,
        };
    }

    private async enqueueMobileVerification(
        userId: string,
        mobileNumber: Pick<IUserMobileNumber, 'id' | 'number' | 'phoneCode'>,
        verification: IUserMobileNumberVerificationCreate
    ): Promise<void> {
        const expiredAt = this.helperDateService.formatToIso(
            verification.expiredAt
        );

        await this.notificationQueue.sendVerificationMobileNumber(userId, {
            mobileNumberId: mobileNumber.id,
            phoneNumber: `${mobileNumber.phoneCode}${mobileNumber.number}`,
            otp: verification.otp,
            expiredAt,
            expiredInMinutes: verification.expiredInMinutes,
            reference: verification.reference,
        });
    }

    async isActiveVerification(
        userId: string,
        mobileNumberId: string,
        reference: string
    ): Promise<boolean> {
        const activeVerification =
            await this.userVerificationRepository.findOneActiveMobileNumber(
                userId,
                mobileNumberId
            );

        return activeVerification?.reference === reference;
    }

    async addMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: IUserMobileNumberInput
    ): Promise<IUserMobileNumber> {
        const countryPromise = this.countryDomain.getOne(countryId);
        const cooldownPromise = this.assertMobileVerificationCooldown(userId);
        const existPromise = this.userMobileNumberRepository.existsMobileNumber(
            userId,
            { number, countryId, phoneCode }
        );
        const [country, , checkExist] = await Promise.all([
            countryPromise,
            cooldownPromise,
            existPromise,
        ]);

        const checkValidMobileNumber = this.userUtil.checkMobileNumber(
            country.phoneCode,
            phoneCode
        );
        if (!checkValidMobileNumber) {
            throw new UserMobileNumberInvalidException();
        } else if (checkExist) {
            throw new UserMobileNumberExistException();
        }

        try {
            const verification = this.createMobileVerification();
            const now = this.helperDateService.create();
            const addEvent = this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userAddMobileNumber,
            });
            const sendEvent = this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userSendVerificationMobileNumber,
                userId,
                createdBy: userId,
            });
            const events = [addEvent, sendEvent];
            const row = await this.databaseService.withTransaction(async tx => {
                // Sequential by design: statements on one tx run one at a time.
                const mobileNumber =
                    await this.userMobileNumberRepository.addInTx(tx, userId, {
                        number,
                        countryId,
                        phoneCode,
                    });
                await this.userVerificationRepository.createMobileNumberInTx(
                    tx,
                    userId,
                    mobileNumber.id,
                    `${mobileNumber.phoneCode}${mobileNumber.number}`,
                    {
                        hashedOtp: verification.hashedOtp,
                        reference: verification.reference,
                        expiredAt: verification.expiredAt,
                    },
                    now
                );
                await this.userDomain.touchUpdatedByInTx(tx, userId);

                return mobileNumber;
            });

            this.activityLogDomain.stagePrepared(events);

            // Sequential by design: the SMS must not go out if the transaction throws.
            await this.enqueueMobileVerification(userId, row, verification);

            return row;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async updateMobileNumber(
        userId: string,
        mobileNumberId: string,
        { number, countryId, phoneCode }: IUserMobileNumberInput
    ): Promise<IUserMobileNumber> {
        const mobileNumberPromise =
            this.userMobileNumberRepository.findOneMobileNumber(
                userId,
                mobileNumberId
            );
        const countryPromise = this.countryDomain.getOne(countryId);
        const existPromise = this.userMobileNumberRepository.existsMobileNumber(
            userId,
            { number, countryId, phoneCode },
            mobileNumberId
        );
        const [checkMobileNumberExist, country, checkExist] = await Promise.all(
            [mobileNumberPromise, countryPromise, existPromise]
        );
        if (!checkMobileNumberExist) {
            throw new UserMobileNumberNotFoundException();
        } else if (checkExist) {
            throw new UserMobileNumberExistException();
        }

        const checkValidMobileNumber = this.userUtil.checkMobileNumber(
            country.phoneCode,
            phoneCode
        );
        if (!checkValidMobileNumber) {
            throw new UserMobileNumberInvalidException();
        }

        const isUnchanged =
            checkMobileNumberExist.number === number &&
            checkMobileNumberExist.phoneCode === phoneCode;
        if (!isUnchanged) {
            // Sequential by design: only a changed number, known from the read above, starts a verification.
            await this.assertMobileVerificationCooldown(userId);
        }

        try {
            const updateEvent = this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userUpdateMobileNumber,
            });
            const events = [updateEvent];

            if (isUnchanged) {
                const row = await this.databaseService.withTransaction(
                    async tx => {
                        // Sequential by design: statements on one tx run one at a time.
                        const mobileNumber =
                            await this.userMobileNumberRepository.updateInTx(
                                tx,
                                checkMobileNumberExist.id,
                                { number, countryId, phoneCode },
                                checkMobileNumberExist.isVerified,
                                checkMobileNumberExist.verifiedAt
                            );
                        await this.userDomain.touchUpdatedByInTx(tx, userId);

                        return mobileNumber;
                    }
                );

                this.activityLogDomain.stagePrepared(events);

                return row;
            }

            const verification = this.createMobileVerification();
            const now = this.helperDateService.create();
            const sendEvent = this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userSendVerificationMobileNumber,
                userId,
                createdBy: userId,
            });
            events.push(sendEvent);
            const row = await this.databaseService.withTransaction(async tx => {
                // Sequential by design: statements on one tx run one at a time.
                const mobileNumber =
                    await this.userMobileNumberRepository.updateInTx(
                        tx,
                        checkMobileNumberExist.id,
                        { number, countryId, phoneCode },
                        false,
                        null
                    );
                await this.userVerificationRepository.expireActiveMobileNumberInTx(
                    tx,
                    checkMobileNumberExist.id,
                    now
                );
                await this.userVerificationRepository.createMobileNumberInTx(
                    tx,
                    userId,
                    checkMobileNumberExist.id,
                    `${phoneCode}${number}`,
                    {
                        hashedOtp: verification.hashedOtp,
                        reference: verification.reference,
                        expiredAt: verification.expiredAt,
                    },
                    now
                );
                await this.userDomain.touchUpdatedByInTx(tx, userId);

                return mobileNumber;
            });

            this.activityLogDomain.stagePrepared(events);

            // Sequential by design: the SMS must not go out if the transaction throws.
            await this.enqueueMobileVerification(userId, row, verification);

            return row;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async deleteMobileNumber(
        userId: string,
        mobileNumberId: string
    ): Promise<IUserMobileNumber> {
        const checkExist =
            await this.userMobileNumberRepository.findOneMobileNumber(
                userId,
                mobileNumberId
            );
        if (!checkExist) {
            throw new UserMobileNumberNotFoundException();
        }

        try {
            const now = this.helperDateService.create();
            const deleteEvent = this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userDeleteMobileNumber,
            });
            const events = [deleteEvent];
            const row = await this.databaseService.withTransaction(async tx => {
                // Sequential by design: statements on one tx run one at a time; codes expire before the row they point to goes.
                await this.userVerificationRepository.expireActiveMobileNumberInTx(
                    tx,
                    mobileNumberId,
                    now
                );
                const mobileNumber =
                    await this.userMobileNumberRepository.deleteInTx(
                        tx,
                        mobileNumberId
                    );
                await this.userDomain.touchUpdatedByInTx(tx, userId);

                return mobileNumber;
            });

            this.activityLogDomain.stagePrepared(events);

            return row;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async resendMobileNumberVerification(
        userId: string,
        mobileNumberId: string
    ): Promise<void> {
        const mobileNumber =
            await this.userMobileNumberRepository.findOneMobileNumber(
                userId,
                mobileNumberId
            );
        if (!mobileNumber) {
            throw new UserMobileNumberNotFoundException();
        } else if (mobileNumber.isVerified) {
            throw new UserMobileNumberAlreadyVerifiedException();
        }

        // Sequential by design: ownership and state are answered before the cooldown.
        await this.assertMobileVerificationCooldown(userId);

        try {
            const verification = this.createMobileVerification();
            const now = this.helperDateService.create();
            const sendEvent = this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userSendVerificationMobileNumber,
                userId,
                createdBy: userId,
            });
            const events = [sendEvent];
            await this.databaseService.withTransaction(async tx => {
                // Sequential by design: statements on one tx run one at a time; the old code expires before the new one exists.
                await this.userVerificationRepository.expireActiveMobileNumberInTx(
                    tx,
                    mobileNumber.id,
                    now
                );
                await this.userVerificationRepository.createMobileNumberInTx(
                    tx,
                    userId,
                    mobileNumber.id,
                    `${mobileNumber.phoneCode}${mobileNumber.number}`,
                    {
                        hashedOtp: verification.hashedOtp,
                        reference: verification.reference,
                        expiredAt: verification.expiredAt,
                    },
                    now
                );
            });

            this.activityLogDomain.stagePrepared(events);

            // Sequential by design: the SMS must not go out if the transaction throws.
            await this.enqueueMobileVerification(
                userId,
                mobileNumber,
                verification
            );
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }

    async verifyMobileNumber(
        userId: string,
        mobileNumberId: string,
        otp: string
    ): Promise<IUserMobileNumber> {
        const mobileNumber =
            await this.userMobileNumberRepository.findOneMobileNumber(
                userId,
                mobileNumberId
            );
        if (!mobileNumber) {
            throw new UserMobileNumberNotFoundException();
        } else if (mobileNumber.isVerified) {
            throw new UserMobileNumberAlreadyVerifiedException();
        }

        // Sequential by design: a code is read only for a number the user owns and has not verified.
        const verification =
            await this.userVerificationRepository.findOneActiveMobileNumber(
                userId,
                mobileNumber.id
            );
        if (!verification) {
            throw new UserMobileNumberOtpInvalidException();
        }

        const hashedOtp = this.helperHashService.sha256Hash(otp);
        const isOtpValid = this.helperHashService.sha256Compare(
            hashedOtp,
            verification.token
        );
        if (!isOtpValid) {
            throw new UserMobileNumberOtpInvalidException();
        }

        try {
            const now = this.helperDateService.create();
            const row = await this.databaseService.withTransaction(async tx => {
                // Sequential by design: statements on one tx run one at a time; each write re-checks the state read above, and a throw rolls both back.
                const isCodeUsed =
                    await this.userVerificationRepository.markUsedActiveMobileNumberInTx(
                        tx,
                        verification.id,
                        now
                    );
                if (!isCodeUsed) {
                    throw new UserMobileNumberOtpInvalidException();
                }

                const markedMobileNumber =
                    await this.userMobileNumberRepository.markVerifiedInTx(
                        tx,
                        mobileNumber.id,
                        mobileNumber.number,
                        mobileNumber.phoneCode,
                        now
                    );
                if (!markedMobileNumber) {
                    throw new UserMobileNumberOtpInvalidException();
                }

                await this.userDomain.touchUpdatedByInTx(tx, userId);

                return markedMobileNumber;
            });

            return row;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }
}
