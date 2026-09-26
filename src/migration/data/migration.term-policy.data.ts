import { EnumAppEnvironment } from '@app/enums/app.enum';
import type { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { EnumTermPolicyType } from '@generated/prisma-client/client';

const TermPolicyData: TermPolicyCreateRequestDto[] = [
    {
        type: EnumTermPolicyType.cookies,
        version: 1,
        contents: [],
    },
    {
        type: EnumTermPolicyType.marketing,
        version: 1,
        contents: [],
    },
    {
        type: EnumTermPolicyType.privacy,
        version: 1,
        contents: [],
    },
    {
        type: EnumTermPolicyType.termsOfService,
        version: 1,
        contents: [],
    },
];

export const MigrationTermPolicyData: Record<
    EnumAppEnvironment,
    TermPolicyCreateRequestDto[]
> = {
    [EnumAppEnvironment.local]: TermPolicyData,
    [EnumAppEnvironment.test]: TermPolicyData,
    [EnumAppEnvironment.development]: TermPolicyData,
    [EnumAppEnvironment.staging]: TermPolicyData,
    [EnumAppEnvironment.production]: TermPolicyData,
};
