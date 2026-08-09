import { Device, DeviceOwnership, Session } from '@generated/prisma-client';
import { IUserRef } from '@modules/user/interfaces/user.interface';

export interface IDeviceOwnership extends DeviceOwnership {
    device: Device;
    user: IUserRef;
    revokedBy: IUserRef | null;
    _count: {
        sessions: number;
    };
    sessions?: Session[];
}
