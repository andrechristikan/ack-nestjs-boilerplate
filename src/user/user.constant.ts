export class UserStore {
    email: string;
    firstName: string;
    lastName: string;
    mobileNumber: string;
    password: string;
}

export class UserUpdate {
    firstName: string;
    lastName: string;
}

export class UserSearch {
    email?: string | Record<string, any>;
    firstName?: string | Record<string, any>;
    lastName?: string | Record<string, any>;
    mobileNumber?: string;
    limit?: number;
    page?: number;
}
