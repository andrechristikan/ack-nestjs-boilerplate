import {
    CountryDoc,
    CountryEntity,
} from '@modules/country/repository/entities/country.entity';
import {
    TermPolicyDoc,
    TermPolicyEntity,
} from '@modules/term-policy/repository/entities/term-policy.entity';

export interface ITermPolicyEntity extends Omit<TermPolicyEntity, 'country'> {
    country: CountryEntity;
}

export interface ITermPolicyDoc extends Omit<TermPolicyDoc, 'country'> {
    country: CountryDoc;
}
