import { cn } from "cn";
import { nanoid } from "nanoid";

export { cn };

/**
 * Generate a unique id.
 *
 * Avoid `crypto.randomUUID`, which is only exposed in secure contexts (HTTPS or
 * localhost) — over plain HTTP it is undefined and throws. `nanoid` works in any
 * context.
 */
export function randomId(): string {
    return nanoid();
}
