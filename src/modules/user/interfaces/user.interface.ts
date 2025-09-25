import { Country, Role, User, UserMobileNumber } from '@prisma/client';

export interface IUser extends User {
    role: Role;
}

export interface IUserProfile extends IUser {
    mobileNumbers: UserMobileNumber[];
    country: Country;
}
