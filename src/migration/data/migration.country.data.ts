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
    [ENUM_APP_ENVIRONMENT.local]: countryData,
    [ENUM_APP_ENVIRONMENT.development]: countryData,
    [ENUM_APP_ENVIRONMENT.staging]: countryData,
    [ENUM_APP_ENVIRONMENT.production]: countryData,
};
