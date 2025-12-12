import {
    ExecutionContext,
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import {
    REQUEST_CUSTOM_TIMEOUT_META_KEY,
    REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY,
    REQUEST_ENV_META_KEY,
} from '@common/request/constants/request.constant';
import ms from 'ms';
import { RequestEnvGuard } from '@common/request/guards/request.env.guard';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { RealIp } from 'nestjs-real-ip';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { UAParser } from 'ua-parser-js';

/**
 * Request timeout decorator for route handlers.
 * Sets a custom timeout value for specific endpoints.
 * @param {ms.StringValue} seconds - Timeout duration in ms.StringValue format
 * @returns {MethodDecorator} A method decorator that applies custom timeout metadata
 */
export function RequestTimeout(seconds: ms.StringValue): MethodDecorator {
    return applyDecorators(
        SetMetadata(REQUEST_CUSTOM_TIMEOUT_META_KEY, true),
        SetMetadata(REQUEST_CUSTOM_TIMEOUT_VALUE_META_KEY, seconds)
    );
}

/**
 * Environment protection decorator for route handlers.
 * Restricts access to endpoints based on the current application environment.
 * @param {...EnumAppEnvironment[]} envs - Array of application environments where the route should be accessible
 * @returns {MethodDecorator} A method decorator that applies environment-based access control
 */
export function RequestEnvProtected(
    ...envs: EnumAppEnvironment[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(RequestEnvGuard),
        SetMetadata(REQUEST_ENV_META_KEY, envs)
    );
}

/**
 * Parameter decorator to extract the IP address from the request
 * Uses the nestjs-real-ip package to get the real IP address of the client.
 * @returns The IP address as a string
 */
export const RequestIPAddress = RealIp;

/**
 * Parameter decorator to extract and parse the User-Agent header from the request
 * Uses the UAParser library to parse the User-Agent string into a structured object.
 *
 * @param _ - Unused parameter
 * @param ctx - Execution context containing the request information
 * @returns The parsed User-Agent information as a UAParser.IResult object
 */
export const RequestUserAgent = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): UAParser.IResult => {
        const { headers } = ctx.switchToHttp().getRequest<IRequestApp>();
        const userAgent = headers['user-agent'];
        return UAParser(userAgent);
    }
);
