import { describe, expect, it } from 'vitest';

import { RequestRequiredStringSchema } from '@common/request/validations/request.required-string.validation';

describe('RequestRequiredStringSchema', () => {
    it('accepts a non-empty string', () => {
        expect(RequestRequiredStringSchema.safeParse('value').success).toBe(
            true
        );
    });

    it('rejects an empty string', () => {
        expect(RequestRequiredStringSchema.safeParse('').success).toBe(false);
    });
});
