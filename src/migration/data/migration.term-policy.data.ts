import { ENUM_APP_ENVIRONMENT } from '@app/enums/app.enum';
import { ENUM_MESSAGE_LANGUAGE } from '@common/message/enums/message.enum';
import { faker } from '@faker-js/faker';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { ENUM_TERM_POLICY_TYPE } from '@prisma/client';

const termPolicyData: TermPolicyCreateRequestDto[] = [
    {
        type: ENUM_TERM_POLICY_TYPE.cookie,
        version: 1,
        contents: [
            {
                key: faker.system.filePath(),
                language: ENUM_MESSAGE_LANGUAGE.EN,
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
                language: ENUM_MESSAGE_LANGUAGE.EN,
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
                language: ENUM_MESSAGE_LANGUAGE.EN,
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
                language: ENUM_MESSAGE_LANGUAGE.EN,
                size: faker.number.int({ min: 1000, max: 5000 }),
            },
        ],
    },
];

export const migrationTermPolicyData: Record<
    ENUM_APP_ENVIRONMENT,
    TermPolicyCreateRequestDto[]
> = {
    [ENUM_APP_ENVIRONMENT.LOCAL]: termPolicyData,
    [ENUM_APP_ENVIRONMENT.DEVELOPMENT]: termPolicyData,
    [ENUM_APP_ENVIRONMENT.STAGING]: termPolicyData,
    [ENUM_APP_ENVIRONMENT.PRODUCTION]: termPolicyData,
};
