import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import { ENUM_FILE_MIME } from 'src/common/file/enums/file.enum';
import { CountryGetResponseDto } from 'src/modules/country/dtos/response/country.get.response.dto';

describe('CountryGetResponseDto', () => {
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

        const dto = plainToInstance(CountryGetResponseDto, countryEntity);

        expect(dto).toBeInstanceOf(CountryGetResponseDto);
    });

    it('Should be successful calls with image', () => {
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
            image: {
                baseUrl: faker.internet.url(),
                bucket: faker.lorem.word(),
                completedUrl: faker.internet.url(),
                filename: faker.lorem.word(),
                mime: ENUM_FILE_MIME.CSV,
                path: faker.lorem.word(),
                pathWithFilename: faker.lorem.word(),
                size: 10,
                duration: 5,
            },
        };

        const dto = plainToInstance(CountryGetResponseDto, countryEntity);

        expect(dto instanceof CountryGetResponseDto).toBe(true);
    });
});
