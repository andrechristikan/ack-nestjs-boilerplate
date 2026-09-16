import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Country, Prisma } from '@generated/prisma-client';

export interface ICountryRepository {
    findWithPaginationCursor(
        pagination: IPaginationQueryCursorParams<Prisma.CountryWhereInput>
    ): Promise<IResponsePagingReturn<Country>>;
    existsById(id: string): Promise<boolean>;
    findIdByAlpha2Code(alpha2Code: string): Promise<string | null>;
    findOneById(id: string): Promise<Country | null>;
}
