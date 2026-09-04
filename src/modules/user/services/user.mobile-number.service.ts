import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { CountryRepository } from '@modules/country/repositories/country.repository';
import { UserMobileNumberExistException } from '@modules/user/exceptions/user.mobile-number-exist.exception';
import { UserMobileNumberInvalidException } from '@modules/user/exceptions/user.mobile-number-invalid.exception';
import { UserMobileNumberNotFoundException } from '@modules/user/exceptions/user.mobile-number-not-found.exception';
import {
    IUserMobileNumber,
    IUserMobileNumberInput,
} from '@modules/user/interfaces/user.interface';
import { IUserMobileNumberService } from '@modules/user/interfaces/user.mobile-number.service.interface';
import { UserMobileNumberRepository } from '@modules/user/repositories/user.mobile-number.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserMobileNumberService implements IUserMobileNumberService {
    constructor(
        private readonly userMobileNumberRepository: UserMobileNumberRepository,
        private readonly countryRepository: CountryRepository,
        private readonly userUtil: UserUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async addMobileNumber(
        userId: string,
        { number, countryId, phoneCode }: IUserMobileNumberInput
    ): Promise<IUserMobileNumber> {
        const requestLog: IRequestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const checkCountry =
            await this.countryRepository.findOneById(countryId);
        if (!checkCountry) {
            throw new CountryNotFoundException();
        }

        const [checkValidMobileNumber, checkExist] = await Promise.all([
            this.userUtil.checkMobileNumber(checkCountry.phoneCode, phoneCode),
            this.userMobileNumberRepository.existMobileNumber(userId, {
                number,
                countryId: checkCountry.id,
                phoneCode,
            }),
        ]);
        if (!checkValidMobileNumber) {
            throw new UserMobileNumberInvalidException();
        } else if (checkExist) {
            throw new UserMobileNumberExistException();
        }

        try {
            return await this.userMobileNumberRepository.addMobileNumber(
                userId,
                {
                    number,
                    countryId,
                    phoneCode,
                },
                requestLog
            );
        } catch (err: unknown) {
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

        const [checkMobileNumberExist, checkCountry] = await Promise.all([
            this.userMobileNumberRepository.findOneMobileNumber(
                userId,
                mobileNumberId
            ),
            this.countryRepository.findOneById(countryId),
        ]);
        if (!checkMobileNumberExist) {
            throw new UserMobileNumberNotFoundException();
        } else if (!checkCountry) {
            throw new CountryNotFoundException();
        }

        const checkExist =
            await this.userMobileNumberRepository.existMobileNumber(
                userId,
                { number, countryId, phoneCode },
                mobileNumberId
            );
        if (checkExist) {
            throw new UserMobileNumberExistException();
        }

        const checkValidMobileNumber = this.userUtil.checkMobileNumber(
            checkCountry.phoneCode,
            phoneCode
        );
        if (!checkValidMobileNumber) {
            throw new UserMobileNumberInvalidException();
        }

        try {
            return await this.userMobileNumberRepository.updateMobileNumber(
                userId,
                checkMobileNumberExist,
                {
                    number,
                    countryId,
                    phoneCode,
                },
                requestLog
            );
        } catch (err: unknown) {
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
            return await this.userMobileNumberRepository.deleteMobileNumber(
                userId,
                mobileNumberId,
                requestLog
            );
        } catch (err: unknown) {
            throw new AppUnknownException(err);
        }
    }
}
