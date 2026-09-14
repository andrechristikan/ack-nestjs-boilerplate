import { describe, expect, it } from 'vitest';

import { RequestUuidSchema } from '@common/request/validations/request.uuid.validation';

describe('RequestUuidSchema', () => {
    it('accepts a UUID', () => {
        expect(
            RequestUuidSchema.safeParse('018f8a92-1d4b-7b31-a63a-f8ad45ef197b')
                .success
        ).toBe(true);
    });

    it('rejects a non-UUID value', () => {
        expect(RequestUuidSchema.safeParse('not-a-uuid').success).toBe(false);
    });
});
