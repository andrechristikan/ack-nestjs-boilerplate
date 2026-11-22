import { z } from 'zod';
import { EnumNotificationChannel } from '@generated/prisma-client/client';
import type { IAnalyticNotificationDelivery } from '@modules/analytic/interfaces/analytic.interface';

/** @public */
export const AnalyticNotificationDeliveryPipelineSchema = z.array(
    z.object({
        channel: z.enum(EnumNotificationChannel),
        total: z.number(),
        sent: z.number(),
        failed: z.number(),
        pending: z.number(),
    })
) satisfies z.ZodType<IAnalyticNotificationDelivery[]>;

/** @public */
export type AnalyticNotificationDeliveryPipelineDto = z.infer<
    typeof AnalyticNotificationDeliveryPipelineSchema
>;
