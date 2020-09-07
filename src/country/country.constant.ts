export class CountryStore {
    mobileNumberCode: string;
    countryCode: string;
    countryName: string;
}

export class CountrySearch {
    mobileNumberCode?: string;
    countryCode?: string;
    limit?: number;
    page?: number;
}
