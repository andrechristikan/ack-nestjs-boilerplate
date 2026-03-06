import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client';
import { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';

export interface ICountryService {
    getList(
        pagination: IPaginationQueryOffsetParams<
            Prisma.CountrySelect,
            Prisma.CountryWhereInput
        >
    ): Promise<IResponsePagingReturn<CountryResponseDto>>;
}
