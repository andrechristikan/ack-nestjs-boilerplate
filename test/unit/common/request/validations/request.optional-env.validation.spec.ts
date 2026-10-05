import { z } from 'zod';
import {
    RequestOptionalEnvEmailSchema,
    RequestOptionalEnvSchema,
    RequestOptionalEnvSesIdentityArnSchema,
    RequestOptionalEnvStringSchema,
    RequestOptionalEnvUrlNoTrailingSlashSchema,
    readOptionalEnv,
} from '@common/request/validations/request.optional-env.validation';

describe('request.optional-env.validation', () => {
    describe('readOptionalEnv', () => {
        it('returns null for an absent value', () => {
            expect(readOptionalEnv(undefined)).toBeNull();
        });

        it('returns null for an empty string', () => {
            expect(readOptionalEnv('')).toBeNull();
        });

        it('returns a non-empty value as it is', () => {
            expect(readOptionalEnv('eu-west-1')).toBe('eu-west-1');
        });

        it('keeps a whitespace-only value', () => {
            expect(readOptionalEnv(' ')).toBe(' ');
        });
    });

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

    describe('RequestOptionalEnvStringSchema', () => {
        it('parses an absent value to undefined', () => {
            expect(
                RequestOptionalEnvStringSchema.parse(undefined)
            ).toBeUndefined();
        });

        it('parses an empty string to undefined', () => {
            expect(RequestOptionalEnvStringSchema.parse('')).toBeUndefined();
        });

        it('parses a non-empty string', () => {
            expect(RequestOptionalEnvStringSchema.parse('value')).toBe('value');
        });
    });

    describe('RequestOptionalEnvEmailSchema', () => {
        it('parses an empty string to undefined', () => {
            expect(RequestOptionalEnvEmailSchema.parse('')).toBeUndefined();
        });

        it('parses a valid email address', () => {
            expect(
                RequestOptionalEnvEmailSchema.parse('noreply@mail.com')
            ).toBe('noreply@mail.com');
        });

        it('rejects an email address the custom validator refuses with its message path', () => {
            const result =
                RequestOptionalEnvEmailSchema.safeParse('not-an-email');

            expect(result.success).toBe(false);
            expect(result.error?.issues).toContainEqual(
                expect.objectContaining({
                    code: 'custom',
                    message: 'request.error.email.invalid',
                })
            );
        });
    });

    describe('RequestOptionalEnvSesIdentityArnSchema', () => {
        it('parses an empty string to undefined', () => {
            expect(
                RequestOptionalEnvSesIdentityArnSchema.parse('')
            ).toBeUndefined();
        });

        it('parses an SES identity ARN', () => {
            const arn =
                'arn:aws:ses:us-east-1:123456789012:identity/example.com';

            expect(RequestOptionalEnvSesIdentityArnSchema.parse(arn)).toBe(arn);
        });

        it('rejects a value that is not an SES identity ARN', () => {
            expect(
                RequestOptionalEnvSesIdentityArnSchema.safeParse('example.com')
                    .success
            ).toBe(false);
        });
    });

    describe('RequestOptionalEnvUrlNoTrailingSlashSchema', () => {
        it('parses an empty string to undefined', () => {
            expect(
                RequestOptionalEnvUrlNoTrailingSlashSchema.parse('')
            ).toBeUndefined();
        });

        it('parses a URL without a trailing slash', () => {
            expect(
                RequestOptionalEnvUrlNoTrailingSlashSchema.parse(
                    'http://localhost:4566'
                )
            ).toBe('http://localhost:4566');
        });

        it('rejects a URL with a trailing slash', () => {
            expect(
                RequestOptionalEnvUrlNoTrailingSlashSchema.safeParse(
                    'http://localhost:4566/'
                ).success
            ).toBe(false);
        });
    });
});
