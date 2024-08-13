import { faker } from '@faker-js/faker';
import { NotFoundException } from '@nestjs/common';
import { CountryParsePipe } from 'src/modules/country/pipes/country.parse.pipe';
import { CountryEntity } from 'src/modules/country/repository/entities/country.entity';

describe('CountryParsePipe', () => {
    let pipe: CountryParsePipe;

    const countryId = faker.string.uuid();

    const country: CountryEntity = {
        _id: countryId,
        name: 'Indonesia',
        alpha2Code: 'ID',
        alpha3Code: 'IDN',
        domain: 'id',
        fipsCode: 'ID',
        numericCode: '360',
        phoneCode: ['62'],
        continent: 'Asia',
        timeZone: 'Asia/Jakarta',
        createdAt: faker.date.recent(),
        updatedAt: faker.date.recent(),
    } as CountryEntity;

    const mockCountryService = {
        findOneById: jest.fn(),
    };

    beforeEach(async () => {
        pipe = new CountryParsePipe(mockCountryService as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(pipe).toBeDefined();
    });

    describe('transform', () => {
        it('Should throw a NotFoundException when country is not found', async () => {
            mockCountryService.findOneById.mockReturnValue(undefined);

            try {
                await pipe.transform('12345');
            } catch (err: any) {
                expect(err).toBeInstanceOf(NotFoundException);
            }
        });

        it('Should be successful calls', async () => {
            mockCountryService.findOneById.mockReturnValue(country);

            const result = await pipe.transform(country._id);

            expect(result).toBeDefined();
            expect(result).toBe(country);
        });
    });
});
