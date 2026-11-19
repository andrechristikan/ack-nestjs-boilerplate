import { z } from 'zod';
import { faker } from '@faker-js/faker';
import { EnumNotificationChannel } from '@generated/prisma-client/client';

/** @public */
export const AnalyticNotificationDeliveryResponseSchema = z.object({
    channels: z
        .array(
            z.object({
                channel: z.enum(EnumNotificationChannel).meta({
                    description: 'Delivery channel',
                    example: EnumNotificationChannel.email,
                }),
                total: z.number().meta({
                    description:
                        'Deliveries created in the range: sent plus failed plus pending',
                    example: 6,
                }),
                sent: z.number().meta({
                    description: 'Deliveries with sentAt set',
                    example: faker.number.int({ min: 0, max: 3 }),
                }),
                failed: z.number().meta({
                    description:
                        'Deliveries processed with sentAt still null, a send in progress or retried included',
                    example: faker.number.int({ min: 0, max: 2 }),
                }),
                pending: z.number().meta({
                    description: 'Deliveries neither processed nor sent',
                    example: faker.number.int({ min: 0, max: 1 }),
                }),
            })
        )
        .meta({
            description: 'Delivery counts per channel, ordered by channel',
        }),
});

/** @public */
export type AnalyticNotificationDeliveryResponseDto = z.infer<
    typeof AnalyticNotificationDeliveryResponseSchema
>;
