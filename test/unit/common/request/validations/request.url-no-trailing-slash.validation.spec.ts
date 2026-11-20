import { RequestUrlNoTrailingSlashSchema } from '@common/request/validations/request.url-no-trailing-slash.validation';

describe('RequestUrlNoTrailingSlashSchema', () => {
    it('parses a URL without a trailing slash', () => {
        expect(
            RequestUrlNoTrailingSlashSchema.parse('http://localhost:4566')
        ).toBe('http://localhost:4566');
    });

    it('rejects a URL with a trailing slash', () => {
        expect(
            RequestUrlNoTrailingSlashSchema.safeParse('http://localhost:4566/')
                .error?.issues
        ).toEqual([expect.objectContaining({ path: [], code: 'custom' })]);
    });

    it('rejects a value that is not a URL', () => {
        expect(
            RequestUrlNoTrailingSlashSchema.safeParse('not a url').error?.issues
        ).toEqual([
            expect.objectContaining({ path: [], code: 'invalid_format' }),
        ]);
    });
});
