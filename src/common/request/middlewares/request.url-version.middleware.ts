import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Response } from 'express';
import { IRequestApp } from '@common/request/interfaces/request.interface';

/**
 * URL-based API versioning middleware for managing multiple API versions.
 *
 * This middleware extracts and validates API version information from incoming request URLs,
 * enabling the application to support multiple API versions simultaneously. It parses
 * version identifiers from URL paths and attaches the resolved version to the request
 * object for downstream processing by controllers and services.
 *
 * URL Versioning Features:
 * - Automatic version extraction from URL paths
 * - Configurable version prefix and format
 * - Fallback to default version when no version is specified
 * - Support for disabled versioning mode
 * - Integration with global prefix configuration
 *
 * URL Format Support:
 * - `/api/v1/resource` - Standard versioned endpoints
 * - `/api/resource` - Unversioned endpoints (uses default version)
 * - Configurable global prefix and version prefix
 *
 * The extracted version is stored in the request object as `__version` property
 * and can be accessed by version-aware route handlers and services.
 *
 * @implements {NestMiddleware} - NestJS middleware interface for request processing
 */
@Injectable()
export class RequestUrlVersionMiddleware implements NestMiddleware {
    private readonly globalPrefix: string;

    private readonly urlVersionEnable: boolean;
    private readonly urlVersionPrefix: string;
    private readonly urlVersion: string;

    constructor(private readonly configService: ConfigService) {
        this.globalPrefix = this.configService.get<string>('app.globalPrefix');
        this.urlVersionEnable = this.configService.get<boolean>(
            'app.urlVersion.enable'
        );
        this.urlVersionPrefix = this.configService.get<string>(
            'app.urlVersion.prefix'
        );
        this.urlVersion = this.configService.get<string>(
            'app.urlVersion.version'
        );
    }

    /**
     * Processes incoming requests to extract and validate API version information.
     *
     * Analyzes the request URL to determine the API version being requested.
     * If URL versioning is enabled and the URL contains a version identifier,
     * it extracts and validates the version. Otherwise, it falls back to the
     * configured default version.
     *
     * @param req - The Express request object extended with custom properties
     * @param _res - The Express response object (unused in version processing)
     * @param next - The next middleware function in the stack
     *
     * @returns Promise that resolves when version processing is complete
     */
    async use(
        req: IRequestApp,
        _res: Response,
        next: NextFunction
    ): Promise<void> {
        const originalUrl: string = req.originalUrl;
        let version = this.urlVersion;
        if (
            this.urlVersionEnable &&
            originalUrl.startsWith(
                `${this.globalPrefix}/${this.urlVersionPrefix}`
            )
        ) {
            const url: string[] = originalUrl.split('/');
            version = url[2].replace(this.urlVersionPrefix, '');
        }

        req.__version = version;

        next();
    }
}
