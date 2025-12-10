import { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';
import { faker } from '@faker-js/faker';
import { EnumTermPolicyStatus, EnumTermPolicyType } from '@prisma/client';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';

export const TermPolicyDocParamsId: ApiParamOptions[] = [
    {
        name: 'termPolicyId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.database.mongodbObjectId(),
    },
];

export const TermPolicyDocParamsGetContent: ApiParamOptions[] = [
    ...TermPolicyDocParamsId,
    {
        name: 'language',
        allowEmptyValue: false,
        enum: Object.values(EnumMessageLanguage),
        required: true,
        type: 'string',
        example: EnumMessageLanguage.en,
    },
];

export const TermPolicyListPublicDocQuery: ApiQueryOptions[] = [
    {
        name: 'type',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(EnumTermPolicyType).join(','),
        description: "value with ',' delimiter",
    },
];

export const TermPolicyListAdminDocQuery: ApiQueryOptions[] = [
    ...TermPolicyListPublicDocQuery,
    {
        name: 'status',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: Object.values(EnumTermPolicyStatus).join(','),
        description: "value with ',' delimiter",
    },
];
