import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { UserMobileNumberAlreadyVerifiedException } from '@modules/user/exceptions/user.mobile-number-already-verified.exception';
import { UserTokenInvalidException } from '@modules/user/exceptions/user.token-invalid.exception';
import { UserMobileNumberExistException } from '@modules/user/exceptions/user.mobile-number-exist.exception';
import { UserMobileNumberInvalidException } from '@modules/user/exceptions/user.mobile-number-invalid.exception';
import { UserMobileNumberNotFoundException } from '@modules/user/exceptions/user.mobile-number-not-found.exception';
import type {
    IUserMobileNumber,
    IUserMobileNumberInput,
    IUserMobileNumberSummary,
} from '@modules/user/interfaces/user.interface';
import { UserMobileNumberRepository } from '@modules/user/repositories/user.mobile-number.repository';
import { UserService } from '@modules/user/services/user.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { Injectable } from '@nestjs/common';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class UserMobileNumberService {
    constructor(
        private readonly userMobileNumberRepository: UserMobileNumberRepository,
        private readonly userService: UserService,
        private readonly userVerificationService: UserVerificationService,
        private readonly helperDateService: HelperDateService,
        private readonly outboxService: OutboxService,
        private readonly activityLogQueue: ActivityLogQueue
    ) {}

    private checkMobileNumber(
        phoneCodes: string[],
        phoneCode: string
    ): boolean {
        return phoneCodes.includes(phoneCode);
    }

    async getListByUser(userId: string): Promise<IUserMobileNumber[]> {
        return this.userMobileNumberRepository.findManyByUser(userId);
    }

    async existsMobileNumber(
        userId: string,
        input: IUserMobileNumberInput,
        excludeId: string | null
    ): Promise<boolean> {
        return this.userMobileNumberRepository.existsMobileNumber(
            userId,
            input,
            excludeId
        );
    }

    /** Throws UserMobileNumberInvalidException when the phone code is outside the country's list, then UserMobileNumberExistException when the number is a duplicate. */
    assertMobileNumberAllowed(
        countryPhoneCodes: string[],
        phoneCode: string,
        isDuplicate: boolean
    ): void {
        const checkValidMobileNumber = this.checkMobileNumber(
            countryPhoneCodes,
            phoneCode
        );
        if (!checkValidMobileNumber) {
            throw new UserMobileNumberInvalidException();
        }

        if (isDuplicate) {
            throw new UserMobileNumberExistException();
        }
    }

    /** Adds the mobile number, touches the user (clearing the password attempt when its password was checked), and adds the entry on the caller's transaction. */
    async addMobileNumberInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        { number, countryId, phoneCode }: IUserMobileNumberInput,
        isPasswordChecked: boolean
    ): Promise<IUserMobileNumber> {
        const userId = authContext.userId;
        const mobileNumber = await this.userMobileNumberRepository.addInTx(
            tx,
            userId,
            {
                number,
                countryId,
                phoneCode,
            }
        );
        await this.userService.touchUpdatedByInTx(
            tx,
            userId,
            isPasswordChecked
        );

        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.userMobileNumberAdded,
            }
        );
        await this.outboxService.addInTx(tx, entry);

        return mobileNumber;
    }

    async getOneMobileNumber(
        userId: string,
        mobileNumberId: string
    ): Promise<IUserMobileNumberSummary> {
        const mobileNumber =
            await this.userMobileNumberRepository.findOneMobileNumber(
                userId,
                mobileNumberId
            );
        if (!mobileNumber) {
            throw new UserMobileNumberNotFoundException();
        }

        return mobileNumber;
    }

    /** Resolves the number of the user; throws when it is not the user's or is already verified. */
    async getOneUnverifiedMobileNumber(
        userId: string,
        mobileNumberId: string
    ): Promise<IUserMobileNumberSummary> {
        const mobileNumber = await this.getOneMobileNumber(
            userId,
            mobileNumberId
        );
        if (mobileNumber.isVerified) {
            throw new UserMobileNumberAlreadyVerifiedException();
        }

        return mobileNumber;
    }

    /** Marks the number verified now on the caller's transaction; throws when it was verified or deleted first. */
    async markVerifiedInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        mobileNumberId: string
    ): Promise<void> {
        const verifiedAt = this.helperDateService.now();
        const isMarked = await this.userMobileNumberRepository.markVerifiedInTx(
            tx,
            userId,
            mobileNumberId,
            verifiedAt
        );
        if (!isMarked) {
            throw new UserTokenInvalidException();
        }
    }

    toDialableNumber({ phoneCode, number }: IUserMobileNumberSummary): string {
        return `+${phoneCode}${number}`;
    }

    /** Updates the mobile number, touches the user (clearing the password attempt when its password was checked), and adds the entry on the caller's transaction; a changed number or phone code clears the verification and marks the number's unused codes used. */
    async updateMobileNumberInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        current: IUserMobileNumberSummary,
        { number, countryId, phoneCode }: IUserMobileNumberInput,
        isPasswordChecked: boolean
    ): Promise<IUserMobileNumber> {
        const userId = authContext.userId;
        const isChanged =
            current.number !== number || current.phoneCode !== phoneCode;
        const isVerified = isChanged ? false : current.isVerified;

        // Sequential by design: a statement whose failure is the answer, awaited before an unrelated write
        const mobileNumber = await this.userMobileNumberRepository.updateInTx(
            tx,
            userId,
            current.id,
            {
                number,
                countryId,
                phoneCode,
            },
            isVerified
        );

        let expiring = Promise.resolve();
        if (isChanged) {
            expiring =
                this.userVerificationService.expireActiveByMobileNumberInTx(
                    tx,
                    current.id
                );
        }
        await Promise.all([
            this.userService.touchUpdatedByInTx(tx, userId, isPasswordChecked),
            expiring,
        ]);

        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.userMobileNumberUpdated,
            }
        );
        await this.outboxService.addInTx(tx, entry);

        return mobileNumber;
    }

    /** Deletes the mobile number, touches the user (clearing the password attempt when its password was checked), marks the number's unused codes used, and adds the entry on the caller's transaction; a delete that matches no row rejects with UserMobileNumberNotFoundException. */
    async deleteMobileNumberInTx(
        tx: IDatabaseTransactionClient,
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        mobileNumberId: string,
        isPasswordChecked: boolean
    ): Promise<IUserMobileNumber> {
        const userId = authContext.userId;
        // Sequential by design: a statement whose failure is the answer, awaited before an unrelated write
        const mobileNumber = await this.userMobileNumberRepository.deleteInTx(
            tx,
            userId,
            mobileNumberId
        );

        await Promise.all([
            this.userService.touchUpdatedByInTx(tx, userId, isPasswordChecked),
            this.userVerificationService.expireActiveByMobileNumberInTx(
                tx,
                mobileNumberId
            ),
        ]);

        const entry = this.activityLogQueue.recordEffect(
            requestContext,
            apiKeyContext,
            authContext,
            null,
            {
                action: EnumActivityLogAction.userMobileNumberDeleted,
            }
        );
        await this.outboxService.addInTx(tx, entry);

        return mobileNumber;
    }

    async removeByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await this.userMobileNumberRepository.deleteByUserInTx(tx, userId);
    }
}
