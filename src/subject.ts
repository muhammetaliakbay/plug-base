import {AsyncResult} from "./async-result";
import {Observable} from "rxjs";

export type Modifier<ARGS extends any[], T>
    = (this: InvocationContext<ARGS, T>, ...args: ARGS) => T | AsyncResult<T> | Promise<T> | Observable<T>;

export interface InvocationContext<ARGS extends any[], T> {
    overridden: Invocation<ARGS, T>;
}
export type Invocation<ARGS extends any[], T> = (...args: ARGS) => AsyncResult<T>;

export interface ModifierRegistration {
    unregister();
}

export interface Subject<ARGS extends any[], T> {
    pre(modifier: Modifier<ARGS, T>): ModifierRegistration;
    post(modifier: Modifier<ARGS, T>): ModifierRegistration;
    invoke(...args: ARGS): AsyncResult<T>;
}

export function createSubject<ARGS extends any[], T>(
    genesis?: Modifier<any, any>
): Subject<ARGS, T> {
    return new SubjectImpl<ARGS, T>(
        genesis
    );
}

class ModifierRegistrationImpl<ARGS extends any[], T> implements ModifierRegistration {
    constructor(
        readonly subject: SubjectImpl<ARGS, T>,
        readonly modifier: Modifier<ARGS, T>
    ) {
    }

    unregister() {
        this.subject.unregister(this);
    }
}

export class SubjectImpl<ARGS extends any[], T> implements Subject<ARGS, T> {
    private modifiers: ModifierRegistrationImpl<ARGS, T>[] = [];

    constructor(
        private genesis: Modifier<any, any> = () => AsyncResult.fromValue() // EMPTY ASYNC RESULT
    ) {
    }

    pre(modifier: Modifier<ARGS, T>): ModifierRegistration {
        const reg = new ModifierRegistrationImpl<ARGS, T>(
            this,
            modifier
        );
        this.modifiers.push(reg);
        return reg;
    }

    post(modifier: Modifier<ARGS, T>): ModifierRegistration {
        const reg = new ModifierRegistrationImpl<ARGS, T>(
            this,
            modifier
        );
        this.modifiers.splice(0, 0, reg);
        return reg;
    }

    unregister(modifierRegistration: ModifierRegistration) {
        const index = this.modifiers.indexOf(modifierRegistration as any);
        if (index > -1) {
            this.modifiers.splice(index, 1);
        }
    }

    private static invocation<ARGS extends any[], T>(
        modifier: Modifier<ARGS, T>, overriddenModifiers: Modifier<ARGS, T>[]
    ): Invocation<ARGS, T> {
        let overridden: Invocation<ARGS, T>;

        if (overriddenModifiers.length > 0) {
            const [next, ...veryNext] = overriddenModifiers;
            overridden = SubjectImpl.invocation(next, veryNext);
        } else {
            overridden = () => AsyncResult.fromValue(); // EMPTY ASYNC RESULT
        }

        const context: InvocationContext<ARGS, T> = {
            overridden
        };


        return (...args: ARGS) => AsyncResult.from(
            modifier.apply(context, args)
        );
    }

    invoke(...args: ARGS): AsyncResult<T> {
        const modifiers = [
            ...this.modifiers.map(
                reg => reg.modifier
            ),
            this.genesis
        ]

        const [modifier, ...overridden] = modifiers;
        const invocation = SubjectImpl.invocation(
            modifier, overridden
        );
        return invocation(...args);
    }
}
