export const UserSearchRequest = {
    email: {
        type: 'string'
    },

    firstName: {
        type: 'string'
    },

    lastName: {
        type: 'string'
    },

    mobileNumber: {
        type: 'string'
    },

    countryCode: {
        type: 'string'
    },

    mobileNumberCode: {
        type: 'string'
    },

    limit: {
        type: 'number',
        positive: true
    },

    page: {
        type: 'number',
        positive: true
    }
};
