import { z } from 'zod';
import {
    RequestOptionalEnvEmailSchema,
    RequestOptionalEnvSchema,
    RequestOptionalEnvSesIdentityArnSchema,
    RequestOptionalEnvStringSchema,
    RequestOptionalEnvUrlNoTrailingSlashSchema,
    RequestOptionalEnvUrlSchema,
} from '@common/request/validations/request.optional-env.validation';

describe('request.optional-env.validation', () => {
    describe('RequestOptionalEnvSchema', () => {
        it('parses an absent value to null', () => {
            expect(RequestOptionalEnvSchema.parse(undefined)).toBeNull();
        });

        it('parses an empty string to null', () => {
            expect(RequestOptionalEnvSchema.parse('')).toBeNull();
        });

        it('parses a non-empty value as it is', () => {
            expect(RequestOptionalEnvSchema.parse('eu-west-1')).toBe(
                'eu-west-1'
            );
        });

        it('keeps a whitespace-only value', () => {
            expect(RequestOptionalEnvSchema.parse(' ')).toBe(' ');
        });

        it('parses a missing key inside an object to null', () => {
            const schema = z.object({ KEY: RequestOptionalEnvSchema });

            expect(schema.parse({})).toEqual({ KEY: null });
        });

        it('rejects a value that is not a string', () => {
            expect(RequestOptionalEnvSchema.safeParse(1).success).toBe(false);
        });
    });

    describe('RequestOptionalEnvStringSchema', () => {
        it('parses an absent value to null', () => {
            expect(RequestOptionalEnvStringSchema.parse(undefined)).toBeNull();
        });

        it('parses an empty string to null', () => {
            expect(RequestOptionalEnvStringSchema.parse('')).toBeNull();
        });

        it('parses a non-empty string', () => {
            expect(RequestOptionalEnvStringSchema.parse('value')).toBe('value');
        });
    });

    describe('RequestOptionalEnvEmailSchema', () => {
        it('parses an empty string to null', () => {
            expect(RequestOptionalEnvEmailSchema.parse('')).toBeNull();
        });

        it('parses a valid email address', () => {
            expect(
                RequestOptionalEnvEmailSchema.parse('noreply@mail.com')
            ).toBe('noreply@mail.com');
        });

        it('rejects an invalid email address with one issue carrying the message path', () => {
            const result =
                RequestOptionalEnvEmailSchema.safeParse('not-an-email');

            expect(result.error?.issues).toEqual([
                expect.objectContaining({
                    code: 'custom',
                    message: 'request.error.email.invalid',
                }),
            ]);
        });

        it('keeps the case of a valid email address', () => {
            expect(
                RequestOptionalEnvEmailSchema.parse('NoReply@Mail.com')
            ).toBe('NoReply@Mail.com');
        });
    });

    describe('RequestOptionalEnvSesIdentityArnSchema', () => {
        it('parses an empty string to null', () => {
            expect(RequestOptionalEnvSesIdentityArnSchema.parse('')).toBeNull();
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
        it('parses an empty string to null', () => {
            expect(
                RequestOptionalEnvUrlNoTrailingSlashSchema.parse('')
            ).toBeNull();
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

    describe('RequestOptionalEnvUrlSchema', () => {
        it('parses an absent value to null', () => {
            expect(RequestOptionalEnvUrlSchema.parse(undefined)).toBeNull();
        });

        it('parses an empty string to null', () => {
            expect(RequestOptionalEnvUrlSchema.parse('')).toBeNull();
        });

        it('parses a valid URL', () => {
            const dsn = 'https://key@o0.ingest.sentry.io/1';

            expect(RequestOptionalEnvUrlSchema.parse(dsn)).toBe(dsn);
        });

        it('rejects a value that is not a URL', () => {
            expect(
                RequestOptionalEnvUrlSchema.safeParse('not-a-url').success
            ).toBe(false);
        });
    });
});
