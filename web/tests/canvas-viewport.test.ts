import { expect, test } from "bun:test";
import { canvasPoint, fitCanvasNodes, zoomAt } from "../src/lib/canvas/canvas-viewport";

test("zoom keeps the world point below the cursor stationary across repeated events", () => {
    let viewport = { x: -240, y: 160, k: 0.5 };
    const cursor = { x: 317, y: 229 };
    const anchor = canvasPoint(cursor, viewport);
    for (const scale of [0.1, 0.75, 2, 5, 0.5]) {
        viewport = zoomAt(viewport, cursor, scale);
        expect(canvasPoint(cursor, viewport).x).toBeCloseTo(anchor.x, 8);
        expect(canvasPoint(cursor, viewport).y).toBeCloseTo(anchor.y, 8);
    }
});

test("zoom clamps scale without moving its anchor", () => {
    const viewport = { x: 140, y: -50, k: 1 };
    const cursor = { x: 500, y: 300 };
    expect(zoomAt(viewport, cursor, 100).k).toBe(5);
    expect(zoomAt(viewport, cursor, 0).k).toBe(0.05);
    expect(canvasPoint(cursor, zoomAt(viewport, cursor, 100))).toEqual(canvasPoint(cursor, viewport));
});

test("fit frames mixed node sizes at negative and positive coordinates", () => {
    const size = { width: 1000, height: 700 };
    const nodes = [{ position: { x: -900, y: -200 }, width: 200, height: 600 }, { position: { x: 500, y: 300 }, width: 900, height: 200 }];
    const viewport = fitCanvasNodes(nodes, size);
    for (const node of nodes) {
        expect(node.position.x * viewport.k + viewport.x).toBeGreaterThanOrEqual(0);
        expect(node.position.y * viewport.k + viewport.y).toBeGreaterThanOrEqual(0);
        expect((node.position.x + node.width) * viewport.k + viewport.x).toBeLessThanOrEqual(size.width);
        expect((node.position.y + node.height) * viewport.k + viewport.y).toBeLessThanOrEqual(size.height);
    }
    const center = canvasPoint({ x: size.width / 2, y: size.height / 2 }, viewport);
    expect(center.x).toBeCloseTo(250);
    expect(center.y).toBeCloseTo(150);
});

test("empty canvas fits to the center at 100 percent", () => {
    expect(fitCanvasNodes([], { width: 390, height: 844 })).toEqual({ x: 195, y: 422, k: 1 });
});
