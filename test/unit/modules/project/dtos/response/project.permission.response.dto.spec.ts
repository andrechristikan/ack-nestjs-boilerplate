import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { ProjectPermissionResponseSchema } from '@modules/project/dtos/response/project.permission.response.dto';

describe('ProjectPermissionResponseSchema', () => {
    const row = {
        permissions: [
            {
                subject: EnumPolicySubject.Project,
                actions: [EnumPolicyAction.read, EnumPolicyAction.update],
            },
        ],
    };

    it('parses the permissions list', () => {
        expect(ProjectPermissionResponseSchema.parse(row)).toEqual(row);
    });

    it('parses an empty list', () => {
        expect(
            ProjectPermissionResponseSchema.parse({ permissions: [] })
        ).toEqual({ permissions: [] });
    });

    it('rejects a subject outside EnumPolicySubject', () => {
        expect(() =>
            ProjectPermissionResponseSchema.parse({
                permissions: [{ subject: 'unknown', actions: [] }],
            })
        ).toThrow();
    });
});
