import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumMfaPasskeyDeviceType } from '@generated/prisma-client/client';

/** @public */
export const MfaPasskeyResponseSchema = z.object({
    id: z.string().meta({
        description: 'Passkey id',
        example: faker.database.mongodbObjectId(),
    }),
    name: z.string().meta({
        description: 'Name the user gave the passkey',
        example: 'iPhone',
    }),
    deviceType: z.enum(EnumMfaPasskeyDeviceType).meta({
        description:
            'Whether the credential stays on one device or can sync across devices',
        example: EnumMfaPasskeyDeviceType.multiDevice,
    }),
    backedUp: z.boolean().meta({
        description: 'Whether the credential is backed up',
        example: true,
    }),
    createdAt: z.date().meta({
        description: 'When the passkey was registered',
        example: faker.date.past(),
    }),
    lastUsedAt: z.date().nullable().meta({
        description: 'Last time the passkey was used',
        example: faker.date.recent(),
    }),
});

/** @public */
export type MfaPasskeyResponseDto = z.infer<typeof MfaPasskeyResponseSchema>;
