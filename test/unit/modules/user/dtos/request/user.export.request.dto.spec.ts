import { UserExportRequestSchema } from '@modules/user/dtos/request/user.export.request.dto';

describe('UserExportRequestSchema', () => {
    const payload = {
        status: 'active,inactive',
        roleId: '507f1f77bcf86cd799439011',
        countryId: '507f1f77bcf86cd799439012',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserExportRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty payload', () => {
        const result = UserExportRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects a roleId that is not a MongoDB ObjectId', () => {
        const result = UserExportRequestSchema.safeParse({
            ...payload,
            roleId: 'abc',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['roleId'], code: 'too_small' }),
        ]);
    });

    it('rejects a countryId that is not a MongoDB ObjectId', () => {
        const result = UserExportRequestSchema.safeParse({
            ...payload,
            countryId: 'abc',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['countryId'], code: 'too_small' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = UserExportRequestSchema.safeParse({
            ...payload,
            search: 'john',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('accepts a status of 256 characters and rejects one of 257', () => {
        expect(() =>
            UserExportRequestSchema.parse({ status: 'a'.repeat(256) })
        ).not.toThrow();
        const result = UserExportRequestSchema.safeParse({
            status: 'a'.repeat(257),
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['status'], code: 'too_big' }),
        ]);
    });
});
