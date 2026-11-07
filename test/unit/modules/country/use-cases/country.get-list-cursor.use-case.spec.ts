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
    CountryPublicListCursorScope,
} from '@modules/country/constants/country.list.constant';
import { CountryService } from '@modules/country/services/country.service';
import { CountryGetListCursorUseCase } from '@modules/country/use-cases/country.get-list-cursor.use-case';

describe('CountryGetListCursorUseCase', () => {
    const countryService: MockProxy<CountryService> = mock<CountryService>();
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
        fingerprint: 'aaaaaaaaaaaaaaaa',
        limit: 20,
        orderBy: [],
    };

    let useCase: CountryGetListCursorUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        paginationQueryUtil.cursor.mockReturnValue({
            params: pagination,
            storePatch: {},
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CountryGetListCursorUseCase,
                { provide: CountryService, useValue: countryService },
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

        useCase = module.get(CountryGetListCursorUseCase);
    });

    describe('execute', () => {
        it('parses the cursor query and hands the pagination params to the domain', async () => {
            const query = { perPage: 20 };
            const page = {
                type: EnumPaginationType.cursor as const,
                perPage: 20,
                hasNext: false,
                data: [country],
            };
            countryService.getListCursor.mockResolvedValue(page);

            const result = await useCase.execute(query);

            expect(result).toBe(page);
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                scope: CountryPublicListCursorScope,
                availableSearch: CountryDefaultAvailableSearch,
                availableOrderBy: CountryDefaultAvailableOrderBy,
            });
            expect(countryService.getListCursor).toHaveBeenCalledWith(
                pagination
            );
        });

        it('merges the parsed store patch into the pagination store', async () => {
            const storePatch = { perPage: 20 };
            paginationQueryUtil.cursor.mockReturnValue({
                params: pagination,
                storePatch,
            });
            countryService.getListCursor.mockResolvedValue({
                type: EnumPaginationType.cursor as const,
                perPage: 20,
                hasNext: false,
                data: [],
            });

            await useCase.execute({ perPage: 20 });

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                storePatch
            );
        });
    });
});
