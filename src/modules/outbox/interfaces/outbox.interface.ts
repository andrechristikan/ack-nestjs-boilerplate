import type {
    EnumSessionProcess,
    EnumSessionQueue,
} from '@modules/session/enums/session.enum';
import type { ISessionPurgeLoginsPayload } from '@modules/session/interfaces/session.interface';
import type {
    EnumTermPolicyProcess,
    EnumTermPolicyQueue,
} from '@modules/term-policy/enums/term-policy.enum';
import type {
    ITermPolicyCopyContentPayload,
    ITermPolicyDeleteContentPayload,
} from '@modules/term-policy/interfaces/term-policy.interface';
import type {
    EnumUserProcess,
    EnumUserQueue,
} from '@modules/user/enums/user.enum';
import type {
    IUserDeletePhotoPayload,
    IUserLockoutPayload,
} from '@modules/user/interfaces/user.interface';
import type { Outbox } from '@generated/prisma-client/client';
import type { EnumQueuePriority } from '@common/queue/enums/queue.enum';

interface IOutboxEffectBase {
    priority: EnumQueuePriority;
    idempotencyKey: string | null;
}

interface IOutboxSessionPurgeLoginsEffect extends IOutboxEffectBase {
    queue: EnumSessionQueue.session;
    name: EnumSessionProcess.purgeLogins;
    data: ISessionPurgeLoginsPayload;
}

interface IOutboxUserLockoutEffect extends IOutboxEffectBase {
    queue: EnumUserQueue.user;
    name: EnumUserProcess.lockout;
    data: IUserLockoutPayload;
}

interface IOutboxUserDeletePhotoEffect extends IOutboxEffectBase {
    queue: EnumUserQueue.user;
    name: EnumUserProcess.deletePhoto;
    data: IUserDeletePhotoPayload;
}

interface IOutboxTermPolicyDeleteContentEffect extends IOutboxEffectBase {
    queue: EnumTermPolicyQueue.termPolicy;
    name: EnumTermPolicyProcess.deleteContent;
    data: ITermPolicyDeleteContentPayload;
}

interface IOutboxTermPolicyCopyContentEffect extends IOutboxEffectBase {
    queue: EnumTermPolicyQueue.termPolicy;
    name: EnumTermPolicyProcess.copyContent;
    data: ITermPolicyCopyContentPayload;
}

export type IOutboxEffect =
    | IOutboxSessionPurgeLoginsEffect
    | IOutboxUserLockoutEffect
    | IOutboxUserDeletePhotoEffect
    | IOutboxTermPolicyDeleteContentEffect
    | IOutboxTermPolicyCopyContentEffect;

export interface IOutboxJobPayload {
    outboxId: string;
}

export interface IOutboxReconcileResult {
    stamped: boolean;
    missingRow: Outbox | null;
}
