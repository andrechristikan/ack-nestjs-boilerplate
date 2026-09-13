import { DatabaseService } from '@common/database/services/database.service';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Injectable } from '@nestjs/common';
import { Country, Prisma } from '@generated/prisma-client';

@Injectable()
export class CountryRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findWithPaginationCursor(
        pagination: IPaginationQueryCursorParams<Prisma.CountryWhereInput>
    ): Promise<IResponsePagingReturn<Country>> {
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
