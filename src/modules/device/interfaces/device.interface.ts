import { EnumDevicePlatform } from '@generated/prisma-client/client';
import type {
    Device,
    DeviceOwnership,
    Session,
} from '@generated/prisma-client/client';
import type { IUserRef } from '@modules/user/interfaces/user.interface';

export interface IDeviceIdentity {
    fingerprint: string;
    name?: string;
    platform?: EnumDevicePlatform;
    notificationToken?: string;
}

export interface IDeviceLoginUpsert {
    device: Device;
    deviceOwnership: DeviceOwnership;
    isNewDevice: boolean;
}

export interface IDeviceOwnership extends DeviceOwnership {
    device: Device;
    user: IUserRef;
    revokedBy: IUserRef | null;
    _count: {
        sessions: number;
    };
}

export interface IDeviceOwnershipWithDevice extends DeviceOwnership {
    device: Device;
}

export interface IDeviceOwnershipWithSession extends IDeviceOwnership {
    sessions: Session[];
}

export interface IDeviceOwnershipDetail extends IDeviceOwnership {
    activeSessionCount: number;
    isCurrentDevice: boolean;
}

export interface IDeviceRefresh {
    name?: string;
    platform?: EnumDevicePlatform;
    notificationToken?: string;
}
