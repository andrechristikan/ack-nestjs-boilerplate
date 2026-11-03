import 'dotenv/config';
import * as Sentry from '@sentry/nestjs';
import type { LogSeverityLevel } from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import appConfigFunction from '@configs/app.config';
import loggerConfigFunction from '@configs/logger.config';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { LoggerHttpMethodPrefixRegex } from '@common/logger/constants/logger.constant';
import { SentryUtil } from '@common/sentry/utils/sentry.util';
import { QueueException } from '@queues/exceptions/queue.exception';

const appConfigs = appConfigFunction();
const loggerConfigs = loggerConfigFunction();
const sentryUtil = new SentryUtil();

const sentryLogLevels: LogSeverityLevel[] =
    appConfigs.env === EnumAppEnvironment.production
        ? ['warn', 'error', 'fatal']
        : ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

const isProduction = appConfigs.env === EnumAppEnvironment.production;
const tracesSampleRate = isProduction
    ? loggerConfigs.sentry.tracesSampleRateProduction
    : loggerConfigs.sentry.tracesSampleRate;
const profilesSampleRate = isProduction
    ? loggerConfigs.sentry.profilesSampleRateProduction
    : loggerConfigs.sentry.profilesSampleRate;

function isExcludedUrl(url: string | null, patterns: string[]): boolean {
    if (!url || !patterns.length) {
        return false;
    }

    let pathname: string;
    try {
        pathname = new URL(url).pathname;
    } catch {
        pathname = url.split('?')[0]!.split('#')[0]!;
    }

    const normalizedPath = pathname.toLowerCase();

    return patterns.some(pattern => {
        if (!pattern) {
            return false;
        }

        const normalizedPattern = pattern.toLowerCase();

        if (normalizedPath === normalizedPattern) {
            return true;
        }

        if (normalizedPattern.endsWith('*')) {
            const base = normalizedPattern.slice(0, -1);
            return base ? normalizedPath.startsWith(base) : true;
        }

        return false;
    });
}

if (loggerConfigs.sentry.dsn) {
    Sentry.init({
        dsn: loggerConfigs.sentry.dsn,
        debug: false,
        environment: appConfigs.env,
        release: appConfigs.version,
        enableLogs: true,
        integrations: [
            nodeProfilingIntegration(),
            Sentry.pinoIntegration({ log: { levels: sentryLogLevels } }),
        ],
        tracesSampleRate,
        profilesSampleRate,
        normalizeDepth: 3,
        maxValueLength: 1000,
        attachStacktrace: true,
        sendDefaultPii: false,
        maxBreadcrumbs: 30,
        beforeSend(event, hint) {
            const originalException = hint?.originalException;
            if (
                originalException instanceof QueueException &&
                !originalException.isFatal
            ) {
                return null;
            }

            if (event.request) {
                const url = event.request.url ?? null;

                if (isExcludedUrl(url, loggerConfigs.excludedRoutes)) {
                    return null;
                }
            }

            if (event.request && event.contexts && event.contexts.response) {
                const statusCode = event.contexts.response.status_code;
                if (statusCode && statusCode < 500) {
                    return null;
                }
            }

            if (event.level === 'info' || event.level === 'debug') {
                return null;
            }

            return sentryUtil.scrubEvent(event);
        },
        beforeSendTransaction(event) {
            return sentryUtil.scrubEvent(event);
        },
        beforeBreadcrumb(breadcrumb) {
            return sentryUtil.scrubBreadcrumb(breadcrumb);
        },
        beforeSendLog(log) {
            return sentryUtil.scrubLog(log);
        },
        tracesSampler: samplingContext => {
            if (
                isExcludedUrl(
                    samplingContext.normalizedRequest?.url ?? null,
                    loggerConfigs.excludedRoutes
                ) ||
                isExcludedUrl(
                    samplingContext.name.replace(
                        LoggerHttpMethodPrefixRegex,
                        ''
                    ),
                    loggerConfigs.excludedRoutes
                )
            ) {
                return 0;
            }

            return tracesSampleRate;
        },
    });
}
