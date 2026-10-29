import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import type { IMigrationTermPolicyData } from '@migration/interfaces/migration.interface';

const TermPolicyData: IMigrationTermPolicyData[] = [
    {
        type: EnumTermPolicyType.termsOfService,
        version: 1,
    },
    {
        type: EnumTermPolicyType.privacy,
        version: 1,
    },
    {
        type: EnumTermPolicyType.cookies,
        version: 1,
    },
    {
        type: EnumTermPolicyType.marketing,
        version: 1,
    },
];

export const MigrationTermPolicyData: Record<
    EnumAppEnvironment,
    IMigrationTermPolicyData[]
> = {
    [EnumAppEnvironment.local]: TermPolicyData,
    [EnumAppEnvironment.development]: TermPolicyData,
    [EnumAppEnvironment.staging]: TermPolicyData,
    [EnumAppEnvironment.production]: TermPolicyData,
};
