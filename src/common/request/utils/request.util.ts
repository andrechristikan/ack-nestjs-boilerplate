import { IncomingMessage } from 'http';
import { Injectable } from '@nestjs/common';
import { getClientIp } from '@supercharge/request-ip';
import geoIp from 'geoip-lite';
import { UAParser } from 'ua-parser-js';
import { GeoLocation, UserAgent } from '@generated/prisma-client';
import { IRequestLog } from '@common/request/interfaces/request.interface';

@Injectable()
export class RequestUtil {
    /**
     * Build the request-log context (ua / ip / geo) from a raw request.
     * Called once per HTTP request from the request-log middleware.
     */
    buildRequestLog(req: IncomingMessage): IRequestLog {
        const userAgent = UAParser(req.headers['user-agent']) as UserAgent;
        const ipAddress = getClientIp(req) ?? null;

        let geoLocation: GeoLocation | null = null;
        if (ipAddress) {
            const geo = geoIp.lookup(ipAddress);
            if (geo) {
                geoLocation = {
                    latitude: geo.ll[0],
                    longitude: geo.ll[1],
                    country: geo.country,
                    region: geo.region,
                    city: geo.city,
                };
            }
        }

        return { userAgent, ipAddress, geoLocation };
    }
}
