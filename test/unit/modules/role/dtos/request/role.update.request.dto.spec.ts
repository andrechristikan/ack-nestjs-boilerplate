import { RoleUpdateRequestSchema } from '@modules/role/dtos/request/role.update.request.dto';

describe('RoleUpdateRequestSchema', () => {
    const payload = { name: 'Auditor', description: 'Reads logs' };

    it('parses a payload into exactly the declared fields', () => {
        expect(RoleUpdateRequestSchema.parse(payload)).toEqual(payload);
    });

    it('accepts null to clear the description', () => {
        const cleared = { ...payload, description: null };

        expect(RoleUpdateRequestSchema.parse(cleared)).toEqual(cleared);
    });

    it('requires the description, an update is a full replace', () => {
        expect(() =>
            RoleUpdateRequestSchema.parse({ name: 'Auditor' })
        ).toThrow();
    });

    it('rejects scope and key as undeclared keys, they never change', () => {
        expect(() =>
            RoleUpdateRequestSchema.parse({ ...payload, key: 'auditor' })
        ).toThrow();
        expect(() =>
            RoleUpdateRequestSchema.parse({ ...payload, scope: 'platform' })
        ).toThrow();
    });

    it('rejects a name shorter than 3 characters', () => {
        expect(() =>
            RoleUpdateRequestSchema.parse({ ...payload, name: 'ab' })
        ).toThrow();
    });
});
