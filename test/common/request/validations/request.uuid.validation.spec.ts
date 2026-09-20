import { describe, expect, it } from 'vitest';

import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';

describe('RequestUuidSchema', () => {
    it('accepts a UUID string', () => {
        const uuid = '018f4bd6-c8cc-72cb-bf48-3ff0600f6f17';

        expect(RequestUuidSchema.parse(uuid)).toBe(uuid);
    });

    it('rejects a MongoDB ObjectId', () => {
        expect(() =>
            RequestUuidSchema.parse('507f1f77bcf86cd799439011')
        ).toThrow();
    });
});
