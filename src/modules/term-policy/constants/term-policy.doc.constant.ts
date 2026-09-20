import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import { faker } from '@faker-js/faker';
import type { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';

/**
 * Swagger path parameter `termPolicyId`.
 * @public
 */
export const TermPolicyDocParamsId: ApiParamOptions[] = [
    {
        name: 'termPolicyId',
        allowEmptyValue: false,
        required: true,
        type: 'string',
        example: faker.string.uuid(),
    },
];

/**
 * Swagger path parameters `termPolicyId` and `language` of the term-policy content read.
 * @public
 */
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

/**
 * Swagger query parameters of the public term-policy list: `type`.
 * @public
 */
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

/**
 * Swagger query parameters of the admin term-policy list: `type` and `status`.
 * @public
 */
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
