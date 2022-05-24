import { Injectable } from '@nestjs/common';
import geoLib from 'geolib';
import { IGeoCurrent, IGeoRules } from '../helper.interface';

@Injectable()
export class HelperGeoService {
    inRadius(geoRule: IGeoRules, geoCurrent: IGeoCurrent): boolean {
        return geoLib.isPointWithinRadius(
            { latitude: geoRule.latitude, longitude: geoRule.longitude },
            geoCurrent,
            geoRule.inRadius
        );
    }
}
