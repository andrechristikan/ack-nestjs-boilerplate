import { IRequestContextService } from '@common/request/interfaces/request.context.service.interface';
import {
    IRequestGeoLocation,
    IRequestUserAgent,
} from '@common/request/interfaces/request.interface';
import { Injectable } from '@nestjs/common';
import { hostname } from 'os';

@Injectable()
export class RequestContextService implements IRequestContextService {
    getHostname(): string {
        return hostname();
    }

    resolveCity(geoLocation?: IRequestGeoLocation | null): string {
        return geoLocation?.city ?? 'Unknown Location';
    }

    resolveDevice(userAgent: IRequestUserAgent): string {
        const { device, os, browser } = userAgent;

        if (device?.vendor && device?.model) {
            return `${device.vendor} ${device.model}`;
        }

        if (os?.name) {
            return os.name;
        }

        if (browser?.name) {
            return browser.name;
        }

        return 'Unknown Device';
    }
}
