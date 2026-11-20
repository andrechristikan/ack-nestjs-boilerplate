import { ApiKeyUpdateStatusRequestSchema } from '@modules/api-key/dtos/request/api-key.update-status.request.dto';

describe('ApiKeyUpdateStatusRequestSchema', () => {
    it('parses isActive into exactly the declared field', () => {
        const result = ApiKeyUpdateStatusRequestSchema.parse({
            isActive: true,
        });

        expect(result).toEqual({ isActive: true });
    });

    it('rejects a missing isActive', () => {
        const result = ApiKeyUpdateStatusRequestSchema.safeParse({});

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['isActive'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects a non-boolean isActive', () => {
        const result = ApiKeyUpdateStatusRequestSchema.safeParse({
            isActive: 'true',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['isActive'],
                code: 'invalid_type',
            }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = ApiKeyUpdateStatusRequestSchema.safeParse({
            isActive: true,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
