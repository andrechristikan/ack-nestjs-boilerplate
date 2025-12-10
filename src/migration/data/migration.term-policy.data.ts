import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { faker } from '@faker-js/faker';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { ENUM_TERM_POLICY_TYPE } from '@prisma/client';

const termPolicyData: TermPolicyCreateRequestDto[] = [
    {
        type: ENUM_TERM_POLICY_TYPE.cookies,
        version: 1,
        contents: [
            {
                key: faker.system.filePath(),
                language: EnumMessageLanguage.en,
                size: faker.number.int({ min: 1000, max: 5000 }),
            },
        ],
    },
    {
        type: ENUM_TERM_POLICY_TYPE.marketing,
        version: 1,
        contents: [
            {
                key: faker.system.filePath(),
                language: EnumMessageLanguage.en,
                size: faker.number.int({ min: 1000, max: 5000 }),
            },
        ],
    },
    {
        type: ENUM_TERM_POLICY_TYPE.privacy,
        version: 1,
        contents: [
            {
                key: faker.system.filePath(),
                language: EnumMessageLanguage.en,
                size: faker.number.int({ min: 1000, max: 5000 }),
            },
        ],
    },
    {
        type: ENUM_TERM_POLICY_TYPE.termsOfService,
        version: 1,
        contents: [
            {
                key: faker.system.filePath(),
                language: EnumMessageLanguage.en,
                size: faker.number.int({ min: 1000, max: 5000 }),
            },
        ],
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
