import { DatabaseService } from '@common/database/services/database.service';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { ICountryRepository } from '@modules/country/interfaces/country.repository.interface';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client/client';
import type { Country } from '@generated/prisma-client/client';

@Injectable()
export class CountryRepository implements ICountryRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findWithPaginationCursor(
        pagination: IPaginationQueryCursorParams<Prisma.CountryWhereInput>
    ): Promise<IResponsePaginationReturn<Country>> {
        return this.paginationService.cursor<Country, Prisma.CountryWhereInput>(
            this.databaseService.client.country,
            pagination
        );
    }

    async existsById(id: string): Promise<boolean> {
        const count = await this.databaseService.client.country.count({
            where: { id },
        });

        return count > 0;
    }

    async findIdByAlpha2Code(alpha2Code: string): Promise<string | null> {
        const country = await this.databaseService.client.country.findUnique({
            where: { alpha2Code },
            select: { id: true },
        });

        return country?.id ?? null;
    }

    async findOneById(id: string): Promise<Country | null> {
        return this.databaseService.client.country.findUnique({
            where: { id },
        });
    }
}
