import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { CountryRequestDto } from '@modules/country/dtos/request/country.request.dto';

const countryData = [
    {
        name: 'Indonesia',
        alpha2Code: 'ID',
        alpha3Code: 'IDN',
        phoneCode: ['62'],
        continent: 'Asia',
        timezone: 'Asia/Jakarta',
    },
];

export const migrationCountryData: Record<
    ENUM_APP_ENVIRONMENT,
    CountryRequestDto[]
> = {
    [ENUM_APP_ENVIRONMENT.LOCAL]: countryData,
    [ENUM_APP_ENVIRONMENT.DEVELOPMENT]: countryData,
    [ENUM_APP_ENVIRONMENT.STAGING]: countryData,
    [ENUM_APP_ENVIRONMENT.PRODUCTION]: countryData,
};
