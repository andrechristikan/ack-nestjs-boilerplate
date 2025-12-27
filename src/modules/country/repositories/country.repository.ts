import { DatabaseService } from '@common/database/services/database.service';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Injectable } from '@nestjs/common';
import { Country } from '@prisma/client';

@Injectable()
export class CountryRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findWithPagination(
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<Country>> {
        return this.paginationService.offset<Country>(
            this.databaseService.country,
            pagination
        );
    }

    async existById(id: string): Promise<{ id: string } | null> {
        return this.databaseService.country.findUnique({
            where: { id },
            select: { id: true },
        });
    }

    async existByAlpha2Code(
        alpha2Code: string
    ): Promise<{ id: string } | null> {
        return this.databaseService.country.findUnique({
            where: { alpha2Code },
            select: { id: true },
        });
    }

    async findOneById(id: string): Promise<Country | null> {
        return this.databaseService.country.findUnique({
            where: { id },
        });
    }
}
