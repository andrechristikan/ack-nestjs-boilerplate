export interface ICountryStore {
    mobileNumberCode: string;
    countryCode: string;
    countryName: string;
}

export interface ICountrySearch {
    mobileNumberCode?: string;
    countryCode?: string;
}
