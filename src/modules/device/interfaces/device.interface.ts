import { EnumDevicePlatform } from '@generated/prisma-client/client';
import type { Device, DeviceOwnership } from '@generated/prisma-client/client';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import type { Prisma } from '@generated/prisma-client/client';
import type { UserRefSelect } from '@modules/user/constants/user.constant';
import type { IUserRef } from '@modules/user/interfaces/user.interface';

export interface IDeviceIdentity {
    fingerprint: string;
    name: string | null;
    platform: EnumDevicePlatform;
    notificationToken: string | null;
}

export interface IDeviceLoginUpsert {
    device: Device;
    deviceOwnership: DeviceOwnership;
    isNewDevice: boolean;
}

export interface IDeviceOwnershipLoginUpsert {
    deviceOwnership: DeviceOwnership;
    isNewOwnership: boolean;
}

export interface IDeviceOwnership extends DeviceOwnership {
    device: Device;
    user: IUserRef;
    revokedBy: IUserRef | null;
    _count: {
        sessions: number;
    };
}

export interface IDeviceOwnershipSessionRef {
    id: string;
}

export interface IDeviceOwnershipWithSession extends IDeviceOwnership {
    sessions: IDeviceOwnershipSessionRef[];
}

export interface IDeviceOwnershipDetail extends IDeviceOwnership {
    activeSessionCount: number;
    isCurrentDevice: boolean;
}

export interface IDeviceRefresh {
    name: string | null;
    platform: EnumDevicePlatform;
    notificationToken: string | null;
}

export interface IDeviceOwnershipAnalyticUserCount {
    userId: string;
    count: number;
}

export interface IDeviceRemoveResult {
    deviceOwnership: IDeviceOwnership;
    revokedSessions: ISessionRef[];
}

export interface IDeviceOwnershipInclude {
    device: true;
    user: { select: typeof UserRefSelect };
    revokedBy: { select: typeof UserRefSelect };
    _count: { select: { sessions: { where: Prisma.SessionWhereInput } } };
}
