import { z } from 'zod';
import { RequestOptionalEnvSchema } from '@common/request/validations/request.optional-env.validation';

describe('RequestOptionalEnvSchema', () => {
    const schema = RequestOptionalEnvSchema(z.email());

    it('parses an absent value to undefined', () => {
        expect(schema.parse(undefined)).toBeUndefined();
    });

    it('parses an empty string to undefined', () => {
        expect(schema.parse('')).toBeUndefined();
    });

    it('parses a value that satisfies the wrapped schema', () => {
        expect(schema.parse('a@b.co')).toBe('a@b.co');
    });

    it('rejects a value the wrapped schema rejects', () => {
        expect(schema.safeParse('not-an-email').success).toBe(false);
    });

    it('rejects a whitespace-only value', () => {
        expect(schema.safeParse(' ').success).toBe(false);
    });
});
