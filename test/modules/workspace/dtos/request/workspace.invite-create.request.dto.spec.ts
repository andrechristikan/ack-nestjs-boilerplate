import {
    EnumProjectMemberRole,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client';
import { WorkspaceInviteCreateRequestSchema } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
describe('WorkspaceInviteCreateRequestSchema', () => {
    const valid = {
        email: ' USER@EXAMPLE.COM ',
        workspaceRole: EnumWorkspaceMemberRole.member,
    };
    it('normalizes a valid invite', () =>
        expect(WorkspaceInviteCreateRequestSchema.parse(valid).email).toBe(
            'user@example.com'
        ));
    it('accepts an optional project grant', () =>
        expect(
            WorkspaceInviteCreateRequestSchema.safeParse({
                ...valid,
                projectId: 'a'.repeat(24),
                projectRole: EnumProjectMemberRole.member,
            }).success
        ).toBe(true));
    it.each([
        { ...valid, email: 'bad' },
        { ...valid, workspaceRole: EnumWorkspaceMemberRole.owner },
        { ...valid, projectId: 'bad' },
        { ...valid, unknown: true },
    ])('rejects invalid or unknown input', input =>
        expect(
            WorkspaceInviteCreateRequestSchema.safeParse(input).success
        ).toBe(false)
    );
});
