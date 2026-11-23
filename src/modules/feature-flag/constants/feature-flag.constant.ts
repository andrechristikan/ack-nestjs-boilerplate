import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@generated/prisma-client/client';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';

/** @public */
export const FeatureFlagAnonymousIdRegex = /^[a-zA-Z0-9-_]+$/;

/** @public */
export const FeatureFlagKeyPathMetaKey = 'FeatureFlagKeyPathMetaKey';

/** @public */
export const FeatureFlagWithTargetsInclude = {
    targets: { select: { userId: true } },
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

/** @public */
export const FeatureFlagMetadataKeyRegex = /^[a-z][a-zA-Z0-9]*$/;
