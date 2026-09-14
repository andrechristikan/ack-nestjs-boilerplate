import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumPolicyAction, EnumPolicySubject } from '@generated/prisma-client';
import { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';

const policyData: {
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

export const migrationPolicyData: Record<
    EnumAppEnvironment,
    {
        role: string;
        policies: PolicyRequestDto[];
    }[]
> = {
    [EnumAppEnvironment.local]: policyData,
    [EnumAppEnvironment.development]: policyData,
    [EnumAppEnvironment.staging]: policyData,
    [EnumAppEnvironment.production]: policyData,
};
