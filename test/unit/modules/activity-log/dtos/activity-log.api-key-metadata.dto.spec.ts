import { ActivityLogApiKeyMetadataSchema } from '@modules/activity-log/dtos/activity-log.api-key-metadata.dto';

describe('ActivityLogApiKeyMetadataSchema', () => {
    const timestamp: Date = new Date('2026-01-01T00:00:00.000Z');
    const payload = {
        apiKeyId: 'api-key-1',
        apiKeyName: 'main key',
        apiKeyType: 'default',
        timestamp,
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = ActivityLogApiKeyMetadataSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses with every field omitted', () => {
        const result = ActivityLogApiKeyMetadataSchema.parse({});

        expect(result).toEqual({});
    });

    it('accepts a string timestamp', () => {
        const result = ActivityLogApiKeyMetadataSchema.parse({
            timestamp: timestamp.toISOString(),
        });

        expect(result).toEqual({ timestamp: timestamp.toISOString() });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ActivityLogApiKeyMetadataSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });
});
