import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import { ProjectMemberUpdateRoleRequestSchema } from '@modules/project/dtos/request/project.member-update-role.request.dto';

describe('ProjectMemberUpdateRoleRequestSchema', () => {
    it('parses role', () => {
        const result = ProjectMemberUpdateRoleRequestSchema.parse({
            role: EnumProjectMemberRole.admin,
        });

        expect(result).toEqual({ role: EnumProjectMemberRole.admin });
    });

    it('rejects a role outside EnumProjectMemberRole', () => {
        expect(() =>
            ProjectMemberUpdateRoleRequestSchema.parse({ role: 'owner' })
        ).toThrow();
    });

    it('rejects a missing role', () => {
        expect(() => ProjectMemberUpdateRoleRequestSchema.parse({})).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ProjectMemberUpdateRoleRequestSchema.parse({
                role: EnumProjectMemberRole.admin,
                extra: true,
            })
        ).toThrow();
    });
});
