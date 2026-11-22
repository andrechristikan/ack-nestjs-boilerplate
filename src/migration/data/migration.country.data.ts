import { EnumAppEnvironment } from '@app/enums/app.enum';
import type { Prisma } from '@generated/prisma-client/client';
import type { IMigrationEnvironmentData } from '@migration/interfaces/migration.interface';

const CountryData = [
    {
        name: 'Indonesia',
        alpha2Code: 'ID',
        alpha3Code: 'IDN',
        phoneCode: ['62'],
        continent: 'Asia',
        timezone: 'Asia/Jakarta',
    },
];

export const MigrationCountryData: IMigrationEnvironmentData<
    Prisma.CountryCreateInput[]
> = {
    [EnumAppEnvironment.local]: CountryData,
    [EnumAppEnvironment.development]: CountryData,
    [EnumAppEnvironment.staging]: CountryData,
    [EnumAppEnvironment.production]: CountryData,
};
