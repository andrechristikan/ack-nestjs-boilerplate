import { WorkspaceInviteCreateRequestSchema } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';

describe('WorkspaceInviteCreateRequestSchema', () => {
    const roleId = '01890a5d-ac96-774b-bcce-b302099a8057';
    const projectRoleId = '01890a5d-ac96-774b-bcce-b302099a8058';
    const valid = {
        email: ' USER@EXAMPLE.COM ',
        workspaceRoleId: roleId,
    };

    it('normalizes a valid invite', () =>
        expect(WorkspaceInviteCreateRequestSchema.parse(valid).email).toBe(
            'user@example.com'
        ));

    it('accepts an optional project grant', () =>
        expect(
            WorkspaceInviteCreateRequestSchema.safeParse({
                ...valid,
                projectId: '01890a5d-ac96-774b-bcce-b302099a8059',
                projectRoleId,
            }).success
        ).toBe(true));

    it.each([
        { ...valid, email: 'bad' },
        { ...valid, workspaceRoleId: undefined },
        { ...valid, workspaceRoleId: 'admin' },
        { ...valid, workspaceRoleId: '507f1f77bcf86cd799439011' },
        { ...valid, projectRoleId: 'member' },
        { ...valid, projectId: 'bad' },
        { ...valid, projectId: '507f1f77bcf86cd799439011' },
        { email: valid.email, workspaceRole: 'member' },
        { ...valid, projectRole: 'member' },
        { ...valid, unknown: true },
    ])('rejects invalid or unknown input', input =>
        expect(
            WorkspaceInviteCreateRequestSchema.safeParse(input).success
        ).toBe(false)
    );
});
