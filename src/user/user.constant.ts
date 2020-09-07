export class UserStore {
    country: string;
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
    countryCode?: string;
    mobileNumberCode?: string;
    limit?: number;
    page?: number;
}

export class UserSearchCollection {
    email?: string | Record<string, any>;
    firstName?: string | Record<string, any>;
    lastName?: string | Record<string, any>;
    mobileNumber?: string;
    country?: {
        countryCode?: string;
        mobileNumberCode?: string;
    };
    limit?: number;
    page?: number;
}
