import { Device, Session, User } from '@generated/prisma-client';

export interface IDevice extends Device {
    user: User;
    _count: {
        sessions: number;
    };
    sessions?: Session[];
}
