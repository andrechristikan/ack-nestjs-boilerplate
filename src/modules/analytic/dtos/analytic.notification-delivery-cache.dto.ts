import { z } from 'zod';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import type { IAnalyticNotificationDeliveryResult } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticNotificationDeliveryCacheSchema = z.object({
    channels: z.array(
        z.object({
            channel: z.enum(EnumNotificationChannel),
            total: z.number(),
            sent: z.number(),
            failed: z.number(),
            pending: z.number(),
        })
    ),
}) satisfies z.ZodType<IAnalyticNotificationDeliveryResult>;

/** @public */
export type AnalyticNotificationDeliveryCacheDto = z.infer<
    typeof AnalyticNotificationDeliveryCacheSchema
>;
