import { EnumWorkspaceMemberRole } from '@generated/prisma-client';
import { WorkspaceMemberUpdateRoleRequestSchema } from '@modules/workspace/dtos/request/workspace.member-update-role.request.dto';
describe('WorkspaceMemberUpdateRoleRequestSchema', () => {
    it.each([EnumWorkspaceMemberRole.admin, EnumWorkspaceMemberRole.member])(
        'accepts assignable role %s',
        role =>
            expect(
                WorkspaceMemberUpdateRoleRequestSchema.safeParse({ role })
                    .success
            ).toBe(true)
    );
    it.each([
        { role: EnumWorkspaceMemberRole.owner },
        { role: EnumWorkspaceMemberRole.member, unknown: true },
    ])('rejects protected or unknown input', input =>
        expect(
            WorkspaceMemberUpdateRoleRequestSchema.safeParse(input).success
        ).toBe(false)
    );
});
