import { EnumRoleScope } from '@generated/prisma-client/client';
import { RoleCreateRequestSchema } from '@modules/role/dtos/request/role.create.request.dto';

describe('RoleCreateRequestSchema', () => {
    const payload = {
        scope: EnumRoleScope.workspace,
        key: 'auditor',
        name: 'Auditor',
    };

    it('parses the required fields with the description optional', () => {
        expect(RoleCreateRequestSchema.parse(payload)).toEqual(payload);
    });

    it('keeps the case of the key', () => {
        const result = RoleCreateRequestSchema.parse({
            ...payload,
            key: 'projectAuditor',
        });

        expect(result.key).toBe('projectAuditor');
    });

    it.each(['ab', '1abc', 'with-dash', 'a'.repeat(31)])(
        'rejects the key %s',
        key => {
            expect(() =>
                RoleCreateRequestSchema.parse({ ...payload, key })
            ).toThrow();
        }
    );

    it('fails a 31-character key on max, not on regex', () => {
        const result = RoleCreateRequestSchema.safeParse({
            ...payload,
            key: 'a'.repeat(31),
        });

        expect(result.error?.issues).toHaveLength(1);
        expect(result.error?.issues[0]?.code).toBe('too_big');
    });

    it('fails a 2-character key on min, not on regex', () => {
        const result = RoleCreateRequestSchema.safeParse({
            ...payload,
            key: 'ab',
        });

        expect(result.error?.issues).toHaveLength(1);
        expect(result.error?.issues[0]?.code).toBe('too_small');
    });

    it('rejects a scope outside EnumRoleScope', () => {
        expect(() =>
            RoleCreateRequestSchema.parse({ ...payload, scope: 'galaxy' })
        ).toThrow();
    });
});
