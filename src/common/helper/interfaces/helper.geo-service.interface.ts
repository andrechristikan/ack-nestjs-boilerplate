import {
    IHelperGeoCurrent,
    IHelperGeoRules,
} from 'src/common/helper/interfaces/helper.interface';

export interface IHelperGeoService {
    inRadius(geoRule: IHelperGeoRules, geoCurrent: IHelperGeoCurrent): boolean;
}
