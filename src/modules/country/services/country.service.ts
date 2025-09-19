import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';
import { ICountryService } from '@modules/country/interfaces/country.service.interface';
import { CountryRepository } from '@modules/country/repositories/country.repository';
import { CountryUtil } from '@modules/country/utils/country.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CountryService implements ICountryService {
    constructor(
        private readonly countryRepository: CountryRepository,
        private readonly countryUtil: CountryUtil
    ) {}

    async getList(
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<CountryResponseDto>> {
        const { data, ...others } =
            await this.countryRepository.findWithPagination(pagination);
        const countries: CountryResponseDto[] = this.countryUtil.mapList(data);

        return {
            data: countries,
            ...others,
        };
    }
}
