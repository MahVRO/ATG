/**
 * Perlin Noise Implementation
 * Used for procedural terrain generation
 */

class PerlinNoise {
    constructor(seed = 0) {
        this.seed = seed;
        this.permutation = this.generatePermutation(seed);
        this.p = [...this.permutation, ...this.permutation];
    }

    generatePermutation(seed) {
        const p = [];
        for (let i = 0; i < 256; i++) {
            p[i] = i;
        }
        // Shuffle using seed
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(((seed * 12.9898 + i * 78.233) * 43758.5453) % (i + 1));
            [p[i], p[j]] = [p[j], p[i]];
        }
        return p;
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(t, a, b) {
        return a + t * (b - a);
    }

    grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 8 ? y : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    perlin(x, y, z = 0) {
        const xi = Math.floor(x) & 255;
        const yi = Math.floor(y) & 255;
        const zi = Math.floor(z) & 255;

        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);
        const zf = z - Math.floor(z);

        const u = this.fade(xf);
        const v = this.fade(yf);
        const w = this.fade(zf);

        const p = this.p;
        const aa = p[p[p[xi] + yi] + zi];
        const ab = p[p[p[xi] + yi + 1] + zi];
        const ba = p[p[p[xi + 1] + yi] + zi];
        const bb = p[p[p[xi + 1] + yi + 1] + zi];
        const aaa = p[aa + zi];
        const aab = p[aa + zi + 1];
        const aba = p[ab + zi];
        const abb = p[ab + zi + 1];
        const baa = p[ba + zi];
        const bab = p[ba + zi + 1];
        const bba = p[bb + zi];
        const bbb = p[bb + zi + 1];

        let x1 = this.lerp(u, this.grad(aaa, xf, yf, zf), this.grad(baa, xf - 1, yf, zf));
        let x2 = this.lerp(u, this.grad(aba, xf, yf - 1, zf), this.grad(bba, xf - 1, yf - 1, zf));
        let y1 = this.lerp(v, x1, x2);

        x1 = this.lerp(u, this.grad(aab, xf, yf, zf - 1), this.grad(bab, xf - 1, yf, zf - 1));
        x2 = this.lerp(u, this.grad(abb, xf, yf - 1, zf - 1), this.grad(bbb, xf - 1, yf - 1, zf - 1));
        let y2 = this.lerp(v, x1, x2);

        return this.lerp(w, y1, y2);
    }

    octavePerlin(x, y, z, octaves, persistence = 0.5, lacunarity = 2) {
        let result = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            result += this.perlin(x * frequency, y * frequency, z * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }

        return result / maxValue;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerlinNoise;
}
