import { RoleUpdateRequestSchema } from '@modules/role/dtos/request/role.update.request.dto';

describe('RoleUpdateRequestSchema', () => {
    it('accepts a name and an optional description', () => {
        expect(RoleUpdateRequestSchema.parse({ name: 'Editor' })).toEqual({
            name: 'Editor',
        });
        expect(
            RoleUpdateRequestSchema.parse({
                name: 'Editor',
                description: 'Edits content',
            })
        ).toEqual({ name: 'Editor', description: 'Edits content' });
    });

    it('trims the name', () => {
        expect(RoleUpdateRequestSchema.parse({ name: '  Editor  ' }).name).toBe(
            'Editor'
        );
    });

    it('rejects a missing, empty, too short or too long name', () => {
        expect(RoleUpdateRequestSchema.safeParse({}).success).toBe(false);
        expect(RoleUpdateRequestSchema.safeParse({ name: '   ' }).success).toBe(
            false
        );
        expect(RoleUpdateRequestSchema.safeParse({ name: 'ab' }).success).toBe(
            false
        );
        expect(
            RoleUpdateRequestSchema.safeParse({ name: 'a'.repeat(51) }).success
        ).toBe(false);
    });

    it('rejects a description over 500 characters', () => {
        expect(
            RoleUpdateRequestSchema.safeParse({
                name: 'Editor',
                description: 'a'.repeat(501),
            }).success
        ).toBe(false);
    });

    it.each(['key', 'scope', 'type'])(
        'rejects the immutable or removed field %s as an unknown key',
        field => {
            expect(
                RoleUpdateRequestSchema.safeParse({
                    name: 'Editor',
                    [field]: 'admin',
                }).success
            ).toBe(false);
        }
    );
});
