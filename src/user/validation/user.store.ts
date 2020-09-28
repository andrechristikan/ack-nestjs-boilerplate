export const UserStoreRequest = {
    country: {
        type: 'string',
        required: true
    },

    email: {
        type: 'email',
        required: true
    },

    firstName: {
        type: 'string',
        required: true
    },

    lastName: {
        type: 'string',
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
