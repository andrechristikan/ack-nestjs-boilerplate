import type { PasswordHistory } from '@generated/prisma-client/client';
import type { IUserRef } from '@modules/user/interfaces/user.interface';

export interface IPasswordHistory extends PasswordHistory {
    user: IUserRef;
}
