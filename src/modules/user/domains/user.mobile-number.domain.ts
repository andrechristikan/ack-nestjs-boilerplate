import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { UserMobileNumberExistException } from '@modules/user/exceptions/user.mobile-number-exist.exception';
import { UserMobileNumberInvalidException } from '@modules/user/exceptions/user.mobile-number-invalid.exception';
import { UserMobileNumberNotFoundException } from '@modules/user/exceptions/user.mobile-number-not-found.exception';
import type {
    IUserMobileNumber,
    IUserMobileNumberInput,
    IUserMobileNumberSummary,
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
        private readonly databaseService: DatabaseService,
        private readonly userUtil: UserUtil
    ) {}

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
        userId: string,
        { number, countryId, phoneCode }: IUserMobileNumberInput,
        countryPhoneCodes: string[],
        isDuplicate: boolean
    ): Promise<IUserMobileNumber> {
        const checkValidMobileNumber = this.userUtil.checkMobileNumber(
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

            return row;
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
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
        userId: string,
        current: IUserMobileNumberSummary,
        { number, countryId, phoneCode }: IUserMobileNumberInput,
        countryPhoneCodes: string[],
        isDuplicate: boolean
    ): Promise<IUserMobileNumber> {
        if (isDuplicate) {
            throw new UserMobileNumberExistException();
        }

        const checkValidMobileNumber = this.userUtil.checkMobileNumber(
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
            const row = await this.databaseService.withTransaction(async tx => {
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
                await this.userDomain.touchUpdatedByInTx(tx, userId);

                return mobileNumber;
            });

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
        // Sequential by design: gate before the work it guards
        await this.getOneMobileNumber(userId, mobileNumberId);

        try {
            const row = await this.databaseService.withTransaction(async tx => {
                const mobileNumber =
                    await this.userMobileNumberRepository.deleteInTx(
                        tx,
                        mobileNumberId
                    );
                await this.userDomain.touchUpdatedByInTx(tx, userId);

                return mobileNumber;
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
