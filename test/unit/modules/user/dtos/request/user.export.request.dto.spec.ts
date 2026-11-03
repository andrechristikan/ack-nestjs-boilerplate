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
        expect(() =>
            UserExportRequestSchema.parse({ ...payload, roleId: 'abc' })
        ).toThrow();
    });

    it('rejects a countryId that is not a MongoDB ObjectId', () => {
        expect(() =>
            UserExportRequestSchema.parse({ ...payload, countryId: 'abc' })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            UserExportRequestSchema.parse({ ...payload, search: 'john' })
        ).toThrow();
    });
});
