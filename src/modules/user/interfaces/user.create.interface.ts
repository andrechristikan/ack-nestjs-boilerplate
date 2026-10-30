import type {
    EnumActivityLogAction,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
} from '@modules/user/interfaces/user.interface';

export interface IUserCreated {
    inputs: IUserCreateWithWorkspaceInput[];
    users: IUser[];
}

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
    to: string;
    expiredAt: Date;
    verifiedAt: Date | null;
    isUsed: boolean;
}
