import { AnalyticNotificationDeliveryCacheSchema } from '@modules/analytic/dtos/analytic.notification-delivery-cache.dto';

describe('AnalyticNotificationDeliveryCacheSchema', () => {
    const payload = {
        channels: [
            { channel: 'push', total: 1, sent: 2, failed: 3, pending: 4 },
        ],
        undeclared: 'extra',
    };
    const expected = {
        channels: [
            { channel: 'push', total: 1, sent: 2, failed: 3, pending: 4 },
        ],
    };
    const invalid = {
        channels: [
            {
                channel: 'unknownValue',
                total: 1,
                sent: 2,
                failed: 3,
                pending: 4,
            },
        ],
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = AnalyticNotificationDeliveryCacheSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with channels.0.channel of the wrong value', () => {
        const result =
            AnalyticNotificationDeliveryCacheSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['channels', 0, 'channel'],
                code: 'invalid_value',
            }),
        ]);
    });
});
