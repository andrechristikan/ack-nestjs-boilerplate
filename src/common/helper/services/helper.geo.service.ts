import { Injectable } from '@nestjs/common';
import { isPointWithinRadius } from 'geolib';
import { IHelperGeoService } from 'src/common/helper/interfaces/helper.geo-service.interface';
import {
    IHelperGeoCurrent,
    IHelperGeoRules,
} from 'src/common/helper/interfaces/helper.interface';

@Injectable()
export class HelperGeoService implements IHelperGeoService {
    inRadius(geoRule: IHelperGeoRules, geoCurrent: IHelperGeoCurrent): boolean {
        return isPointWithinRadius(
            { latitude: geoRule.latitude, longitude: geoRule.longitude },
            geoCurrent,
            geoRule.radiusInMeters
        );
    }
}
