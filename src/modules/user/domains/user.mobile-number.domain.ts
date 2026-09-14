import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumActivityLogAction } from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { UserMobileNumberExistException } from '@modules/user/exceptions/user.mobile-number-exist.exception';
import { UserMobileNumberInvalidException } from '@modules/user/exceptions/user.mobile-number-invalid.exception';
import { UserMobileNumberNotFoundException } from '@modules/user/exceptions/user.mobile-number-not-found.exception';
import {
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
        private readonly userUtil: UserUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async addMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: IUserMobileNumberInput
    ): Promise<IUserMobileNumber> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

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
            return await this.databaseService.client.$transaction(async tx => {
                const row = await this.userMobileNumberRepository.addInTx(
                    tx,
                    userId,
                    {
                        number,
                        countryId,
                        phoneCode,
                    }
                );
                await this.userDomain.touchUpdatedByInTx(tx, userId);
                await this.activityLogDomain.recordInTx(
                    tx,
                    userId,
                    EnumActivityLogAction.userAddMobileNumber,
                    requestLog,
                    null
                );

                return row;
            });
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
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

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
            return await this.databaseService.client.$transaction(async tx => {
                const row = await this.userMobileNumberRepository.updateInTx(
                    tx,
                    userId,
                    checkMobileNumberExist.id,
                    {
                        number,
                        countryId,
                        phoneCode,
                    },
                    isVerified
                );
                await this.userDomain.touchUpdatedByInTx(tx, userId);
                await this.activityLogDomain.recordInTx(
                    tx,
                    userId,
                    EnumActivityLogAction.userUpdateMobileNumber,
                    requestLog,
                    null
                );

                return row;
            });
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
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const checkExist =
            await this.userMobileNumberRepository.findOneMobileNumber(
                userId,
                mobileNumberId
            );
        if (!checkExist) {
            throw new UserMobileNumberNotFoundException();
        }

        try {
            return await this.databaseService.client.$transaction(async tx => {
                const row = await this.userMobileNumberRepository.deleteInTx(
                    tx,
                    mobileNumberId
                );
                await this.userDomain.touchUpdatedByInTx(tx, userId);
                await this.activityLogDomain.recordInTx(
                    tx,
                    userId,
                    EnumActivityLogAction.userDeleteMobileNumber,
                    requestLog,
                    null
                );

                return row;
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }
    }
}
