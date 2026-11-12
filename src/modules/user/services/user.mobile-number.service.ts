import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IRequestContextUserSnapshot } from '@common/request/interfaces/request.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
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
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserMobileNumberService {
    constructor(
        private readonly userMobileNumberRepository: UserMobileNumberRepository,
        private readonly userService: UserService,
        private readonly outboxService: OutboxService,
        private readonly activityLogService: ActivityLogService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    private checkMobileNumber(
        phoneCodes: string[],
        phoneCode: string
    ): boolean {
        return phoneCodes.includes(phoneCode);
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

    async addMobileNumber(
        snapshot: IRequestContextUserSnapshot,
        { number, countryId, phoneCode }: IUserMobileNumberInput,
        countryPhoneCodes: string[],
        isDuplicate: boolean
    ): Promise<IUserMobileNumber> {
        const userId = snapshot.actorUserId;
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

        try {
            const row = await this.outboxService.withTransaction(async tx => {
                const mobileNumber =
                    await this.userMobileNumberRepository.addInTx(tx, userId, {
                        number,
                        countryId,
                        phoneCode,
                    });
                await this.userService.touchUpdatedByInTx(tx, userId);

                const entry = this.activityLogService.recordEffect(snapshot, {
                    action: EnumActivityLogAction.userAddMobileNumber,
                });
                await this.outboxService.addInTx(tx, entry);

                return mobileNumber;
            });

            return row;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const isDuplicate = this.databaseUtil.isUniqueCollision(
                err,
                'number'
            );
            if (isDuplicate) {
                throw new UserMobileNumberExistException();
            }

            throw new AppUnknownException(err);
        }
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

    async updateMobileNumber(
        snapshot: IRequestContextUserSnapshot,
        current: IUserMobileNumberSummary,
        { number, countryId, phoneCode }: IUserMobileNumberInput,
        countryPhoneCodes: string[],
        isDuplicate: boolean
    ): Promise<IUserMobileNumber> {
        const userId = snapshot.actorUserId;
        if (isDuplicate) {
            throw new UserMobileNumberExistException();
        }

        const checkValidMobileNumber = this.checkMobileNumber(
            countryPhoneCodes,
            phoneCode
        );
        if (!checkValidMobileNumber) {
            throw new UserMobileNumberInvalidException();
        }

        const isVerified =
            current.number === number && current.phoneCode === phoneCode
                ? current.isVerified
                : false;

        try {
            const row = await this.outboxService.withTransaction(async tx => {
                const mobileNumber =
                    await this.userMobileNumberRepository.updateInTx(
                        tx,
                        current.id,
                        {
                            number,
                            countryId,
                            phoneCode,
                        },
                        isVerified
                    );
                await this.userService.touchUpdatedByInTx(tx, userId);

                const entry = this.activityLogService.recordEffect(snapshot, {
                    action: EnumActivityLogAction.userUpdateMobileNumber,
                });
                await this.outboxService.addInTx(tx, entry);

                return mobileNumber;
            });

            return row;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const isDuplicate = this.databaseUtil.isUniqueCollision(
                err,
                'number'
            );
            if (isDuplicate) {
                throw new UserMobileNumberExistException();
            }

            throw new AppUnknownException(err);
        }
    }

    async deleteMobileNumber(
        snapshot: IRequestContextUserSnapshot,
        mobileNumberId: string
    ): Promise<IUserMobileNumber> {
        const userId = snapshot.actorUserId;
        // Sequential by design: gate before the work it guards
        await this.getOneMobileNumber(userId, mobileNumberId);

        try {
            const row = await this.outboxService.withTransaction(async tx => {
                const mobileNumber =
                    await this.userMobileNumberRepository.deleteInTx(
                        tx,
                        mobileNumberId
                    );
                if (!mobileNumber) {
                    throw new UserMobileNumberNotFoundException();
                }

                await this.userService.touchUpdatedByInTx(tx, userId);

                const entry = this.activityLogService.recordEffect(snapshot, {
                    action: EnumActivityLogAction.userDeleteMobileNumber,
                });
                await this.outboxService.addInTx(tx, entry);

                return mobileNumber;
            });

            return row;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new UserMobileNumberNotFoundException();
            }

            throw new AppUnknownException(err);
        }
    }

    async removeByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<void> {
        await this.userMobileNumberRepository.deleteByUserInTx(tx, userId);
    }
}
