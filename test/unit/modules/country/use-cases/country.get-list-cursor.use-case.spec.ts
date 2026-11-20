import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Country } from '@generated/prisma-client/client';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { CountryService } from '@modules/country/services/country.service';
import { CountryGetListCursorUseCase } from '@modules/country/use-cases/country.get-list-cursor.use-case';

describe('CountryGetListCursorUseCase', () => {
    const countryService: MockProxy<CountryService> = mock<CountryService>();
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

    const pagination = {
        fingerprint: 'c213a30277545cd6',
        limit: 20,
        orderBy: [{ createdAt: 'desc' }],
    };

    let useCase: CountryGetListCursorUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CountryGetListCursorUseCase,
                { provide: CountryService, useValue: countryService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
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
        it('parses the cursor query and hands the pagination params it produces to the domain', async () => {
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
            expect(countryService.getListCursor).toHaveBeenCalledWith(
                pagination
            );
        });

        it('merges the parsed store patch into the pagination store', async () => {
            countryService.getListCursor.mockResolvedValue({
                type: EnumPaginationType.cursor as const,
                perPage: 20,
                hasNext: false,
                data: [],
            });

            await useCase.execute({ perPage: 20 });

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    perPage: 20,
                    orderBy: 'latest',
                    availableSearch: [
                        'name',
                        'alpha2Code',
                        'alpha3Code',
                        'continent',
                    ],
                    availableOrderBy: ['latest', 'name', 'alpha2Code'],
                }
            );
        });
    });
});
