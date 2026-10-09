import { EnumRoleScope } from '@generated/prisma-client/client';
import { RoleCreateRequestSchema } from '@modules/role/dtos/request/role.create.request.dto';

describe('RoleCreateRequestSchema', () => {
    const base = {
        scope: EnumRoleScope.workspace,
        key: 'workspace.editor',
        name: 'Workspace Editor',
    };

    it('trims and lowercases the key, trims the name, keeps the scope and leaves description absent', () => {
        expect(
            RoleCreateRequestSchema.parse({
                ...base,
                key: '  Workspace.Editor01 ',
                name: '  Workspace Editor ',
            })
        ).toEqual({
            scope: EnumRoleScope.workspace,
            key: 'workspace.editor01',
            name: 'Workspace Editor',
        });
    });

    it('accepts a description up to 500 characters', () => {
        const description = 'a'.repeat(500);

        expect(RoleCreateRequestSchema.parse({ ...base, description })).toEqual(
            { ...base, description }
        );
    });

    it('rejects a description over 500 characters', () => {
        expect(
            RoleCreateRequestSchema.safeParse({
                ...base,
                description: 'a'.repeat(501),
            }).success
        ).toBe(false);
    });

    it('applies the update name rule: 3 to 50 characters after trim', () => {
        expect(
            RoleCreateRequestSchema.safeParse({
                ...base,
                name: ` ${'a'.repeat(50)} `,
            }).success
        ).toBe(true);
        expect(
            RoleCreateRequestSchema.safeParse({ ...base, name: 'ab' }).success
        ).toBe(false);
        expect(
            RoleCreateRequestSchema.safeParse({
                ...base,
                name: 'a'.repeat(51),
            }).success
        ).toBe(false);
    });

    it('accepts a key of 50 characters after trim', () => {
        expect(
            RoleCreateRequestSchema.safeParse({
                ...base,
                key: ` ${'a'.repeat(50)} `,
            }).success
        ).toBe(true);
    });

    it.each([
        ['2 characters', 'ab'],
        ['51 characters after trim', `  ${'a'.repeat(51)}  `],
        ['a dash', 'road-runner'],
        ['an underscore', 'road_runner'],
        ['an inner space', 'road runner'],
        ['a non-ASCII letter', 'café'],
    ])('rejects a key with %s', (_label, key) => {
        expect(
            RoleCreateRequestSchema.safeParse({ ...base, key }).success
        ).toBe(false);
    });

    it.each(['.editor', 'editor.', 'project..editor'])(
        'accepts a key with dots in any position: %s',
        key => {
            expect(
                RoleCreateRequestSchema.safeParse({ ...base, key }).success
            ).toBe(true);
        }
    );

    it('rejects a missing scope, an unknown scope, a missing key or a missing name', () => {
        const { scope: _scope, ...noScope } = base;
        const { key: _key, ...noKey } = base;
        const { name: _name, ...noName } = base;

        expect(RoleCreateRequestSchema.safeParse(noScope).success).toBe(false);
        expect(
            RoleCreateRequestSchema.safeParse({ ...base, scope: 'galaxy' })
                .success
        ).toBe(false);
        expect(RoleCreateRequestSchema.safeParse(noKey).success).toBe(false);
        expect(RoleCreateRequestSchema.safeParse(noName).success).toBe(false);
    });

    it('rejects an unknown field', () => {
        expect(
            RoleCreateRequestSchema.safeParse({ ...base, extra: 1 }).success
        ).toBe(false);
    });
});
