import { EnumAppEnvironment } from '@app/enums/app.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { faker } from '@faker-js/faker';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { EnumTermPolicyType } from '@prisma/client';

const termPolicyData: TermPolicyCreateRequestDto[] = [
    {
        type: EnumTermPolicyType.cookies,
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
        type: EnumTermPolicyType.marketing,
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
        type: EnumTermPolicyType.privacy,
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
        type: EnumTermPolicyType.termsOfService,
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
