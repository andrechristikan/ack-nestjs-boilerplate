import { UserExportRequestSchema } from '@modules/user/dtos/request/user.export.request.dto';

describe('UserExportRequestSchema', () => {
    const payload = {
        status: 'active,inactive',
        roleId: 'role-1',
        countryId: 'country-1',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserExportRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty payload', () => {
        const result = UserExportRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserExportRequestSchema.parse({ ...payload, search: 'john' })
        ).toThrow();
    });
});
