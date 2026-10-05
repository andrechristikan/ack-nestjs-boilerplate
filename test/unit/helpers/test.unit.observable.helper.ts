import { throwError } from 'rxjs';
import type { Observable } from 'rxjs';

export function subscribeNext<T>(observable: Observable<T>): Promise<T> {
    return new Promise(resolve => {
        observable.subscribe(resolve);
    });
}

export function subscribeError(
    observable: Observable<unknown>
): Promise<unknown> {
    return new Promise(resolve => {
        observable.subscribe({ error: resolve });
    });
}

export function buildErrorObservable(error: unknown): Observable<never> {
    return throwError(() => error);
}
