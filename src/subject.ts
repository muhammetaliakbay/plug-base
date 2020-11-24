import {AsyncResult} from "./async-result";
import {Observable} from "rxjs";

export type Modifier<ARGS extends any[], T>
    = (this: InvocationContext<ARGS, T>, ...args: ARGS) => T | AsyncResult<T> | Promise<T> | Observable<T>;

export interface InvocationContext<ARGS extends any[], T> {
    overridden?: Invocation<ARGS, T>;
}
export type Invocation<ARGS extends any[], T> = (...args: ARGS) => AsyncResult<T>;

export interface ModifierRegistration {
    unregister();
}

export interface Subject<ARGS extends any[], T> {
    pre(modifier: Modifier<ARGS, T>): ModifierRegistration;
    post(modifier: Modifier<ARGS, T>): ModifierRegistration;
    invoke(...args: ARGS): AsyncResult<T> | undefined;
}

export function createSubject<ARGS extends any[], T>(): Subject<ARGS, T> {
    return new SubjectImpl<ARGS, T>();
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
        modifier: Modifier<ARGS, T>, overridden: Modifier<ARGS, T>[]
    ): Invocation<ARGS, T> {
        const context: InvocationContext<ARGS, T> = {
        };

        if (overridden.length > 0) {
            const [next, ...veryNext] = overridden;
            context.overridden = SubjectImpl.invocation(next, veryNext);
        }

        return (...args: ARGS) => AsyncResult.fromValue(
            modifier.apply(context, args)
        );
    }

    invoke(...args: ARGS): AsyncResult<T> | undefined {
        if(this.modifiers.length > 0) {
            const [modifier, ...overridden] = this.modifiers.map(
                reg => reg.modifier
            );
            const invocation = SubjectImpl.invocation(
                modifier, overridden
            );
            return invocation(...args);
        } else {
            return undefined;
        }
    }
}
