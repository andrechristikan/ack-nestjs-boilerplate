import { EnumAppEnvironment } from '@app/enums/app.enum';
import type { CountryRequestDto } from '@modules/country/dtos/request/country.request.dto';

const CountryData = [
    {
        name: 'Indonesia',
        alpha2Code: 'ID',
        alpha3Code: 'IDN',
        phoneCodes: ['62'],
        continent: 'Asia',
        timezone: 'Asia/Jakarta',
    },
];

export const MigrationCountryData: Record<
    EnumAppEnvironment,
    CountryRequestDto[]
> = {
    [EnumAppEnvironment.local]: CountryData,
    [EnumAppEnvironment.test]: CountryData,
    [EnumAppEnvironment.development]: CountryData,
    [EnumAppEnvironment.staging]: CountryData,
    [EnumAppEnvironment.production]: CountryData,
};
