import { ApiKeyUpdateRequestSchema } from '@modules/api-key/dtos/request/api-key.update.request.dto';

describe('ApiKeyUpdateRequestSchema', () => {
    it('parses name into exactly the declared field', () => {
        const result = ApiKeyUpdateRequestSchema.parse({
            name: 'Renamed Api Key',
        });

        expect(result).toEqual({ name: 'Renamed Api Key' });
    });

    it('rejects a missing name', () => {
        const result = ApiKeyUpdateRequestSchema.safeParse({});

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'invalid_type' }),
        ]);
    });

    it('rejects an empty name', () => {
        const result = ApiKeyUpdateRequestSchema.safeParse({ name: '' });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['name'], code: 'too_small' }),
        ]);
    });

    it('rejects an undeclared type key picked out of the base schema', () => {
        const result = ApiKeyUpdateRequestSchema.safeParse({
            name: 'Renamed Api Key',
            type: 'default',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
