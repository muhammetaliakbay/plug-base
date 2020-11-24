import { expect } from "chai";
import {createSubject, Modifier} from "./subject";

describe('Subject Tests', () => {
    it('Invocation of empty subject must return undefined', () => {
        const subject = createSubject<[], number>();

        expect(subject.invoke()).to.be.undefined;
    });

    it('Invocation of 1-level subject must return the first modifier\'s result', async () => {
        const subject = createSubject<[], number>();

        const firstModifier = () => 14;

        subject.post(firstModifier);

        expect(await subject.invoke().asPromise()).equals(firstModifier());
    });

    it('Invocation of 2-level subject must return the second modifier\'s result', async () => {
        const subject = createSubject<[], number>();

        const firstModifier = () => 14;
        const secondModifier = () => 41;

        subject.post(firstModifier);
        subject.post(secondModifier);

        expect(await subject.invoke().asPromise()).equals(secondModifier());
    });

    it('Invocation of 2-level subject must return the first modifier\'s result', async () => {
        const subject = createSubject<[], number>();

        const firstModifier = () => 14;
        const secondModifier = () => 41;

        subject.post(firstModifier);
        subject.pre(secondModifier);

        expect(await subject.invoke().asPromise()).equals(firstModifier());
    });

    it('Invocation of 2-level subject must return the first modifier\'s result modified by second modifier', async () => {
        const subject = createSubject<[], number>();

        const firstModifier = () => 14;
        const secondModifier: Modifier<[], number> = async function () {
            return await this.overridden().asPromise() + 1;
        };

        subject.post(firstModifier);
        subject.post(secondModifier);

        expect(await subject.invoke().asPromise()).equals(firstModifier() + 1);
    });

    it('Invocation of 3-level subject must return the recursively modified value by the modifier', async () => {
        const subject = createSubject<[], number>();

        const modifier: Modifier<[], number> = async function () {
            if (this.overridden == null) {
                return 0;
            } else {
                return await this.overridden().asPromise() + 1;
            }
        };

        subject.post(modifier);
        subject.post(modifier);
        subject.post(modifier);

        expect(await subject.invoke().asPromise()).equals(2);
    });

});