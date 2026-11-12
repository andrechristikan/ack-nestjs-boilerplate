import type {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import type { IActivityLogCreateManyPayload } from '@modules/activity-log/interfaces/activity-log.interface';
import type {
    EnumNotificationEmailProcess,
    EnumNotificationProcess,
    EnumNotificationPushProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import type {
    INotificationBulkQueuePayload,
    INotificationEmailBulkQueuePayload,
    INotificationEmailSendPayload,
    INotificationEmailSendUnregisteredPayload,
    INotificationNotifyPayload,
    INotificationPublishTermPolicyPayload,
    INotificationPushCleanupTokenEncryptedPayload,
    INotificationPushSendPayload,
} from '@modules/notification/interfaces/notification.interface';
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
    IUserImportByAdminPayload,
    IUserLockoutPayload,
} from '@modules/user/interfaces/user.interface';
import type {
    EnumCacheProcess,
    EnumCacheQueue,
} from '@common/cache/enums/cache.enum';
import type { ICacheInvalidatePayload } from '@common/cache/interfaces/cache.interface';
import type { Outbox } from '@generated/prisma-client/client';
import type { EnumQueuePriority } from '@common/queue/enums/queue.enum';

interface IOutboxEffectBase {
    priority: EnumQueuePriority;
    idempotencyKey: string | null;
}

interface IOutboxActivityLogCreateManyEffect extends IOutboxEffectBase {
    queue: EnumActivityLogQueue.activityLog;
    name: EnumActivityLogProcess.createMany;
    data: IActivityLogCreateManyPayload;
}

interface IOutboxCacheInvalidateEffect extends IOutboxEffectBase {
    queue: EnumCacheQueue.cache;
    name: EnumCacheProcess.invalidate;
    data: ICacheInvalidatePayload;
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

interface IOutboxUserImportByAdminEffect extends IOutboxEffectBase {
    queue: EnumUserQueue.user;
    name: EnumUserProcess.importByAdmin;
    data: IUserImportByAdminPayload;
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

interface IOutboxNotificationNotifyEffect extends IOutboxEffectBase {
    queue: EnumNotificationQueue.notification;
    name: EnumNotificationProcess.notify;
    data: INotificationNotifyPayload;
}

interface IOutboxNotificationPublishTermPolicyEffect extends IOutboxEffectBase {
    queue: EnumNotificationQueue.notification;
    name: EnumNotificationProcess.publishTermPolicy;
    data: INotificationBulkQueuePayload<INotificationPublishTermPolicyPayload>;
}

interface IOutboxNotificationResendPublishTermPolicyEffect extends IOutboxEffectBase {
    queue: EnumNotificationQueue.notification;
    name: EnumNotificationProcess.resendPublishTermPolicy;
    data: INotificationBulkQueuePayload<INotificationPublishTermPolicyPayload>;
}

interface IOutboxNotificationEmailPublishTermPolicyEffect extends IOutboxEffectBase {
    queue: EnumNotificationQueue.notificationEmail;
    name: EnumNotificationEmailProcess.publishTermPolicy;
    data: INotificationEmailBulkQueuePayload<INotificationPublishTermPolicyPayload>;
}

interface IOutboxNotificationEmailSendEffect extends IOutboxEffectBase {
    queue: EnumNotificationQueue.notificationEmail;
    name: EnumNotificationEmailProcess.send;
    data: INotificationEmailSendPayload;
}

interface IOutboxNotificationEmailSendUnregisteredEffect extends IOutboxEffectBase {
    queue: EnumNotificationQueue.notificationEmail;
    name: EnumNotificationEmailProcess.sendUnregistered;
    data: INotificationEmailSendUnregisteredPayload;
}

interface IOutboxNotificationPushSendEffect extends IOutboxEffectBase {
    queue: EnumNotificationQueue.notificationPush;
    name: EnumNotificationPushProcess.send;
    data: INotificationPushSendPayload;
}

interface IOutboxNotificationPushCleanupTokensEffect extends IOutboxEffectBase {
    queue: EnumNotificationQueue.notificationPush;
    name: EnumNotificationPushProcess.cleanupTokens;
    data: INotificationPushCleanupTokenEncryptedPayload;
}

export type IOutboxEffect =
    | IOutboxActivityLogCreateManyEffect
    | IOutboxCacheInvalidateEffect
    | IOutboxSessionPurgeLoginsEffect
    | IOutboxUserLockoutEffect
    | IOutboxUserDeletePhotoEffect
    | IOutboxUserImportByAdminEffect
    | IOutboxTermPolicyDeleteContentEffect
    | IOutboxTermPolicyCopyContentEffect
    | IOutboxNotificationNotifyEffect
    | IOutboxNotificationPublishTermPolicyEffect
    | IOutboxNotificationResendPublishTermPolicyEffect
    | IOutboxNotificationEmailPublishTermPolicyEffect
    | IOutboxNotificationEmailSendEffect
    | IOutboxNotificationEmailSendUnregisteredEffect
    | IOutboxNotificationPushSendEffect
    | IOutboxNotificationPushCleanupTokensEffect;

export interface IOutboxJobPayload {
    outboxId: string;
}

export interface IOutboxReconcileResult {
    stamped: boolean;
    missingRow: Outbox | null;
}
