import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { UserMobileNumberExistException } from '@modules/user/exceptions/user.mobile-number-exist.exception';
import { UserMobileNumberInvalidException } from '@modules/user/exceptions/user.mobile-number-invalid.exception';
import { UserMobileNumberNotFoundException } from '@modules/user/exceptions/user.mobile-number-not-found.exception';
import type {
    IUserMobileNumber,
    IUserMobileNumberInput,
} from '@modules/user/interfaces/user.interface';
import { UserMobileNumberRepository } from '@modules/user/repositories/user.mobile-number.repository';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserMobileNumberDomain {
    constructor(
        private readonly userMobileNumberRepository: UserMobileNumberRepository,
        private readonly userDomain: UserDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly databaseService: DatabaseService,
        private readonly countryDomain: CountryDomain,
        private readonly userUtil: UserUtil
    ) {}

    async addMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: IUserMobileNumberInput
    ): Promise<IUserMobileNumber> {
        const country = await this.countryDomain.getOne(countryId);

        const [checkValidMobileNumber, checkExist] = await Promise.all([
            this.userUtil.checkMobileNumber(country.phoneCodes, phoneCode),
            this.userMobileNumberRepository.existsMobileNumber(userId, {
                number,
                countryId: country.id,
                phoneCode,
            }),
        ]);
        if (!checkValidMobileNumber) {
            throw new UserMobileNumberInvalidException();
        } else if (checkExist) {
            throw new UserMobileNumberExistException();
        }

        try {
            const events = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userAddMobileNumber,
                }),
            ];
            const row = await this.databaseService.withTransaction(async tx => {
                const mobileNumber =
                    await this.userMobileNumberRepository.addInTx(tx, userId, {
                        number,
                        countryId,
                        phoneCode,
                    });
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

    async updateMobileNumber(
        userId: string,
        mobileNumberId: string,
        { number, countryId, phoneCode }: IUserMobileNumberInput
    ): Promise<IUserMobileNumber> {
        const [checkMobileNumberExist, country] = await Promise.all([
            this.userMobileNumberRepository.findOneMobileNumber(
                userId,
                mobileNumberId
            ),
            this.countryDomain.getOne(countryId),
        ]);
        if (!checkMobileNumberExist) {
            throw new UserMobileNumberNotFoundException();
        }

        const checkExist =
            await this.userMobileNumberRepository.existsMobileNumber(
                userId,
                { number, countryId, phoneCode },
                mobileNumberId
            );
        if (checkExist) {
            throw new UserMobileNumberExistException();
        }

        const checkValidMobileNumber = this.userUtil.checkMobileNumber(
            country.phoneCodes,
            phoneCode
        );
        if (!checkValidMobileNumber) {
            throw new UserMobileNumberInvalidException();
        }

        const isVerified =
            checkMobileNumberExist.number === number &&
            checkMobileNumberExist.phoneCode === phoneCode
                ? checkMobileNumberExist.isVerified
                : false;

        try {
            const events = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userUpdateMobileNumber,
                }),
            ];
            const row = await this.databaseService.withTransaction(async tx => {
                const mobileNumber =
                    await this.userMobileNumberRepository.updateInTx(
                        tx,
                        checkMobileNumberExist.id,
                        {
                            number,
                            countryId,
                            phoneCode,
                        },
                        isVerified
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
            const events = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userDeleteMobileNumber,
                }),
            ];
            const row = await this.databaseService.withTransaction(async tx => {
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
}
