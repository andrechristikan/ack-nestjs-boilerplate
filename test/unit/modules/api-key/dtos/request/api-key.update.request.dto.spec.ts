import { ApiKeyUpdateRequestSchema } from '@modules/api-key/dtos/request/api-key.update.request.dto';

describe('ApiKeyUpdateRequestSchema', () => {
    it('parses name into exactly the declared field', () => {
        const result = ApiKeyUpdateRequestSchema.parse({
            name: 'Renamed Api Key',
        });

        expect(result).toEqual({ name: 'Renamed Api Key' });
    });

    it('rejects a missing name', () => {
        expect(() => ApiKeyUpdateRequestSchema.parse({})).toThrow();
    });

    it('rejects an empty name', () => {
        expect(() => ApiKeyUpdateRequestSchema.parse({ name: '' })).toThrow();
    });

    it('rejects an undeclared type key picked out of the base schema', () => {
        expect(() =>
            ApiKeyUpdateRequestSchema.parse({
                name: 'Renamed Api Key',
                type: 'default',
            })
        ).toThrow();
    });
});
