import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Country, Prisma } from '@generated/prisma-client/client';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    CountryDefaultAvailableOrderBy,
    CountryDefaultAvailableSearch,
} from '@modules/country/constants/country.list.constant';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { CountryHttpService } from '@modules/country/services/country.http.service';

describe('CountryHttpService', () => {
    const countryDomain: MockProxy<CountryDomain> = mock<CountryDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const country: Country = {
        id: 'country-1',
        name: 'Indonesia',
        alpha2Code: 'ID',
        alpha3Code: 'IDN',
        phoneCode: ['62'],
        continent: 'Asia',
        timezone: 'Asia/Jakarta',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const pagination: IPaginationQueryCursorParams<Prisma.CountryWhereInput> = {
        limit: 20,
        orderBy: [],
    };

    let service: CountryHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

        paginationQueryUtil.cursor.mockReturnValue({
            params: pagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CountryHttpService,
                { provide: CountryDomain, useValue: countryDomain },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        service = module.get(CountryHttpService);
    });

    describe('getListCursor', () => {
        it('parses the cursor query and hands the pagination params to the domain', async () => {
            const query = { perPage: 20 };
            const page = {
                type: EnumPaginationType.cursor as const,
                perPage: 20,
                hasNext: false,
                data: [country],
            };
            countryDomain.getListCursor.mockResolvedValue(page);

            const result = await service.getListCursor(query);

            expect(result).toBe(page);
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableSearch: CountryDefaultAvailableSearch,
                availableOrderBy: CountryDefaultAvailableOrderBy,
            });
            expect(countryDomain.getListCursor).toHaveBeenCalledWith(
                pagination
            );
        });

        it('merges the parsed store patch into the pagination store', async () => {
            const storePatch = { perPage: 20 };
            paginationQueryUtil.cursor.mockReturnValue({
                params: pagination,
                storePatch,
            });
            countryDomain.getListCursor.mockResolvedValue({
                type: EnumPaginationType.cursor as const,
                perPage: 20,
                hasNext: false,
                data: [],
            });

            await service.getListCursor({ perPage: 20 });

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                storePatch
            );
        });
    });
});
