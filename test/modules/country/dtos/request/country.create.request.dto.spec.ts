import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CountryCreateRequestDto } from 'src/modules/country/dtos/request/country.create.request.dto';

describe('CountryCreateRequestDto', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Should be successful calls', () => {
        const dto = new CountryCreateRequestDto();
        dto.name = 'Indonesia';
        dto.alpha2Code = 'ID';
        dto.alpha3Code = 'IDN';
        dto.domain = 'id';
        dto.fipsCode = 'ID';
        dto.numericCode = '360';
        dto.phoneCode = ['62'];
        dto.continent = 'Asia';
        dto.timeZone = 'Asia/Jakarta';

        expect(dto).toBeInstanceOf(CountryCreateRequestDto);
    });

    it('Should throw an error when request not match with validation', async () => {
        const dto = new CountryCreateRequestDto();
        dto.alpha2Code = 'ID';
        dto.alpha3Code = 'IDN';
        dto.domain = 'id';
        dto.fipsCode = 'ID';
        dto.numericCode = '360';
        dto.phoneCode = ['62'];
        dto.continent = 'Asia';
        dto.timeZone = 'Asia/Jakarta';

        const instance = plainToInstance(CountryCreateRequestDto, dto);
        const errors = await validate(instance);

        expect(errors.length).toBe(1);
    });
});
