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
        const result = WorkspaceJoinRequestRejectRequestSchema.safeParse({
            rejectReasonCode: 'unknownReason',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['rejectReasonCode'],
                code: 'invalid_value',
            }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = WorkspaceJoinRequestRejectRequestSchema.safeParse({
            ...payload,
            extra: true,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });
});
