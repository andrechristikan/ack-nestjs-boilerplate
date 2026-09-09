import {
    IRequestGeoLocation,
    IRequestUserAgent,
} from '@common/request/interfaces/request.interface';

export interface IRequestContextService {
    getHostname(): string;
    resolveCity(geoLocation?: IRequestGeoLocation | null): string;
    resolveDevice(userAgent: IRequestUserAgent): string;
}
