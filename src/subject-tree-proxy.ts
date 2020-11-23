import {SubjectTree} from "./subject-tree";
import {Modifier, ModifierRegistration} from "./subject";

export function createSubjectTreeProxy<ARGS extends any[], T, CHILDREN extends {} = {}>(subjectTree: SubjectTree<ARGS, T>): SubjectTreeProxy<ARGS, T, CHILDREN> {
    const target = subjectTree.invoke.bind(subjectTree) as SubjectTreeProxy<ARGS, T, CHILDREN>;

    target.subjectTree = subjectTree;
    target.pre = subjectTree.pre.bind(subjectTree);
    target.post = subjectTree.post.bind(subjectTree);
    target.invoke = subjectTree.invoke.bind(subjectTree);

    return new Proxy(target, {
        get(target, p: PropertyKey, receiver: any): any {
            if (typeof p === 'string' && p[0] === '$') {
                return createSubjectTreeProxy(subjectTree.child(p));
            } else {
                return target[p];
            }
        }
    });
}

export type SubjectTreeProxy<ARGS extends any[], T, CHILDREN extends {} = {}> = {
    (...args: ARGS): T | undefined;
    subjectTree: SubjectTree<ARGS, T>;
    pre(modifier: Modifier<ARGS, T>): ModifierRegistration;
    post(modifier: Modifier<ARGS, T>): ModifierRegistration;
    invoke(...args: ARGS): T | undefined;
} & {
    [CHILD in Extract<keyof CHILDREN, string> as `$${CHILD}`]: (
        CHILDREN[CHILD] extends SubjectTreeProxy<any, any, any> ? CHILDREN[CHILD] : (
            CHILDREN[CHILD] extends (...args: infer args) => infer t ? SubjectTreeProxy<args, t> : SubjectTreeProxy<never, never, CHILDREN[CHILD]>
        )
    );
};
