import { WorkspaceJoinRequestCreateRequestSchema } from '@modules/workspace/dtos/request/workspace.join-request-create.request.dto';

describe('WorkspaceJoinRequestCreateRequestSchema', () => {
    const payload = {
        workspaceId: '507f1f77bcf86cd799439011',
        message: 'Please let me in',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = WorkspaceJoinRequestCreateRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses with only the required workspaceId', () => {
        const result = WorkspaceJoinRequestCreateRequestSchema.parse({
            workspaceId: payload.workspaceId,
        });

        expect(result).toEqual({ workspaceId: payload.workspaceId });
    });

    it('rejects a workspaceId that is not a MongoID', () => {
        expect(() =>
            WorkspaceJoinRequestCreateRequestSchema.parse({
                ...payload,
                workspaceId: 'not-an-id',
            })
        ).toThrow();
    });

    it('rejects a message over 500 characters', () => {
        expect(() =>
            WorkspaceJoinRequestCreateRequestSchema.parse({
                ...payload,
                message: 'a'.repeat(501),
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            WorkspaceJoinRequestCreateRequestSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });
});
