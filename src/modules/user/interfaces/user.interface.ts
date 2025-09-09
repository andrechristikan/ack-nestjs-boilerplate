import { Country, Role, User, UserMobile } from '@prisma/client';

export interface IUser extends User {
    role: Role;
}

export interface IUserProfile extends IUser {
    mobileNumbers: UserMobile[];
    country: Country;
}
