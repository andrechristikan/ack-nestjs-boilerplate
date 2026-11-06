import { throwError } from 'rxjs';
import type { Observable } from 'rxjs';

export async function subscribeNext<T>(observable: Observable<T>): Promise<T> {
    return await new Promise(resolve => {
        observable.subscribe(resolve);
    });
}

export async function subscribeError(
    observable: Observable<unknown>
): Promise<unknown> {
    return await new Promise(resolve => {
        observable.subscribe({ error: resolve });
    });
}

export function buildErrorObservable(error: unknown): Observable<never> {
    return throwError(() => error);
}
