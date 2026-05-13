/**
 * Mathematical utilities
 */

class MathUtils {
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    static lerp(a, b, t) {
        return a + (b - a) * t;
    }

    static distance(x1, y1, z1, x2, y2, z2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dz = z2 - z1;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    static distanceSquared(x1, y1, z1, x2, y2, z2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dz = z2 - z1;
        return dx * dx + dy * dy + dz * dz;
    }

    static floorDiv(a, b) {
        return Math.floor(a / b);
    }

    static mod(a, b) {
        return ((a % b) + b) % b;
    }
}
