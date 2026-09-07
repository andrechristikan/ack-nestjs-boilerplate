import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Country, Prisma } from '@generated/prisma-client';

export interface ICountryService {
    getListCursor(
        pagination: IPaginationQueryCursorParams<Prisma.CountryWhereInput>
    ): Promise<IResponsePagingReturn<Country>>;
    existById(countryId: string): Promise<{ id: string } | null>;
    existByAlpha2Code(alpha2Code: string): Promise<{ id: string } | null>;
    getOne(countryId: string): Promise<Country>;
}
