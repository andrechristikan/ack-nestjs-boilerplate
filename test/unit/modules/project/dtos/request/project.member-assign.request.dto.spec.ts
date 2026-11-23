import { ProjectMemberAssignRequestSchema } from '@modules/project/dtos/request/project.member-assign.request.dto';

describe('ProjectMemberAssignRequestSchema', () => {
    const payload = {
        userId: '01920000-0000-7000-8000-6cd799439011',
        roleId: '01920000-0000-7000-8000-6cd799439012',
    };

    it('parses userId and roleId', () => {
        expect(ProjectMemberAssignRequestSchema.parse(payload)).toEqual(
            payload
        );
    });

    it('rejects a userId that is not a uuid', () => {
        expect(() =>
            ProjectMemberAssignRequestSchema.parse({
                ...payload,
                userId: 'not-an-id',
            })
        ).toThrow();
    });

    it('rejects a roleId that is not a uuid', () => {
        expect(() =>
            ProjectMemberAssignRequestSchema.parse({
                ...payload,
                roleId: 'admin',
            })
        ).toThrow();
    });

    it('rejects a missing roleId', () => {
        expect(() =>
            ProjectMemberAssignRequestSchema.parse({ userId: payload.userId })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            ProjectMemberAssignRequestSchema.parse({ ...payload, extra: true })
        ).toThrow();
    });
});
