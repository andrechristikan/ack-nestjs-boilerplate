import { PasswordHistory, User } from '@prisma/client';

export interface IPasswordHistory extends PasswordHistory {
    user: User;
}
