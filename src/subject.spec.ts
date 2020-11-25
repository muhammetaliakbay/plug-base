import { expect, use } from "chai";
import ChaiAsPromised from 'chai-as-promised';
import {createSubject, Modifier} from "./subject";
import {NoResultError} from "./async-result";

use(ChaiAsPromised);

describe('Subject Tests', () => {
    it('Invocation of empty subject "asPromise" must throw NoResultError', async () => {
        const subject = createSubject<[], number>();

        await expect(subject.invoke().asPromise()).to.be.rejectedWith(NoResultError);
    });

    it('Invocation of empty subject must return genesis modifier\'s result', async () => {
        const subject = createSubject<[], number>(
            () => 11
        );

        expect(await subject.invoke().asPromise()).equals(11);
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
            return (await this.overridden().asPromise()) + 1;
        };

        subject.post(firstModifier);
        subject.post(secondModifier);

        expect(await subject.invoke().asPromise()).equals(firstModifier() + 1);
    });

    it('Invocation of 3-level subject must return the recursively modified value by the modifier', async () => {
        const subject = createSubject<[], number>();

        const modifier: Modifier<[], number> = async function () {
            return (await this.overridden().asPromise().catch(() => -1)) + 1;
        };

        subject.post(modifier);
        subject.post(modifier);
        subject.post(modifier);

        expect(await subject.invoke().asPromise()).equals(2);
    });

});