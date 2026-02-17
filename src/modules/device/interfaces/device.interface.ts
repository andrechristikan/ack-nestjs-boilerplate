import { Device, Session, User } from '@generated/prisma-client';
import { IUser } from '@modules/user/interfaces/user.interface';

export interface IDevice extends Device {
    user: User;
    _count: {
        sessions: number;
    };
    sessions?: Session[];
}

export interface IDeviceRemoveResult {
    device: Device;
    sessions: { id: string }[];
}
