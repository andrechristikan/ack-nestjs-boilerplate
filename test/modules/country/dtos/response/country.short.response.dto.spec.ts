import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import { CountryShortResponseDto } from 'src/modules/country/dtos/response/country.short.response.dto';

describe('CountryShortResponseDto', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Should be successful calls', () => {
        const countryEntity = {
            _id: faker.string.uuid(),
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
        };

        const dto = plainToInstance(CountryShortResponseDto, countryEntity);

        expect(dto).toBeInstanceOf(CountryShortResponseDto);
        expect(dto.alpha3Code).toBeUndefined();
        expect(dto.fipsCode).toBeUndefined();
        expect(dto.continent).toBeUndefined();
        expect(dto.domain).toBeUndefined();
        expect(dto.timeZone).toBeUndefined();
        expect(dto.numericCode).toBeUndefined();
        expect(dto.createdAt).toBeUndefined();
        expect(dto.updatedAt).toBeUndefined();
    });
});
