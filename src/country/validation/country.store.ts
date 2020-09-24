import { ValidationRule } from 'pipe/validation.decorator';
import { Validation } from 'pipe/validation.class';

export class CountryStoreSchema extends Validation {


    @ValidationRule()
    setRules(): void {
        this.rules = {
            mobileNumberCode: {
                type: 'string',
                required: true,
                min: 1,
                max: 6,
            },

            countryCode: {
                type: 'string',
                required: true,
                lowercase: true,
                min: 1,
                max: 3,
            },

            countryName: {
                type: 'string',
                required: true,
                lowercase: true,
            },
        };
    }
}

const cou = new CountryStoreSchema();
console.log(cou);
