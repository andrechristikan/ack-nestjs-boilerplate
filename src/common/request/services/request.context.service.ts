import { IRequestContextService } from '@common/request/interfaces/request.context.service.interface';
import { GeoLocation, UserAgent } from '@generated/prisma-client';
import { Injectable } from '@nestjs/common';
import { hostname } from 'os';

@Injectable()
export class RequestContextService implements IRequestContextService {
    getHostname(): string {
        return hostname();
    }

    resolveCity(geoLocation?: GeoLocation): string {
        return geoLocation?.city ?? 'Unknown Location';
    }

    resolveDevice(userAgent: UserAgent): string {
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
