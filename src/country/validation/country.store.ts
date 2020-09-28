export const CountryStoreRequest = {
    mobileNumberCode: {
        type: 'string',
        required: true,
        min: 1,
        max: 6
    },

    countryCode: {
        type: 'string',
        required: true,
        min: 1,
        max: 3
    },

    countryName: {
        type: 'string',
        required: true,
    }
};
