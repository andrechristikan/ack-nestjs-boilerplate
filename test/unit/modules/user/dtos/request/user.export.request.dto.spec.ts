import { UserExportRequestSchema } from '@modules/user/dtos/request/user.export.request.dto';

describe('UserExportRequestSchema', () => {
    const payload = {
        status: 'active,inactive',
        roleId: '01920000-0000-7000-8000-6cd799439011',
        countryId: '01920000-0000-7000-8000-6cd799439012',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserExportRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty payload', () => {
        const result = UserExportRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects a roleId that is not a UUID', () => {
        expect(() =>
            UserExportRequestSchema.parse({ ...payload, roleId: 'abc' })
        ).toThrow();
    });

    it('rejects a countryId that is not a UUID', () => {
        expect(() =>
            UserExportRequestSchema.parse({ ...payload, countryId: 'abc' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserExportRequestSchema.parse({ ...payload, search: 'john' })
        ).toThrow();
    });

    it('accepts a status of 256 characters and rejects one of 257', () => {
        expect(() =>
            UserExportRequestSchema.parse({ status: 'a'.repeat(256) })
        ).not.toThrow();
        expect(() =>
            UserExportRequestSchema.parse({ status: 'a'.repeat(257) })
        ).toThrow();
    });
});
