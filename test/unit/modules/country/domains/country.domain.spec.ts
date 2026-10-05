import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Country } from '@generated/prisma-client/client';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { CountryRepository } from '@modules/country/repositories/country.repository';
import { EnumCountryStatusCodeError } from '@modules/country/enums/country.status-code.enum';

describe('CountryDomain', () => {
    const countryRepository: MockProxy<CountryRepository> =
        mock<CountryRepository>();

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

    let domain: CountryDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CountryDomain,
                { provide: CountryRepository, useValue: countryRepository },
            ],
        }).compile();

        domain = module.get(CountryDomain);
    });

    describe('getListCursor', () => {
        it('returns the paginated cursor result from the repository', async () => {
            const pagination = {
                limit: 20,
                orderBy: [],
            };
            const page = {
                type: EnumPaginationType.cursor as const,
                perPage: 20,
                hasNext: false,
                data: [country],
            };
            countryRepository.findWithPaginationCursor.mockResolvedValue(page);

            const result = await domain.getListCursor(pagination);

            expect(result).toBe(page);
            expect(
                countryRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith(pagination);
        });
    });

    describe('existsById', () => {
        it('returns true when the repository reports the country exists', async () => {
            countryRepository.existsById.mockResolvedValue(true);

            const result = await domain.existsById('country-1');

            expect(result).toBe(true);
            expect(countryRepository.existsById).toHaveBeenCalledWith(
                'country-1'
            );
        });

        it('returns false when the repository reports the country does not exist', async () => {
            countryRepository.existsById.mockResolvedValue(false);

            const result = await domain.existsById('country-1');

            expect(result).toBe(false);
        });
    });

    describe('getIdByAlpha2Code', () => {
        it('returns the country id resolved by alpha-2 code', async () => {
            countryRepository.findIdByAlpha2Code.mockResolvedValue('country-1');

            const result = await domain.getIdByAlpha2Code('ID');

            expect(result).toBe('country-1');
            expect(countryRepository.findIdByAlpha2Code).toHaveBeenCalledWith(
                'ID'
            );
        });

        it('returns null when no country matches the alpha-2 code', async () => {
            countryRepository.findIdByAlpha2Code.mockResolvedValue(null);

            const result = await domain.getIdByAlpha2Code('ZZ');

            expect(result).toBeNull();
        });
    });

    describe('getOne', () => {
        it('returns the country resolved by id', async () => {
            countryRepository.findOneById.mockResolvedValue(country);

            const result = await domain.getOne('country-1');

            expect(result).toBe(country);
            expect(countryRepository.findOneById).toHaveBeenCalledWith(
                'country-1'
            );
        });

        it('throws CountryNotFoundException when no country matches the id', async () => {
            countryRepository.findOneById.mockResolvedValue(null);

            await expect(domain.getOne('country-1')).rejects.toMatchObject({
                constructor: CountryNotFoundException,
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
                statusCodeKey:
                    EnumCountryStatusCodeError[
                        EnumCountryStatusCodeError.notFound
                    ],
                messagePath: 'country.error.notFound',
            });
        });
    });
});
