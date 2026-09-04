import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';
import { ICountryHttpService } from '@modules/country/interfaces/country.http.service.interface';
import { CountryService } from '@modules/country/services/country.service';
import { CountryUtil } from '@modules/country/utils/country.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CountryHttpService implements ICountryHttpService {
    constructor(
        private readonly countryService: CountryService,
        private readonly countryUtil: CountryUtil
    ) {}

    async getListCursor(
        pagination: IPaginationQueryCursorParams<Prisma.CountryWhereInput>
    ): Promise<IResponsePagingReturn<CountryResponseDto>> {
        const { data, ...others } =
            await this.countryService.getListCursor(pagination);
        const countries: CountryResponseDto[] = this.countryUtil.mapList(data);

        return {
            data: countries,
            ...others,
        };
    }
}
