import { EnumAppEnvironment } from '@app/enums/app.enum';
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
    EnumAppEnvironment,
    CountryRequestDto[]
> = {
    [EnumAppEnvironment.local]: countryData,
    [EnumAppEnvironment.development]: countryData,
    [EnumAppEnvironment.staging]: countryData,
    [EnumAppEnvironment.production]: countryData,
};
