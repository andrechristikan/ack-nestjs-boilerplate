import { AnalyticNotificationDeliveryPipelineSchema } from '@modules/analytic/dtos/analytic.notification-delivery-pipeline.dto';

describe('AnalyticNotificationDeliveryPipelineSchema', () => {
    const payload = [
        {
            channel: 'push',
            total: 1,
            sent: 2,
            failed: 3,
            pending: 4,
            undeclared: 'extra',
        },
    ];
    const expected = [
        { channel: 'push', total: 1, sent: 2, failed: 3, pending: 4 },
    ];
    const invalid = [
        { channel: 'unknownValue', total: 1, sent: 2, failed: 3, pending: 4 },
    ];

    it('parses a payload into exactly the declared fields', () => {
        const result =
            AnalyticNotificationDeliveryPipelineSchema.parse(payload);

        expect(result).toEqual(expected);
    });

    it('refuses a payload with 0.channel of the wrong value', () => {
        const result =
            AnalyticNotificationDeliveryPipelineSchema.safeParse(invalid);

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: [0, 'channel'],
                code: 'invalid_value',
            }),
        ]);
    });
});
