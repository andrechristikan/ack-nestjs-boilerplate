import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Country } from '@generated/prisma-client/client';

export interface ICountryRepository {
    findWithPaginationCursor(
        pagination: IPaginationQueryCursorParams<Prisma.CountryWhereInput>
    ): Promise<IResponsePaginationReturn<Country>>;
    existsById(id: string): Promise<boolean>;
    findIdByAlpha2Code(alpha2Code: string): Promise<string | null>;
    findOneById(id: string): Promise<Country | null>;
}
