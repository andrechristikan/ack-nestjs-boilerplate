import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

export function e2eGet(app: INestApplication, path: string): request.Test {
    return request(app.getHttpServer()).get(path);
}

export function e2ePost(app: INestApplication, path: string): request.Test {
    return request(app.getHttpServer()).post(path);
}

export function e2ePut(app: INestApplication, path: string): request.Test {
    return request(app.getHttpServer()).put(path);
}

export function e2ePatch(app: INestApplication, path: string): request.Test {
    return request(app.getHttpServer()).patch(path);
}

export function e2eDelete(app: INestApplication, path: string): request.Test {
    return request(app.getHttpServer()).delete(path);
}

export function withBearer(
    testRequest: request.Test,
    token: string
): request.Test {
    return testRequest.set('Authorization', `Bearer ${token}`);
}

export function withApiKey(
    testRequest: request.Test,
    apiKey: string
): request.Test {
    return testRequest.set('x-api-key', apiKey);
}

export function withWorkspace(
    testRequest: request.Test,
    workspaceId: string
): request.Test {
    return testRequest.set('x-workspace-id', workspaceId);
}

export function withLanguage(
    testRequest: request.Test,
    language: string
): request.Test {
    return testRequest.set('x-custom-lang', language);
}

export function withCorrelationId(
    testRequest: request.Test,
    correlationId: string
): request.Test {
    return testRequest.set('x-correlation-id', correlationId);
}
