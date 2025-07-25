import { ApiParamOptions } from '@nestjs/swagger';
import {
    ENUM_TERM_POLICY_STATUS,
    ENUM_TERM_POLICY_TYPE,
} from '@modules/term-policy/enums/term-policy.enum';
import { faker } from '@faker-js/faker';

export const TermPolicyDocParamsId: ApiParamOptions = {
    name: 'termPolicy',
    allowEmptyValue: false,
    required: true,
    type: 'string',
    example: faker.string.uuid(),
};

export const TermPolicyListPublicDocQuery: ApiParamOptions[] = [
    {
        name: 'type',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        enum: Object.values(ENUM_TERM_POLICY_TYPE),
        example: Object.values(ENUM_TERM_POLICY_TYPE).join(','),
        description: "value with ',' delimiter",
    },
    {
        name: 'country',
        allowEmptyValue: true,
        required: false,
        type: 'string',
        example: faker.string.uuid(),
    },
];

export const TermPolicyListAdminDocQuery: ApiParamOptions[] = [
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
