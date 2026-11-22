import { ApiKeyUpdateStatusRequestSchema } from '@modules/api-key/dtos/request/api-key.update-status.request.dto';

describe('ApiKeyUpdateStatusRequestSchema', () => {
    it('parses isActive into exactly the declared field', () => {
        const result = ApiKeyUpdateStatusRequestSchema.parse({
            isActive: true,
        });

        expect(result).toEqual({ isActive: true });
    });

    it('rejects a missing isActive', () => {
        expect(() => ApiKeyUpdateStatusRequestSchema.parse({})).toThrow();
    });

    it('rejects a non-boolean isActive', () => {
        expect(() =>
            ApiKeyUpdateStatusRequestSchema.parse({ isActive: 'true' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ApiKeyUpdateStatusRequestSchema.parse({
                isActive: true,
                extra: true,
            })
        ).toThrow();
    });
});
