import { PasswordHistory } from '@generated/prisma-client';
import { IUserRef } from '@modules/user/interfaces/user.interface';

export interface IPasswordHistory extends PasswordHistory {
    user: IUserRef;
}
