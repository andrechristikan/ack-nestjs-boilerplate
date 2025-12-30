import { EnumAppEnvironment } from '@app/enums/app.enum';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { EnumTermPolicyType } from '@prisma/client';

const termPolicyData: TermPolicyCreateRequestDto[] = [
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

export const migrationTermPolicyData: Record<
    EnumAppEnvironment,
    TermPolicyCreateRequestDto[]
> = {
    [EnumAppEnvironment.local]: termPolicyData,
    [EnumAppEnvironment.development]: termPolicyData,
    [EnumAppEnvironment.staging]: termPolicyData,
    [EnumAppEnvironment.production]: termPolicyData,
};
