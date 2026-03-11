import { PasswordHistory, User } from '@generated/prisma-client';

export interface IPasswordHistory extends PasswordHistory {
    user: User;
}
