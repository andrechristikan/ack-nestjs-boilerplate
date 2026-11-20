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
        const result = ProjectMemberUpdateRoleRequestSchema.safeParse({
            role: 'owner',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['role'], code: 'invalid_value' }),
        ]);
    });

    it('rejects a missing role', () => {
        const result = ProjectMemberUpdateRoleRequestSchema.safeParse({});

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['role'], code: 'invalid_value' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = ProjectMemberUpdateRoleRequestSchema.safeParse({
            role: EnumProjectMemberRole.admin,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
