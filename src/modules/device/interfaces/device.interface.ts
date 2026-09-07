import {
    Device,
    DeviceOwnership,
    EnumDevicePlatform,
    Session,
} from '@generated/prisma-client';
import { IUserRef } from '@modules/user/interfaces/user.interface';

export interface IDeviceIdentity {
    fingerprint: string;
    name?: string;
    platform?: EnumDevicePlatform;
    notificationToken?: string;
}

export interface IDeviceOwnership extends DeviceOwnership {
    device: Device;
    user: IUserRef;
    revokedBy: IUserRef | null;
    _count: {
        sessions: number;
    };
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
