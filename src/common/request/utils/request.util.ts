import { IncomingMessage } from 'http';
import { isIP } from 'net';
import { Injectable } from '@nestjs/common';
import { getClientIp } from '@supercharge/request-ip';
import geoIp from 'geoip-lite';
import { UAParser } from 'ua-parser-js';
import {
    IRequestApp,
    IRequestGeoLocation,
    IRequestLog,
    IRequestUserAgent,
    IRequestUserAgentBrowser,
    IRequestUserAgentCpu,
    IRequestUserAgentDevice,
    IRequestUserAgentEngine,
    IRequestUserAgentOs,
} from '@common/request/interfaces/request.interface';

@Injectable()
export class RequestUtil {
    private groupOrNull<T>(group: T, values: (string | null)[]): T | null {
        return values.some(value => value !== null) ? group : null;
    }

    resolveThrottleTrackerIp(req: IRequestApp): string {
        const ip = req.ip ?? '';

        return isIP(ip) ? ip : (req.socket.remoteAddress ?? '');
    }

    parseUserAgent(raw: string | undefined): IRequestUserAgent {
        const result = UAParser(raw);

        const browser: IRequestUserAgentBrowser = {
            name: result.browser.name ?? null,
            version: result.browser.version ?? null,
            major: result.browser.major ?? null,
            type: result.browser.type ?? null,
        };
        const cpu: IRequestUserAgentCpu = {
            architecture: result.cpu.architecture ?? null,
        };
        const device: IRequestUserAgentDevice = {
            type: result.device.type ?? null,
            vendor: result.device.vendor ?? null,
            model: result.device.model ?? null,
        };
        const engine: IRequestUserAgentEngine = {
            name: result.engine.name ?? null,
            version: result.engine.version ?? null,
        };
        const os: IRequestUserAgentOs = {
            name: result.os.name ?? null,
            version: result.os.version ?? null,
        };

        return {
            ua: result.ua ?? null,
            browser: this.groupOrNull(browser, [
                browser.name,
                browser.version,
                browser.major,
                browser.type,
            ]),
            cpu: this.groupOrNull(cpu, [cpu.architecture]),
            device: this.groupOrNull(device, [
                device.type,
                device.vendor,
                device.model,
            ]),
            engine: this.groupOrNull(engine, [engine.name, engine.version]),
            os: this.groupOrNull(os, [os.name, os.version]),
        };
    }

    /**
     * Build the request-log context (ua / ip / geo) from a raw request.
     * Called once per HTTP request from the request-log middleware.
     */
    buildRequestLog(req: IncomingMessage): IRequestLog {
        const userAgent = this.parseUserAgent(req.headers['user-agent']);
        const ipAddress = getClientIp(req) ?? null;

        let geoLocation: IRequestGeoLocation | null = null;
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
