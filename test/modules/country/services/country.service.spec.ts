import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CountryRepository } from '@modules/country/repositories/country.repository';
import { CountryService } from '@modules/country/services/country.service';

describe('CountryService', () => {
    const findWithPaginationCursor =
        vi.fn<CountryRepository['findWithPaginationCursor']>();

    let service: CountryService;

    beforeEach(async () => {
        vi.resetAllMocks();
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                CountryService,
                {
                    provide: CountryRepository,
                    useValue: { findWithPaginationCursor },
                },
            ],
        }).compile();
        service = moduleRef.get(CountryService);
    });

    it('delegates cursor pagination to the repository', async () => {
        const pagination: Parameters<
            CountryRepository['findWithPaginationCursor']
        >[0] = { limit: 10 };
        const result: Awaited<
            ReturnType<CountryRepository['findWithPaginationCursor']>
        > = {
            type: EnumPaginationType.cursor,
            perPage: 10,
            hasNext: false,
            data: [],
        };
        findWithPaginationCursor.mockResolvedValue(result);

        await expect(service.getListCursor(pagination)).resolves.toBe(result);
        expect(findWithPaginationCursor).toHaveBeenCalledWith(pagination);
    });
});
