import { z } from 'zod';
import { faker } from '@faker-js/faker';

/**
 * Shapes one backup code regeneration made from a new device.
 * @public
 */
export const AnalyticBackupCodeNewDeviceResponseSchema = z.object({
    userId: z.string().meta({
        description: 'Identifier of the user who regenerated the backup codes',
        example: faker.database.mongodbObjectId(),
    }),
    regeneratedAt: z.date().meta({
        description: 'When the backup codes were regenerated',
        example: faker.date.recent(),
    }),
});

/**
 * One backup code regeneration made from a new device.
 * @public
 */
export type AnalyticBackupCodeNewDeviceResponseDto = z.infer<
    typeof AnalyticBackupCodeNewDeviceResponseSchema
>;
