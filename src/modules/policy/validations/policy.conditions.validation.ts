import { z } from 'zod';
import type { Prisma } from '@generated/prisma-client/client';
import { PolicyConditionsMaxLength } from '@modules/policy/constants/policy.constant';

/** @public */
export const PolicyConditionsRequestSchema = z
    .custom<Prisma.JsonObject>(
        value =>
            value !== null &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            JSON.stringify(value).length <= PolicyConditionsMaxLength
    )
    .meta({
        type: 'object',
        description:
            'Prisma where-input the rule applies to; nested and relation filters allowed; `${userId}`, `${workspaceId}`, and `${projectId}` stand for the caller, workspace, and project',
        example: { workspaceId: '${workspaceId}' },
    });
