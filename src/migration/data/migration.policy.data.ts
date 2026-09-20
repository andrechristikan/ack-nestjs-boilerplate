import { EnumAppEnvironment } from '@app/enums/app.enum';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';

const PolicyData: {
    role: string;
    policies: PolicyRequestDto[];
}[] = [
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

export const MigrationPolicyData: Record<
    EnumAppEnvironment,
    {
        role: string;
        policies: PolicyRequestDto[];
    }[]
> = {
    [EnumAppEnvironment.local]: PolicyData,
    [EnumAppEnvironment.test]: PolicyData,
    [EnumAppEnvironment.development]: PolicyData,
    [EnumAppEnvironment.staging]: PolicyData,
    [EnumAppEnvironment.production]: PolicyData,
};
