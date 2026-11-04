// Inference of the v2 network: one hidden layer (ReLU) shared by a policy head (one logit per action) and a value head
// (win probability of the decider). The input normalization is folded into the first layer, which then only sums the
// columns of the non-zero inputs: most inputs are one-hot and zero, so a forward pass costs a few thousand operations.
class ZNet {
	static fromJSON(json) {
		const net = new ZNet();
		const { F, H, A } = json;
		net.F = F;
		net.H = H;
		net.A = A;
		net.vocab = json.vocab;
		net.W1 = new Float32Array(F * H);
		net.b1 = Float32Array.from(json.b1);
		for (let j = 0; j < H; j++) {
			for (let i = 0; i < F; i++) {
				const w = json.W1[j * F + i] / json.std[i];
				net.W1[i * H + j] = w;
				net.b1[j] -= w * json.mean[i];
			}
		}
		net.Wp = Float32Array.from(json.Wp);
		net.bp = Float32Array.from(json.bp);
		// The production model only keeps the policy head
		net.wv = Float32Array.from(json.wv ?? new Array(H).fill(0));
		net.bv = json.bv ?? 0;
		net.h = new Float32Array(H);
		net.z = new Float32Array(A);
		return net;
	}

	hidden(x) {
		const { F, H, W1, h } = this;
		h.set(this.b1);
		for (let i = 0; i < F; i++) {
			const xi = x[i];
			if (xi === 0) {
				continue;
			}
			const row = i * H;
			for (let j = 0; j < H; j++) {
				h[j] += W1[row + j] * xi;
			}
		}
		for (let j = 0; j < H; j++) {
			if (h[j] < 0) {
				h[j] = 0;
			}
		}
		return h;
	}

	valueOfHidden(h) {
		let s = this.bv;
		for (let j = 0; j < this.H; j++) {
			s += this.wv[j] * h[j];
		}
		return 1 / (1 + Math.exp(-s));
	}

	logitsOfHidden(h) {
		const { A, H, Wp, bp, z } = this;
		for (let k = 0; k < A; k++) {
			let s = bp[k];
			const row = k * H;
			for (let j = 0; j < H; j++) {
				s += Wp[row + j] * h[j];
			}
			z[k] = s;
		}
		return z;
	}

	value(x) {
		return this.valueOfHidden(this.hidden(x));
	}

	logits(x) {
		return this.logitsOfHidden(this.hidden(x));
	}
}

module.exports = { ZNet };
