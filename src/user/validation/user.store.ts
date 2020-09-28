export const UserStoreRequest = {
    country: {
        type: 'string',
        required: true
    },

    email: {
        type: 'email',
        lowercase: true,
        required: true
    },

    firstName: {
        type: 'string',
        lowercase: true,
        required: true
    },

    lastName: {
        type: 'string',
        lowercase: true,
        required: true
    },

    mobileNumber: {
        type: 'string',
        min: 10,
        max: 13,
        required: true
    },

    password: {
        type: 'string',
        required: true
    }
};
