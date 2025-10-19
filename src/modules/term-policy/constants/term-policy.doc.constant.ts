import { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';
import { faker } from '@faker-js/faker';
import { ENUM_TERM_POLICY_STATUS, ENUM_TERM_POLICY_TYPE } from '@prisma/client';

export const TermPolicyDocParamsId: ApiParamOptions[] = [
    {
        name: 'termPolicyId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];

export const TermPolicyListPublicDocQuery: ApiQueryOptions[] = [
    {
        name: 'type',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        enum: Object.values(ENUM_TERM_POLICY_TYPE),
        example: Object.values(ENUM_TERM_POLICY_TYPE).join(','),
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
        enum: Object.values(ENUM_TERM_POLICY_STATUS),
        example: Object.values(ENUM_TERM_POLICY_STATUS).join(','),
        description: "value with ',' delimiter",
    },
];
