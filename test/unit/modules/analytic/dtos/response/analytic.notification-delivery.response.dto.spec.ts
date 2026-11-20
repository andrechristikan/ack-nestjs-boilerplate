import { EnumNotificationChannel } from '@generated/prisma-client/client';
import { AnalyticNotificationDeliveryResponseSchema } from '@modules/analytic/dtos/response/analytic.notification-delivery.response.dto';

describe('AnalyticNotificationDeliveryResponseSchema', () => {
    const row = {
        channel: EnumNotificationChannel.email,
        total: 6,
        sent: 3,
        failed: 2,
        pending: 1,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticNotificationDeliveryResponseSchema.parse({
            channels: [row],
        });

        expect(result).toEqual({ channels: [row] });
    });

    it('strips an undeclared key', () => {
        const result = AnalyticNotificationDeliveryResponseSchema.parse({
            channels: [{ ...row, notificationId: 'notification-1' }],
        });

        expect(result).toEqual({ channels: [row] });
    });

    it('rejects an unknown channel', () => {
        const result = AnalyticNotificationDeliveryResponseSchema.safeParse({
            channels: [{ ...row, channel: 'fax' }],
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['channels', 0, 'channel'],
                code: 'invalid_value',
            }),
        ]);
    });

    it('rejects a row with a missing count', () => {
        const { pending: _pending, ...incomplete } = row;
        const result = AnalyticNotificationDeliveryResponseSchema.safeParse({
            channels: [incomplete],
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['channels', 0, 'pending'],
                code: 'invalid_type',
            }),
        ]);
    });
});
