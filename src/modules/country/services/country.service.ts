import { DatabaseService } from '@common/database/services/database.service';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';
import { ENUM_COUNTRY_STATUS_CODE_ERROR } from '@modules/country/enums/country.status-code.enum';
import { ICountryService } from '@modules/country/interfaces/country.service.interface';
import { CountryUtil } from '@modules/country/utils/country.util';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Country } from '@prisma/client';

@Injectable()
export class CountryService implements ICountryService {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly countryUtil: CountryUtil
    ) {}

    async getList(
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<CountryResponseDto>> {
        const { data, ...others } =
            await this.paginationService.offSet<Country>(
                this.databaseService.country,
                pagination
            );

        const countries: CountryResponseDto[] = this.countryUtil.mapList(data);

        return {
            data: countries,
            ...others,
        };
    }

    async getByAlpha2Code(alpha2Code: string): Promise<CountryResponseDto> {
        const country = await this.databaseService.country.findUnique({
            where: { alpha2Code },
        });
        if (!country) {
            throw new NotFoundException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'country.error.notFound',
            });
        }

        return this.countryUtil.mapOne(country);
    }
}
