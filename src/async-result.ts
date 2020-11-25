import {Observable, Subscription} from "rxjs";

export type AsyncResultRequestListener = () => void;
export type AsyncResultDataListener = () => void;
export type AsyncResultEndListener = () => void;

export class EmptyBufferError extends Error {
    constructor() {
        super('Pull buffer is empty');
    }
}

export class NoResultError extends Error {
    constructor() {
        super('No result');
    }
}


export class AsyncResult<T> implements AsyncResult<T> {
    static from<T>(value: T | AsyncResult<T> | Promise<T> | Observable<T>): AsyncResult<T> {
        if (value instanceof Observable) {
            return AsyncResult.fromObservable(value);
        } else if (value instanceof Promise) {
            return AsyncResult.fromPromise(value);
        } else if (value instanceof AsyncResult) {
            return value;
        } else {
            return AsyncResult.fromValue(value);
        }
    }

    static fromValue<T>(...values: T[]): AsyncResult<T> {
        const asyncResult = new AsyncResult<T>();
        for (const value of values) {
            asyncResult.push(value);
        }
        asyncResult.end();
        return asyncResult;
    }

    static fromPromise<T>(promise: Promise<T>): AsyncResult<T> {
        const asyncResult = new AsyncResult<T>();
        promise.then(
            value => {
                asyncResult.push(value);
                asyncResult.end();
            },
            reason => {
                asyncResult.end();
            }
        );
        return asyncResult;
    }

    static fromObservable<T>(observable: Observable<T>, waitRequest: boolean = true): AsyncResult<T> {
        const asyncResult = new AsyncResult<T>();
        let subscription: Subscription | undefined = undefined;
        asyncResult.when('end', () => {
            subscription?.unsubscribe();
        });
        const subscribe = () => {
            if (subscription == null) {
                subscription = observable.subscribe({
                    next: value => asyncResult.push(value)
                }).add(
                    () => asyncResult.end()
                );
            }
        }

        if (waitRequest) {
            asyncResult.when('request', subscribe);
        } else {
            subscribe();
        }

        return asyncResult;
    }

    asObservable(request: boolean = true): Observable<T> {
        return new Observable<T>(subscriber => {
            if (request) {
                this.request();
            }

            const onData = () => {
                while(this.buffered) {
                    subscriber.next(this.pull());
                }
            };
            const onEnd = () => {
                while(this.buffered) {
                    subscriber.next(this.pull());
                }
                subscriber.complete();
            };

            this.when('data', onData);
            this.when('end', onEnd);

            return () => {
                this.off('data', onData);
                this.off('end', onEnd);
                this.end();
            };

        });
    }

    asPromise(request: boolean = true): Promise<T> {
        return new Promise<T>(
            (resolve, reject) => {
                if (request) {
                    this.request();
                }

                const cleanup = () => {
                    this.off('data', onData);
                    this.off('end', onEnd);
                    this.end();
                }

                const onData = () => {
                    if (this.buffered) {
                        cleanup();
                        resolve(this.pull());
                    }
                };
                const onEnd = () => {
                    cleanup();

                    if (this.buffered) {
                        resolve(this.pull());
                    } else {
                        reject(new NoResultError());
                    }
                };

                this.when('data', onData);
                this.when('end', onEnd);
            }
        );
    }

    private buffer: T[] = [];

    get buffered(): boolean {
        return this.buffer.length > 0;
    }

    private _ended = false;
    get ended(): boolean {
        return this._ended;
    }

    end(): void {
        if (!this._ended) {
            this._ended = true;
            this.setInitial('end');
            this.resetInitial('request');
            this.emitEvent('end');
        }
    }

    pull(): T {
        if (this.buffer.length === 0) {
            throw new EmptyBufferError();
        } else {
            const data = this.buffer.splice(0, 1)[0];

            if (this.buffer.length === 0) {
                this.resetInitial('data');
            }

            return data;
        }
    }

    push(data: T): boolean {
        if (this._ended) {
            return false;
        } else {
            this.buffer.push(data);
            this.setInitial('data');
            this.emitEvent('data');
        }
    }

    private _requested: boolean;
    request(): boolean {
        if (this._ended) {
            return false;
        } else {
            if (this._requested) {
                return false;
            } else {
                this._requested = true;
                this.setInitial('request');
                this.emitEvent('request');
            }
        }
    }

    private listeners: {
        data?: AsyncResultDataListener[],
        end?: AsyncResultEndListener[],
        request?: AsyncResultRequestListener[]
    } = {};
    private initials: {
        data?: boolean,
        end?: boolean,
        request?: boolean
    } = {};

    private emitEvent(event: 'data' | 'end' | 'request') {
        const listeners = this.listeners[event];
        if (listeners != null) {
            for (const listener of listeners) {
                this.notifyListener(listener);
            }
        }
    }
    private setInitial(event: 'data' | 'end' | 'request') {
        this.initials[event] = true;
    }
    private resetInitial(event: 'data' | 'end' | 'request') {
        this.initials[event] = false;
    }

    private queuedListeners: (AsyncResultDataListener | AsyncResultEndListener)[] | undefined = undefined;

    private notifyListener(listener: AsyncResultDataListener | AsyncResultEndListener) {
        if (this.queuedListeners == null) {
            setImmediate(() => {
                const listeners = this.queuedListeners;
                this.queuedListeners = undefined;
                for (const listener of listeners) {
                    try {
                        listener();
                    } catch (e) {
                        console.error('ERROR while invoking AsyncResult listener', e);
                    }
                }

            });
            this.queuedListeners = [];
        }

        const index = this.queuedListeners.indexOf(listener);
        if (index === -1) {
            this.queuedListeners.push(listener);
        }
    }

    when(event: 'data', listener: AsyncResultDataListener, initial?: boolean): this;
    when(event: 'end', listener: AsyncResultDataListener, initial?: boolean): this;
    when(event: 'request', listener: AsyncResultRequestListener, initial?: boolean): this;
    when(event: 'data' | 'end' | 'request', listener: AsyncResultDataListener | AsyncResultEndListener | AsyncResultRequestListener, initial: boolean = true): this {

        const listeners = this.listeners[event] ??= [];
        const index = listeners.indexOf(listener);
        if (index === -1) {
            listeners.push(listener);

            if (initial && (this.initials[event] ?? false)) {
                this.notifyListener(listener);
            }
        }

        return this;
    }

    off(event: 'data', listener: AsyncResultDataListener): this;
    off(event: 'end', listener: AsyncResultEndListener): this;
    off(event: 'request', listener: AsyncResultEndListener): this;
    off(event: 'data' | 'end' | 'request', listener: AsyncResultDataListener | AsyncResultEndListener | AsyncResultRequestListener): this {
        const listeners = this.listeners[event];
        if (listeners != null) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }

        return this;
    }
}
