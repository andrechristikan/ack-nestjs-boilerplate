import { IPaginationQueryReturn } from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { CountryResponseDto } from '@modules/country/dtos/response/country.response.dto';
import { CountryEntity } from '@modules/country/repository/entities/country.entity';

export interface ICountryService {
    findAllWithPagination({
        search,
        limit,
        skip,
        order,
    }: IPaginationQueryReturn): Promise<
        IResponsePagingReturn<CountryResponseDto>
    >;
    mapList(countries: CountryEntity[]): CountryResponseDto[];
    mapOne(country: CountryEntity): CountryResponseDto;
    findByAlpha2Code(alpha2Code: string): Promise<CountryEntity>;
}
