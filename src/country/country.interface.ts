export interface CountryStore {
    mobileNumberCode: string;
    countryCode: string;
    countryName: string;
}

export interface CountrySearch {
    mobileNumberCode?: string;
    countryCode?: string;
}
