import { HttpStatus } from '@nestjs/common';
import { z } from 'zod';
import { Prisma } from '@generated/prisma-client/client';
import type { IFeatureFlag } from '@modules/feature-flag/interfaces/feature-flag.interface';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';

/** @public */
export const FeatureFlagKeyPathMetaKey = 'FeatureFlagKeyPathMetaKey';

/** @public */
export const FeatureFlagCacheSchema = z.object({
    id: z.string(),
    key: z.string(),
    description: z.string(),
    isEnable: z.boolean(),
    rolloutPercent: z.number(),
    targetUserIds: z.array(z.string()),
    metadata: z
        .custom<Prisma.JsonValue>(value => z.json().safeParse(value).success)
        .nullable(),
    createdAt: z.coerce.date(),
    createdBy: z.string().nullable(),
    updatedAt: z.coerce.date(),
    updatedBy: z.string().nullable(),
}) satisfies z.ZodType<IFeatureFlag>;

/** @public */
export const FeatureFlagInclude = {
    targetUsers: { select: { userId: true } },
} satisfies Prisma.FeatureFlagInclude;

/** @public */
export const FeatureFlagAnonymousIdHeaderName = 'x-anonymous-id';

/** @public */
export const FeatureFlagProtectedDocErrors: IDocResponseEntry[] = [
    {
        httpStatus: HttpStatus.NOT_FOUND,
        statusCode: EnumFeatureFlagStatusCodeError.disabled,
        messagePath: 'featureFlag.error.disabled',
    },
    {
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        statusCode: EnumFeatureFlagStatusCodeError.notConfigured,
        messagePath: 'featureFlag.error.notConfigured',
    },
];
