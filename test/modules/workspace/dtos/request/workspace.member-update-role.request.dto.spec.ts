import { WorkspaceMemberUpdateRoleRequestSchema } from '@modules/workspace/dtos/request/workspace.member-update-role.request.dto';

describe('WorkspaceMemberUpdateRoleRequestSchema', () => {
    const uuidV7 = '01890a5d-ac96-774b-bcce-b302099a8057';

    it('accepts a UUID role id and returns exactly the declared field', () => {
        const result = WorkspaceMemberUpdateRoleRequestSchema.safeParse({
            roleId: uuidV7,
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual({ roleId: uuidV7 });
    });

    it.each([
        ['a missing role id', {}],
        ['a non-UUID role id', { roleId: 'admin' }],
        ['a Mongo ObjectId role id', { roleId: '507f1f77bcf86cd799439011' }],
        ['the legacy role enum field', { role: 'admin' }],
        [
            'the legacy role enum field beside a role id',
            { roleId: uuidV7, role: 'admin' },
        ],
        ['an unknown key', { roleId: uuidV7, unknown: true }],
    ])('rejects %s', (_name, input) => {
        expect(
            WorkspaceMemberUpdateRoleRequestSchema.safeParse(input).success
        ).toBe(false);
    });
});
