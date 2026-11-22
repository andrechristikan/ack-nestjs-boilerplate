import { EnumAppEnvironment } from '@app/enums/app.enum';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type {
    IMigrationEnvironmentData,
    IMigrationPolicyData,
} from '@migration/interfaces/migration.interface';

const PolicyData: IMigrationPolicyData[] = [
    {
        role: 'superadmin',
        policies: [],
    },
    {
        role: 'admin',
        policies: Object.values(EnumPolicySubject).map(subject => ({
            subject,
            action: Object.values(EnumPolicyAction),
        })),
    },
    {
        role: 'user',
        policies: [],
    },
];

export const MigrationPolicyData: IMigrationEnvironmentData<
    IMigrationPolicyData[]
> = {
    [EnumAppEnvironment.local]: PolicyData,
    [EnumAppEnvironment.development]: PolicyData,
    [EnumAppEnvironment.staging]: PolicyData,
    [EnumAppEnvironment.production]: PolicyData,
};
