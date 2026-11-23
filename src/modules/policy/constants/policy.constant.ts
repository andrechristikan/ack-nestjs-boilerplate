import { HttpStatus } from '@nestjs/common';
import { z } from 'zod';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { Prisma } from '@generated/prisma-client/client';
import { EnumPolicyStatusCodeError } from '@modules/policy/enums/policy.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type { IPolicyRule } from '@modules/policy/interfaces/policy.interface';

/** @public */
export const PolicyRuleSelect = {
    subject: true,
    action: true,
    conditions: true,
    inverted: true,
    reason: true,
} satisfies Prisma.PolicySelect;

/** @public */
export const PolicyRequiredMetaKey = 'PolicyRequiredMetaKey';

/** @public */
export const PolicyContextStoreKey = 'PolicyContextStoreKey';

/** @public */
export const PolicyNonModelSubjects: readonly EnumPolicySubject[] = [
    EnumPolicySubject.all,
    EnumPolicySubject.Analytic,
];

const PolicyJsonSchema: z.ZodType<Prisma.JsonValue> = z.lazy(() =>
    z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        z.array(PolicyJsonSchema),
        z.record(z.string(), PolicyJsonSchema),
    ])
);

export const PolicyRulesCacheSchema = z.array(
    z.object({
        subject: z.enum(EnumPolicySubject),
        action: z.array(z.enum(EnumPolicyAction)),
        conditions: PolicyJsonSchema.nullable(),
        inverted: z.boolean(),
        reason: z.string().nullable(),
    })
) satisfies z.ZodType<IPolicyRule[]>;

/** @public */
export const PolicyProtectedDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumPolicyStatusCodeError.forbidden,
        messagePath: 'policy.error.forbidden',
    },
    {
        httpStatus: HttpStatus.UNAUTHORIZED,
        statusCode: EnumUserStatusCodeError.guardMissing,
        messagePath: 'user.error.guardMissing',
    },
    {
        httpStatus: HttpStatus.FORBIDDEN,
        statusCode: EnumPolicyStatusCodeError.guardMissing,
        messagePath: 'policy.error.guardMissing',
    },
];

/** @public */
export const PolicyConditionsMaxLength = 4096;
