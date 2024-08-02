import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import { CountryListResponseDto } from 'src/modules/country/dtos/response/country.list.response.dto';

describe('CountryListResponseDto', () => {
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

        const dto = plainToInstance(CountryListResponseDto, countryEntity);

        expect(dto).toBeInstanceOf(CountryListResponseDto);
        expect(dto.alpha3Code).toBeUndefined();
        expect(dto.fipsCode).toBeUndefined();
        expect(dto.continent).toBeUndefined();
        expect(dto.domain).toBeUndefined();
        expect(dto.timeZone).toBeUndefined();
        expect(dto.numericCode).toBeUndefined();
    });
});
