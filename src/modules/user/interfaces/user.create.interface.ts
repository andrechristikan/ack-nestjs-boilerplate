import type {
    EnumActivityLogAction,
    EnumUserReauthenticationAction,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';

export interface IUserCreateActivity {
    action: EnumActivityLogAction;
    userId: string;
    workspaceId: string | null;
    createdBy: string;
    metadata: IActivityLogMetadata;
}

export interface IUserCreateVerification {
    reference: string;
    token: string;
    type: EnumVerificationType;
    action: EnumUserReauthenticationAction | null;
    mobileNumberId: string | null;
    to: string;
    expiredAt: Date;
    verifiedAt: Date | null;
    isUsed: boolean;
}
