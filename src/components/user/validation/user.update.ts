export const UserUpdateRequest = {
    firstName: {
        type: 'string',
        lowercase: true,
        required: true
    },

    lastName: {
        type: 'string',
        lowercase: true,
        required: true
    }
};
