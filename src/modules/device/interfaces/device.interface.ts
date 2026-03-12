import {
    Device,
    DeviceOwnership,
    Session,
    User,
} from '@generated/prisma-client';

export interface IDeviceOwnership extends DeviceOwnership {
    device: Device;
    user: User;
    _count: {
        sessions: number;
    };
    sessions?: Session[];
}
