import { EnumWorkspaceJoinRejectReason } from '@generated/prisma-client/client';
import { WorkspaceJoinRequestRejectRequestSchema } from '@modules/workspace/dtos/request/workspace.join-request-reject.request.dto';

describe('WorkspaceJoinRequestRejectRequestSchema', () => {
    const payload = {
        rejectReasonCode: EnumWorkspaceJoinRejectReason.wrongWorkspace,
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = WorkspaceJoinRequestRejectRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an unknown reject reason', () => {
        expect(() =>
            WorkspaceJoinRequestRejectRequestSchema.parse({
                rejectReasonCode: 'unknownReason',
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            WorkspaceJoinRequestRejectRequestSchema.parse({
                ...payload,
                extra: true,
            })
        ).toThrow();
    });
});
