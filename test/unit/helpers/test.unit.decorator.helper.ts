import type { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';

export function buildDecoratorTarget(value: object): {
    target: object;
    propertyKey: string;
    descriptor: PropertyDescriptor;
} {
    return {
        target: {},
        propertyKey: 'handler',
        descriptor: {
            value,
            writable: true,
            enumerable: false,
            configurable: true,
        },
    };
}

export function getParamDecoratorFactory(
    target: object,
    propertyKey: string
): (data: unknown, ctx?: ExecutionContext) => unknown {
    const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        target.constructor,
        propertyKey
    ) as Record<
        string,
        { factory: (data: unknown, ctx?: ExecutionContext) => unknown }
    >;
    const [paramMetadata] = Object.values(metadata);

    return paramMetadata!.factory;
}

export function getDocResponseEntries(subject: object): IDocResponseEntry[] {
    return Reflect.getMetadata(
        DocResponseEntryMetaKey,
        subject
    ) as IDocResponseEntry[];
}

export function findDocResponseEntry(
    subject: object,
    messagePath: string
): IDocResponseEntry {
    const entries = getDocResponseEntries(subject);
    const entry = entries.find(
        candidate => candidate.messagePath === messagePath
    );

    if (!entry) {
        throw new Error(`No doc entry found for messagePath "${messagePath}"`);
    }

    return entry;
}

export function getHeaderParameterNames(
    parameters: { name: string; in: string }[]
): string[] {
    return parameters
        .filter(parameter => parameter.in === 'header')
        .map(parameter => parameter.name);
}
