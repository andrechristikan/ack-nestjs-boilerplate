import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import geoIp from 'geoip-lite';
import { UAParser } from 'ua-parser-js';
import type {
    GeoLocation,
    UserAgent,
    UserAgentBrowser,
    UserAgentCpu,
    UserAgentDevice,
    UserAgentEngine,
    UserAgentOs,
} from '@generated/prisma-client/client';
import type { IRequestLog } from '@common/request/interfaces/request.interface';

@Injectable()
export class RequestUtil {
    private groupOrNull<T>(group: T, values: (string | null)[]): T | null {
        return values.some(value => value !== null) ? group : null;
    }

    getClientIp(req: Request): string {
        return req.ip ?? req.socket.remoteAddress ?? '';
    }

    parseUserAgent(raw: string | null): UserAgent {
        const result = UAParser(raw ?? '');

        const browser: UserAgentBrowser = {
            name: result.browser.name ?? null,
            version: result.browser.version ?? null,
            major: result.browser.major ?? null,
            type: result.browser.type ?? null,
        };
        const cpu: UserAgentCpu = {
            architecture: result.cpu.architecture ?? null,
        };
        const device: UserAgentDevice = {
            type: result.device.type ?? null,
            vendor: result.device.vendor ?? null,
            model: result.device.model ?? null,
        };
        const engine: UserAgentEngine = {
            name: result.engine.name ?? null,
            version: result.engine.version ?? null,
        };
        const os: UserAgentOs = {
            name: result.os.name ?? null,
            version: result.os.version ?? null,
        };

        const browserGroup = this.groupOrNull(browser, [
            browser.name,
            browser.version,
            browser.major,
            browser.type,
        ]);
        const cpuGroup = this.groupOrNull(cpu, [cpu.architecture]);
        const deviceGroup = this.groupOrNull(device, [
            device.type,
            device.vendor,
            device.model,
        ]);
        const engineGroup = this.groupOrNull(engine, [
            engine.name,
            engine.version,
        ]);
        const osGroup = this.groupOrNull(os, [os.name, os.version]);

        return {
            ua: result.ua ?? null,
            browser: browserGroup,
            cpu: cpuGroup,
            device: deviceGroup,
            engine: engineGroup,
            os: osGroup,
        };
    }

    buildRequestLog(req: Request): IRequestLog {
        const userAgent = this.parseUserAgent(
            req.headers['user-agent'] ?? null
        );
        const clientIp = this.getClientIp(req);
        const ipAddress = clientIp === '' ? null : clientIp;

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
