import { ProjectMemberUpdateRoleRequestSchema } from '@modules/project/dtos/request/project.member-update-role.request.dto';

describe('ProjectMemberUpdateRoleRequestSchema', () => {
    const valid = { roleId: '01890a5d-ac96-774b-bcce-b302099a8058' };

    it('accepts a UUID v7 role id', () =>
        expect(
            ProjectMemberUpdateRoleRequestSchema.safeParse(valid).success
        ).toBe(true));

    it.each([
        {},
        { roleId: 'admin' },
        { roleId: '507f1f77bcf86cd799439011' },
        { role: 'admin' },
        { ...valid, role: 'admin' },
        { ...valid, unknown: true },
    ])('rejects a missing, malformed, legacy role, or unknown input', input =>
        expect(
            ProjectMemberUpdateRoleRequestSchema.safeParse(input).success
        ).toBe(false)
    );
});
