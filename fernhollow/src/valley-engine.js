(function () {
  'use strict';

  const VALLEY_LENGTH = 160.0;
  const TWO_PI = Math.PI * 2.0;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function colonyNoise(x, z, seedOffset) {
    const a = (z / VALLEY_LENGTH) * TWO_PI;
    return (
      Math.sin(x * 0.14 + a * 3.0 + seedOffset) * 0.42 +
      Math.cos(x * 0.22 - a * 5.0 + seedOffset * 1.7) * 0.33 +
      Math.sin(x * 0.08 + a * 2.0 - seedOffset * 0.9) * 0.25
    );
  }

  // Enveloping U-shaped amphitheater valley (mirrored identically in GLSL)
  function valleyPathX(z) {
    const a = (z / VALLEY_LENGTH) * TWO_PI;
    return Math.sin(a) * 9.0 + Math.sin(a * 2.0 + 0.65) * 3.2;
  }

  function valleyPathY(z) {
    const a = (z / VALLEY_LENGTH) * TWO_PI;
    return Math.cos(a) * 0.85 + Math.sin(a * 3.0 + 0.5) * 0.38;
  }

  function valleyTerrainHeight(localX, worldZ) {
    const a = (worldZ / VALLEY_LENGTH) * TWO_PI;
    const absX = Math.abs(localX);
    // Tall, enveloping U-shaped valley hillsides sweeping all the way up to the top-left & top-right edges,
    // cradling a dramatic, intimate dark sky notch right above "Grown, not built."
    const bowl = Math.pow(absX * 0.084, 1.90) * 11.4;
    const hills =
      Math.sin(a * 2.0 + localX * 0.075) * 1.65 +
      Math.cos(a * 3.0 - localX * 0.105) * 1.25 +
      Math.sin(a * 5.0 + localX * 0.17) * 0.55 +
      Math.cos(localX * 0.14 + a) * 0.78;
    const flankMask = Math.min(1.0, absX / 6.5);
    return valleyPathY(worldZ) - 3.35 + bowl + hills * (0.25 + 0.75 * flankMask);
  }

  const GLSL_VALLEY_MATH = `
    const float VALLEY_LENGTH = 160.0;
    const float TWO_PI = 6.28318530718;

    float valleyPathX(float z) {
      float a = (z / VALLEY_LENGTH) * TWO_PI;
      return sin(a) * 9.0 + sin(a * 2.0 + 0.65) * 3.2;
    }

    float valleyPathY(float z) {
      float a = (z / VALLEY_LENGTH) * TWO_PI;
      return cos(a) * 0.85 + sin(a * 3.0 + 0.5) * 0.38;
    }

    float valleyTerrainHeight(float localX, float worldZ) {
      float a = (worldZ / VALLEY_LENGTH) * TWO_PI;
      float absX = abs(localX);
      float bowl = pow(absX * 0.084, 1.90) * 11.4;
      float hills =
        sin(a * 2.0 + localX * 0.075) * 1.65 +
        cos(a * 3.0 - localX * 0.105) * 1.25 +
        sin(a * 5.0 + localX * 0.17) * 0.55 +
        cos(localX * 0.14 + a) * 0.78;
      float flankMask = clamp(absX / 6.5, 0.0, 1.0);
      return valleyPathY(worldZ) - 3.35 + bowl + hills * (0.25 + 0.75 * flankMask);
    }
  `;

  // =========================================================================
  // 1A. Ultra-Crisp Photographic Wildflower Atlas (2048x1024, 4x2 = 8 species)
  //     High-definition petal silhouettes, deep dark-shaded petal throats, and
  //     natural botanical stamen detail so every blossom reads razor-clear!
  // =========================================================================
  function createFlowerAtlas() {
    const W = 2048;
    const H = 1024;
    const cell = 512;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    function drawBlossom(x, y, radius, petals, throatCol, midCol, tipCol, centerCol, slimness, seed, addStamens) {
      ctx.save();
      ctx.translate(x, y);
      for (let i = 0; i < petals; i++) {
        const jitter = Math.sin(seed * 13.7 + i * 4.3) * 0.09;
        const lenJ = 0.89 + Math.cos(seed * 7.1 + i * 3.1) * 0.13;
        const len = radius * lenJ;
        const wid = (radius * slimness) / Math.max(petals * 0.48, 2.2);

        ctx.save();
        ctx.rotate((i / petals) * TWO_PI + jitter);
        const grad = ctx.createLinearGradient(0, -radius * 0.08, 0, -len);
        grad.addColorStop(0, throatCol);
        grad.addColorStop(0.32, midCol);
        grad.addColorStop(0.84, tipCol);
        grad.addColorStop(1, tipCol.replace(/[\d.]+\)$/, '0.0)'));
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(0, -radius * 0.10);
        ctx.bezierCurveTo(-wid, -len * 0.28, -wid * 0.90, -len * 0.84, -wid * 0.15, -len);
        ctx.quadraticCurveTo(0, -len * 0.93, wid * 0.15, -len);
        ctx.bezierCurveTo(wid * 0.90, -len * 0.84, wid, -len * 0.28, 0, -radius * 0.10);
        ctx.fill();

        // Subtle delicate petal crease shadow for realistic 3D petal definition
        ctx.strokeStyle = throatCol.replace(/[\d.]+\)$/, '0.32)');
        ctx.lineWidth = Math.max(1.2, radius * 0.012);
        ctx.beginPath();
        ctx.moveTo(0, -radius * 0.14);
        ctx.lineTo(0, -len * 0.78);
        ctx.stroke();
        ctx.restore();
      }

      // Crisp dark-ringed botanical center + pollen dots
      ctx.fillStyle = throatCol;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.21, 0, TWO_PI);
      ctx.fill();

      const cg = ctx.createRadialGradient(0, 0, 1, 0, 0, radius * 0.18);
      cg.addColorStop(0, centerCol);
      cg.addColorStop(0.8, centerCol.replace(/[\d.]+\)$/, '0.75)'));
      cg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.18, 0, TWO_PI);
      ctx.fill();

      if (addStamens) {
        ctx.fillStyle = centerCol;
        for (let s = 0; s < 10; s++) {
          const sa = (s / 10) * TWO_PI + seed;
          const sr = radius * (0.20 + (s % 2) * 0.06);
          ctx.beginPath();
          ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr, radius * 0.028, 0, TWO_PI);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // Cell (0,0): Crisp Tangerine / Burnt-Orange Meadow Spray (5 crisp small 5-petal orange flowers)
    {
      const cx = cell * 0.5, cy = cell * 0.5;
      const pts = [
        { dx: -102, dy: -62, r: 78, s: 1.1 },
        { dx: 96, dy: -52, r: 72, s: 2.3 },
        { dx: -50, dy: 84, r: 82, s: 3.7 },
        { dx: 72, dy: 76, r: 74, s: 4.9 },
        { dx: 6, dy: -4, r: 86, s: 6.2 }
      ];
      for (const p of pts) {
        drawBlossom(
          cx + p.dx, cy + p.dy, p.r, 5,
          'rgba(168, 42, 8, 0.98)',
          'rgba(248, 102, 26, 0.98)',
          'rgba(255, 174, 82, 0.94)',
          'rgba(255, 228, 118, 1.0)',
          1.08, p.s, false
        );
      }
    }

    // Cell (1,0): Vivid Sun-Gold Buttercup / Wild Marigold (distinct sculpted golden petals)
    {
      const cx = cell * 1.5, cy = cell * 0.5;
      drawBlossom(
        cx, cy, 198, 6,
        'rgba(182, 92, 6, 0.98)',
        'rgba(255, 194, 20, 0.98)',
        'rgba(255, 236, 86, 0.94)',
        'rgba(255, 248, 172, 1.0)',
        1.14, 4.1, true
      );
      drawBlossom(
        cx + 4, cy - 4, 128, 5,
        'rgba(208, 118, 10, 0.96)',
        'rgba(255, 214, 38, 0.96)',
        'rgba(255, 244, 134, 0.88)',
        'rgba(255, 250, 202, 1.0)',
        1.02, 7.8, false
      );
    }

    // Cell (2,0): Crisp Lilac / Lavender Cosmos (8 distinct slender notched petals + golden heart)
    {
      const cx = cell * 2.5, cy = cell * 0.5;
      drawBlossom(
        cx, cy, 204, 8,
        'rgba(92, 50, 168, 0.98)',
        'rgba(182, 130, 252, 0.98)',
        'rgba(236, 208, 255, 0.94)',
        'rgba(255, 216, 78, 1.0)',
        0.96, 2.9, true
      );
    }

    // Cell (3,0): Vivid Fuchsia / Rose-Pink Wildflower (5 crisp broad petals)
    {
      const cx = cell * 3.5, cy = cell * 0.5;
      drawBlossom(
        cx, cy, 192, 5,
        'rgba(138, 14, 62, 0.98)',
        'rgba(242, 56, 128, 0.98)',
        'rgba(255, 148, 196, 0.92)',
        'rgba(255, 224, 112, 1.0)',
        1.16, 3.3, true
      );
    }

    // Cell (0,1): Golden Buttercup Spray (3 crisp clustered yellow blossoms)
    {
      const cx = cell * 0.5, cy = cell * 1.5;
      const pts = [
        { dx: -78, dy: 48, r: 94, s: 1.5 },
        { dx: 74, dy: 40, r: 88, s: 2.8 },
        { dx: -2, dy: -72, r: 100, s: 4.4 }
      ];
      for (const p of pts) {
        drawBlossom(
          cx + p.dx, cy + p.dy, p.r, 5,
          'rgba(188, 96, 8, 0.98)',
          'rgba(255, 202, 26, 0.98)',
          'rgba(255, 240, 102, 0.94)',
          'rgba(255, 248, 178, 1.0)',
          1.12, p.s, false
        );
      }
    }

    // Cell (1,1): Fiery Tangerine / Coral Wild Poppy (6 vivid orange-apricot petals)
    {
      const cx = cell * 1.5, cy = cell * 1.5;
      drawBlossom(
        cx, cy, 198, 6,
        'rgba(176, 38, 8, 0.98)',
        'rgba(252, 98, 22, 0.98)',
        'rgba(255, 180, 74, 0.94)',
        'rgba(255, 238, 142, 1.0)',
        1.16, 5.7, true
      );
    }

    // Cell (2,1): Wild Lilac-Violet Aster Spray (3 crisp lavender cosmos clusters)
    {
      const cx = cell * 2.5, cy = cell * 1.5;
      const pts = [
        { dx: -76, dy: -46, r: 92, s: 2.1 },
        { dx: 76, dy: 34, r: 88, s: 4.9 },
        { dx: -8, dy: 68, r: 96, s: 6.3 }
      ];
      for (const p of pts) {
        drawBlossom(
          cx + p.dx, cy + p.dy, p.r, 7,
          'rgba(88, 56, 178, 0.98)',
          'rgba(168, 128, 250, 0.98)',
          'rgba(226, 202, 255, 0.92)',
          'rgba(255, 218, 92, 1.0)',
          0.96, p.s, false
        );
      }
    }

    // Cell (3,1): Rose-Pink & Peach Wildflower Spray (3 bright magenta-coral blossoms)
    {
      const cx = cell * 3.5, cy = cell * 1.5;
      const pts = [
        { dx: -72, dy: -40, r: 84, s: 1.9 },
        { dx: 70, dy: -24, r: 80, s: 3.5 },
        { dx: 0, dy: 68, r: 90, s: 5.1 }
      ];
      for (const p of pts) {
        drawBlossom(
          cx + p.dx, cy + p.dy, p.r, 5,
          'rgba(146, 18, 68, 0.98)',
          'rgba(244, 66, 138, 0.98)',
          'rgba(255, 162, 202, 0.92)',
          'rgba(255, 232, 142, 1.0)',
          1.12, p.s, false
        );
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return tex;
  }

  // =========================================================================
  // 1B. Crisp Forest-Green Foliage Cluster Atlas (1024x1024, 2x2)
  // =========================================================================
  function createLeafAtlas() {
    const W = 1024;
    const H = 1024;
    const cell = 512;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    function drawSingleLeaf(x, y, ang, len, wid, darkCol, midCol, tipCol) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      const g = ctx.createLinearGradient(0, 0, 0, -len);
      g.addColorStop(0, darkCol);
      g.addColorStop(0.55, midCol);
      g.addColorStop(1, tipCol);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-wid, -len * 0.25, -wid * 0.82, -len * 0.78, 0, -len);
      ctx.bezierCurveTo(wid * 0.82, -len * 0.78, wid, -len * 0.25, 0, 0);
      ctx.fill();
      ctx.restore();
    }

    const rand = mulberry32(8821);

    // Cell (0,0): Dense Woodland Leaf Rosette
    {
      const cx = cell * 0.5, cy = cell * 0.5;
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * TWO_PI + (rand() - 0.5) * 0.4;
        const len = 105 + rand() * 92;
        const wid = 30 + rand() * 20;
        const ox = (rand() - 0.5) * 58;
        const oy = (rand() - 0.5) * 58;
        drawSingleLeaf(
          cx + ox, cy + oy, ang, len, wid,
          'rgba(18, 42, 12, 0.96)',
          'rgba(42, 86, 24, 0.95)',
          'rgba(84, 134, 42, 0.86)'
        );
      }
    }

    // Cell (1,0): Tangled Wild Fern Fronds
    {
      const cx = cell * 1.5, cy = cell * 0.5;
      for (let f = 0; f < 3; f++) {
        ctx.save();
        ctx.translate(cx + (f - 1) * 18, cy + 92);
        ctx.rotate((f - 1) * 0.68);
        const pairs = 12;
        for (let i = 0; i < pairs; i++) {
          const t = i / (pairs - 1);
          const sy = -t * 270;
          const lLen = Math.sin(t * Math.PI * 0.86 + 0.16) * 92;
          for (const side of [-1, 1]) {
            drawSingleLeaf(
              0, sy, side * (1.06 - t * 0.28), lLen, 15,
              'rgba(16, 38, 10, 0.96)',
              'rgba(44, 88, 24, 0.94)',
              'rgba(94, 146, 46, 0.86)'
            );
          }
        }
        ctx.restore();
      }
    }

    // Cell (0,1): Thick Mossy Shrub Tuft
    {
      const cx = cell * 0.5, cy = cell * 1.5;
      for (let i = 0; i < 16; i++) {
        const ang = rand() * TWO_PI;
        const dist = rand() * 88;
        const lx = cx + Math.cos(ang) * dist;
        const ly = cy + Math.sin(ang) * dist;
        drawSingleLeaf(
          lx, ly, ang + (rand() - 0.5) * 0.7,
          80 + rand() * 72, 26 + rand() * 18,
          'rgba(14, 34, 9, 0.96)',
          'rgba(38, 78, 20, 0.95)',
          'rgba(78, 126, 36, 0.84)'
        );
      }
    }

    // Cell (1,1): Lush Meadow Grass & Woodland Sprouts
    {
      const cx = cell * 1.5, cy = cell * 1.5;
      for (let i = 0; i < 14; i++) {
        const ang = -1.25 + (i / 13) * 2.5 + (rand() - 0.5) * 0.16;
        drawSingleLeaf(
          cx + (rand() - 0.5) * 65, cy + 98 + (rand() - 0.5) * 32,
          ang, 175 + rand() * 115, 14 + rand() * 9,
          'rgba(16, 36, 10, 0.96)',
          'rgba(42, 84, 22, 0.94)',
          'rgba(102, 150, 48, 0.84)'
        );
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return tex;
  }

  // =========================================================================
  // 2. Ambient Audio Engine (THREE.AudioListener + Low-Pass Hover Muffling)
  // =========================================================================
  function createAudioStore() {
    const store = {
      isInitialized: false,
      isMuted: true,
      listener: null,
      ctx: null,
      masterGain: null,
      lowpass: null,
      started: false,
      chimeTimer: null,
      muffled: false,

      attachListener(camera) {
        if (!this.listener) {
          this.listener = new THREE.AudioListener();
        }
        if (camera && !camera.children.includes(this.listener)) {
          camera.add(this.listener);
        }
      },

      initAudio() {
        if (this.isInitialized) return;
        this.isInitialized = true;
      },

      _buildGraph() {
        if (this.started) return;
        if (!this.listener) {
          this.listener = new THREE.AudioListener();
        }
        const ctx = this.listener.context;
        this.ctx = ctx;
        this.started = true;

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = this.muffled ? 320 : 15000;
        lowpass.Q.value = 0.7;

        const masterGain = ctx.createGain();
        masterGain.gain.value = 0.0001;

        lowpass.connect(masterGain);
        masterGain.connect(this.listener.getInput());
        this.lowpass = lowpass;
        this.masterGain = masterGain;

        const irLen = Math.floor(ctx.sampleRate * 3.2);
        const irBuf = ctx.createBuffer(2, irLen, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
          const data = irBuf.getChannelData(ch);
          for (let i = 0; i < irLen; i++) {
            const decay = Math.pow(1.0 - i / irLen, 2.7);
            data[i] = (Math.random() * 2 - 1) * decay * 0.45;
          }
        }
        const reverb = ctx.createConvolver();
        reverb.buffer = irBuf;
        const reverbGain = ctx.createGain();
        reverbGain.gain.value = 0.55;
        reverb.connect(reverbGain);
        reverbGain.connect(lowpass);

        const padFilter = ctx.createBiquadFilter();
        padFilter.type = 'lowpass';
        padFilter.frequency.value = 620;
        padFilter.Q.value = 1.1;

        const padLfo = ctx.createOscillator();
        padLfo.frequency.value = 0.065;
        const padLfoGain = ctx.createGain();
        padLfoGain.gain.value = 260;
        padLfo.connect(padLfoGain);
        padLfoGain.connect(padFilter.frequency);
        padLfo.start();

        const padGain = ctx.createGain();
        padGain.gain.value = 0.22;
        padFilter.connect(padGain);
        padGain.connect(lowpass);
        padGain.connect(reverb);

        const voices = [
          { f: 73.42, type: 'sine', g: 0.36, detune: -3 },
          { f: 73.42, type: 'triangle', g: 0.14, detune: 4 },
          { f: 110.0, type: 'sine', g: 0.24, detune: 2 },
          { f: 164.81, type: 'sine', g: 0.16, detune: -5 },
          { f: 174.61, type: 'sine', g: 0.11, detune: 6 },
          { f: 220.0, type: 'sine', g: 0.12, detune: -2 },
          { f: 261.63, type: 'sine', g: 0.08, detune: 5 }
        ];
        for (const v of voices) {
          const osc = ctx.createOscillator();
          osc.type = v.type;
          osc.frequency.value = v.f;
          osc.detune.value = v.detune;
          const g = ctx.createGain();
          g.gain.value = v.g;
          osc.connect(g);
          g.connect(padFilter);
          osc.start();
        }

        const noiseLen = ctx.sampleRate * 4;
        const noiseBuf = ctx.createBuffer(2, noiseLen, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
          const d = noiseBuf.getChannelData(ch);
          let b0 = 0, b1 = 0, b2 = 0;
          for (let i = 0; i < noiseLen; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.997 * b0 + white * 0.029;
            b1 = 0.985 * b1 + white * 0.032;
            b2 = 0.950 * b2 + white * 0.048;
            d[i] = (b0 + b1 + b2 + white * 0.02) * 0.35;
          }
        }
        const windSrc = ctx.createBufferSource();
        windSrc.buffer = noiseBuf;
        windSrc.loop = true;

        const windFilter = ctx.createBiquadFilter();
        windFilter.type = 'bandpass';
        windFilter.frequency.value = 380;
        windFilter.Q.value = 1.6;

        const windLfo = ctx.createOscillator();
        windLfo.frequency.value = 0.11;
        const windLfoGain = ctx.createGain();
        windLfoGain.gain.value = 180;
        windLfo.connect(windLfoGain);
        windLfoGain.connect(windFilter.frequency);
        windLfo.start();

        const windGain = ctx.createGain();
        windGain.gain.value = 0.16;
        windSrc.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(lowpass);
        windGain.connect(reverb);
        windSrc.start();

        const scale = [587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];
        const triggerChime = () => {
          if (!this.isMuted && this.ctx && this.ctx.state === 'running') {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = scale[Math.floor(Math.random() * scale.length)];
            const env = this.ctx.createGain();
            env.gain.setValueAtTime(0.0001, now);
            env.gain.exponentialRampToValueAtTime(0.032, now + 0.12);
            env.gain.exponentialRampToValueAtTime(0.0001, now + 3.4);
            osc.connect(env);
            env.connect(reverb);
            env.connect(lowpass);
            osc.start(now);
            osc.stop(now + 3.6);
          }
          this.chimeTimer = window.setTimeout(triggerChime, 3400 + Math.random() * 4800);
        };
        this.chimeTimer = window.setTimeout(triggerChime, 1800);
      },

      toggleMute() {
        if (!this.isInitialized) return this.isMuted;
        this._buildGraph();
        this.isMuted = !this.isMuted;
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        if (this.ctx && this.masterGain) {
          const now = this.ctx.currentTime;
          const target = this.isMuted ? 0.0001 : 0.62;
          this.masterGain.gain.cancelScheduledValues(now);
          this.masterGain.gain.setTargetAtTime(target, now, 0.35);
        }
        return this.isMuted;
      },

      setMuffled(muffled) {
        this.muffled = muffled;
        if (!this.ctx || !this.lowpass) return;
        const now = this.ctx.currentTime;
        const targetFreq = muffled ? 320.0 : 15000.0;
        this.lowpass.frequency.cancelScheduledValues(now);
        this.lowpass.frequency.setTargetAtTime(targetFreq, now, 0.28);
      }
    };

    return () => store;
  }

  const audioStore = createAudioStore();

  // =========================================================================
  // 3. Night Flower Valley 3D Engine
  //    - Razor-clear central wildflower valley with rich natural color colonies
  //    - Optical Radial Peripheral Lens Blur framing all outer edges & corners
  //    - Smooth Gaussian cursor parting + color-preserving warm HDR bloom
  // =========================================================================
  class Valley {
    constructor(containerEl, onLoaded, onIntroDone) {
      this.container = containerEl;
      this.canvasHost = containerEl.querySelector('.js-canvas-container') || containerEl;
      this.onLoaded = onLoaded || (() => {});
      this.onIntroDone = onIntroDone || (() => {});

      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.progress = 12.0;
      this.scrollVelocity = 0.0;
      this.speedSmooth = 0.0;
      this.hoverTarget = 0.0;
      this.hoverValue = 0.0;
      this.mouseNDC = new THREE.Vector2(99, 99);
      this.mouseSmooth = new THREE.Vector2(0, 0);
      this.mouseTargetX = 0;
      this.mouseTargetY = 0;
      this.mousePresence = 0.0;
      this.mousePresenceTarget = 0.0;

      this.introDuration = 1.9;
      this.introElapsed = 0.0;
      this.loaded = false;
      this.disposed = false;
      this.lastTouchY = null;

      this._initRenderer();
      this._initCameraAndPath();
      this._initPostProcessing();
      this._initTexturesAndScene();
      this._bindEvents();

      this.clock = new THREE.Clock();

      requestAnimationFrame(() => {
        this.loaded = true;
        this.onLoaded();
      });

      this._rafId = requestAnimationFrame(this._animate.bind(this));
    }

    _initRenderer() {
      this.renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false
      });
      this.renderer.setPixelRatio(this.dpr);
      this.renderer.setSize(this.width, this.height);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.NoToneMapping;
      this.renderer.setClearColor(0x000000, 1);

      this.canvasHost.innerHTML = '';
      this.canvasHost.appendChild(this.renderer.domElement);

      this.scene = new THREE.Scene();
    }

    _initCameraAndPath() {
      this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.2, 200);
      audioStore().attachListener(this.camera);

      const pts = [];
      const step = 4.0;
      for (let z = -16; z <= VALLEY_LENGTH + 16; z += step) {
        pts.push(new THREE.Vector3(valleyPathX(z), valleyPathY(z) + 2.35, z));
      }
      this.cameraCurve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
      this.curveMinZ = -16;
      this.curveSpanZ = VALLEY_LENGTH + 32;
    }

    _sampleSpline(worldZ, outVec) {
      const wrappedZ = ((worldZ % VALLEY_LENGTH) + VALLEY_LENGTH) % VALLEY_LENGTH;
      const t = (wrappedZ - this.curveMinZ) / this.curveSpanZ;
      this.cameraCurve.getPoint(t, outVec);
      outVec.z = worldZ;
      return outVec;
    }

    _initPostProcessing() {
      const gl = this.renderer.getContext();
      const hasHalfFloat =
        this.renderer.capabilities.isWebGL2 ||
        !!gl.getExtension('OES_texture_half_float');
      const rtType = hasHalfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType;

      const makeRT = (w, h, withDepth) =>
        new THREE.WebGLRenderTarget(Math.max(1, Math.floor(w)), Math.max(1, Math.floor(h)), {
          type: rtType,
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          depthBuffer: !!withDepth,
          stencilBuffer: false
        });

      const rw = this.width * this.dpr;
      const rh = this.height * this.dpr;

      // Scene target
      this.sceneRT = makeRT(rw, rh, true);

      // Optical Peripheral Lens Blur pyramid (smooth creamy outer-frame bokeh!)
      this.dof1A = makeRT(rw * 0.5, rh * 0.5, false);
      this.dof1B = makeRT(rw * 0.5, rh * 0.5, false);
      this.dof2A = makeRT(rw * 0.25, rh * 0.25, false);
      this.dof2B = makeRT(rw * 0.25, rh * 0.25, false);

      // 3-tier HDR Bloom pyramid
      this.brightRT = makeRT(rw * 0.5, rh * 0.5, false);
      this.blur1A = makeRT(rw * 0.5, rh * 0.5, false);
      this.blur1B = makeRT(rw * 0.5, rh * 0.5, false);
      this.blur2A = makeRT(rw * 0.25, rh * 0.25, false);
      this.blur2B = makeRT(rw * 0.25, rh * 0.25, false);
      this.blur3A = makeRT(rw * 0.125, rh * 0.125, false);
      this.blur3B = makeRT(rw * 0.125, rh * 0.125, false);

      this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.postQuadGeo = new THREE.PlaneGeometry(2, 2);

      const postVert = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `;

      // Bright pass tuned so petals stay crisp & vivid while bright sunlit/cursor blooms glow warmly
      this.brightMat = new THREE.ShaderMaterial({
        vertexShader: postVert,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform float uThreshold;
          uniform float uKnee;
          varying vec2 vUv;
          void main() {
            vec3 col = texture2D(tDiffuse, vUv).rgb;
            float br = max(col.r, max(col.g, col.b));
            float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
            soft = (soft * soft) / max(4.0 * uKnee, 0.0001);
            float contrib = max(soft, br - uThreshold) / max(br, 0.0001);
            gl_FragColor = vec4(col * max(contrib, 0.0), 1.0);
          }
        `,
        uniforms: {
          tDiffuse: { value: this.sceneRT.texture },
          uThreshold: { value: 0.78 },
          uKnee: { value: 0.36 }
        },
        depthTest: false,
        depthWrite: false
      });

      this.blurMat = new THREE.ShaderMaterial({
        vertexShader: postVert,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform vec2 uDirection;
          varying vec2 vUv;
          void main() {
            vec3 sum = texture2D(tDiffuse, vUv).rgb * 0.204164;
            sum += texture2D(tDiffuse, vUv + uDirection * 1.407333).rgb * 0.304005;
            sum += texture2D(tDiffuse, vUv - uDirection * 1.407333).rgb * 0.304005;
            sum += texture2D(tDiffuse, vUv + uDirection * 3.294215).rgb * 0.093913;
            sum += texture2D(tDiffuse, vUv - uDirection * 3.294215).rgb * 0.093913;
            gl_FragColor = vec4(sum, 1.0);
          }
        `,
        uniforms: {
          tDiffuse: { value: null },
          uDirection: { value: new THREE.Vector2(1, 0) }
        },
        depthTest: false,
        depthWrite: false
      });

      // Final Composite: Razor-sharp center + Creamy Radial Peripheral Lens Blur + 3-tier Bloom + Split-RGB Grain + Speed Vignette
      this.compositeMat = new THREE.ShaderMaterial({
        vertexShader: postVert,
        fragmentShader: `
          uniform sampler2D tScene;
          uniform sampler2D tDofMid;
          uniform sampler2D tDofWide;
          uniform sampler2D tBloom1;
          uniform sampler2D tBloom2;
          uniform sampler2D tBloom3;
          uniform float uTime;
          uniform float uSpeed;
          uniform float uHover;
          uniform float uIntro;
          uniform vec2 uResolution;
          varying vec2 vUv;

          float hash12(vec2 p) {
            vec3 p3 = fract(vec3(p.xyx) * 0.1031);
            p3 += dot(p3, p3.yzx + 33.33);
            return fract((p3.x + p3.y) * p3.z);
          }

          vec3 acesToneMap(vec3 x) {
            const float a = 2.51;
            const float b = 0.03;
            const float c = 2.43;
            const float d = 0.59;
            const float e = 0.14;
            return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
          }

          void main() {
            vec2 centered = vUv - 0.5;
            float dist = length(centered);

            // Subtle radial optical lens dispersion toward edges (rises slightly with speed)
            float ca = (0.0012 + uSpeed * 0.0032) * smoothstep(0.18, 0.72, dist);
            vec2 dir = centered / max(dist, 0.0001);

            // Crisp central sample with subtle edge CA
            vec3 sharpCol = vec3(
              texture2D(tScene, vUv + dir * ca).r,
              texture2D(tScene, vUv).g,
              texture2D(tScene, vUv - dir * ca).b
            );

            // Creamy peripheral DoF lens blur samples (1/2-res & 1/4-res Gaussian)
            vec3 midBlur = vec3(
              texture2D(tDofMid, vUv + dir * ca * 1.4).r,
              texture2D(tDofMid, vUv).g,
              texture2D(tDofMid, vUv - dir * ca * 1.4).b
            );
            vec3 wideBlur = vec3(
              texture2D(tDofWide, vUv + dir * ca * 2.0).r,
              texture2D(tDofWide, vUv).g,
              texture2D(tDofWide, vUv - dir * ca * 2.0).b
            );

            // Elliptical peripheral blur mask matching the reference macro lens framing:
            // Inner valley (under "Grown, not built." & hero clusters) stays 100% razor sharp,
            // smoothly blooming into soft creamy bokeh all around left, right, top & bottom borders!
            vec2 lensUv = (vUv - vec2(0.50, 0.48)) * vec2(1.04, 1.12);
            float lensR = length(lensUv);
            float peripheralBlur = smoothstep(0.27, 0.64, lensR) * (1.0 - uHover * 0.62);
            // Smooth 2-stage ramp: sharp -> midBlur -> wideBlur
            float t1 = smoothstep(0.0, 0.52, peripheralBlur);
            float t2 = smoothstep(0.38, 1.0, peripheralBlur);
            vec3 baseCol = mix(sharpCol, midBlur, t1);
            baseCol = mix(baseCol, wideBlur, t2);

            // Dreamy 3-tier HDR bloom
            vec3 b1 = texture2D(tBloom1, vUv).rgb;
            vec3 b2 = texture2D(tBloom2, vUv).rgb;
            vec3 b3 = texture2D(tBloom3, vUv).rgb;
            float bloomBoost = 1.0 + uHover * 0.34;
            vec3 bloom = (b1 * 0.34 + b2 * 0.48 + b3 * 0.58) * bloomBoost;

            vec3 hdr = baseCol + bloom;
            hdr *= mix(0.08, 1.24, uIntro);

            // ACES filmic tone mapping preserving vibrant botanical flower hues
            vec3 col = acesToneMap(hdr);

            // Velocity-reactive vignette (gentle dark edge framing at rest, tightens on scroll)
            vec2 vigUv = centered * vec2(1.04, 1.0);
            float vigDist = length(vigUv);
            float innerR = mix(0.52, 0.24, uSpeed);
            float outerR = mix(1.12, 0.80, uSpeed);
            float vignette = 1.0 - smoothstep(innerR, outerR, vigDist) * mix(0.48, 0.86, uSpeed);
            col *= vignette;

            // Fine split-RGB analog cinema grain (keeps pure black sky void clean)
            vec2 px = vUv * uResolution;
            float tSeed = fract(uTime * 19.37);
            float nR = hash12(px + vec2(17.1, 31.7) + tSeed * 113.0) - 0.5;
            float nG = hash12(px + vec2(43.9, 11.3) + tSeed * 157.0) - 0.5;
            float nB = hash12(px + vec2(71.3, 59.1) + tSeed * 199.0) - 0.5;
            float luma = dot(col, vec3(0.299, 0.587, 0.114));
            vec3 splitNoise = vec3(nR, nG, nB) * (0.020 + uSpeed * 0.014) * (0.18 + 0.82 * smoothstep(0.0, 0.20, luma));
            col = clamp(col + splitNoise, 0.0, 1.0);

            col = pow(col, vec3(1.0 / 2.2));
            gl_FragColor = vec4(col, 1.0);
          }
        `,
        uniforms: {
          tScene: { value: this.sceneRT.texture },
          tDofMid: { value: this.dof1B.texture },
          tDofWide: { value: this.dof2B.texture },
          tBloom1: { value: this.blur1B.texture },
          tBloom2: { value: this.blur2B.texture },
          tBloom3: { value: this.blur3B.texture },
          uTime: { value: 0 },
          uSpeed: { value: 0 },
          uHover: { value: 0 },
          uIntro: { value: 0 },
          uResolution: { value: new THREE.Vector2(rw, rh) }
        },
        depthTest: false,
        depthWrite: false
      });

      this.brightScene = new THREE.Scene();
      this.brightScene.add(new THREE.Mesh(this.postQuadGeo, this.brightMat));
      this.blurScene = new THREE.Scene();
      this.blurScene.add(new THREE.Mesh(this.postQuadGeo, this.blurMat));
      this.compositeScene = new THREE.Scene();
      this.compositeScene.add(new THREE.Mesh(this.postQuadGeo, this.compositeMat));
    }

    _initTexturesAndScene() {
      this.flowerAtlas = createFlowerAtlas();
      this.leafAtlas = createLeafAtlas();

      this._createTerrainOccluder();
      this._createLeavesLayer();
      this._createFlowersLayer();
      this._createDustParticlesLayer();
    }

    _createTerrainOccluder() {
      const segX = 64;
      const segZ = 96;
      const geo = new THREE.PlaneGeometry(116, VALLEY_LENGTH, segX, segZ);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const lx = pos.getX(i);
        const lz = pos.getY(i) + VALLEY_LENGTH * 0.5 - 16.0;
        pos.setXYZ(i, lx, 0, lz);
      }
      pos.needsUpdate = true;

      this.terrainMat = new THREE.ShaderMaterial({
        vertexShader: `
          ${GLSL_VALLEY_MATH}
          uniform float uCamZ;
          void main() {
            float localX = position.x;
            float worldZ = uCamZ + position.z;
            float worldX = valleyPathX(worldZ) + localX;
            float worldY = valleyTerrainHeight(localX, worldZ) - 0.65;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(worldX, worldY, worldZ, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uHover;
          void main() {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0 - uHover * 0.95);
          }
        `,
        uniforms: {
          uCamZ: { value: this.progress },
          uHover: { value: 0 }
        },
        transparent: true,
        depthWrite: true,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geo, this.terrainMat);
      mesh.frustumCulled = false;
      mesh.renderOrder = 0;
      this.scene.add(mesh);
    }

    // Layer 1: 50,000 Crisp Overlapping Dark Forest-Green Leaf Clusters
    //          (climbs high up both flanks & arches softly around the upper corners)
    _createLeavesLayer() {
      const COUNT = 50000;
      const rand = mulberry32(42191);

      const locals = new Float32Array(COUNT * 3);
      const seeds = new Float32Array(COUNT * 4);
      const tints = new Float32Array(COUNT * 3);
      const disperses = new Float32Array(COUNT * 3);

      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        const i4 = i * 4;

        const side = rand() < 0.5 ? -1 : 1;
        const band = rand();
        let localX;
        let hOff;
        if (band < 0.22) {
          // Valley floor carpet
          localX = (rand() - 0.5) * 14.0;
          hOff = -0.15 + rand() * 1.45;
        } else if (band < 0.78) {
          // Steep sweeping amphitheater hillsides climbing up toward top corners
          localX = side * (3.0 + Math.pow(rand(), 0.78) * 38.0) + (rand() - 0.5) * 3.2;
          hOff = -0.10 + rand() * 1.65;
        } else {
          // Upper-ridge shadowy foliage canopy arching softly around top-left & top-right
          localX = side * (16.0 + Math.pow(rand(), 0.85) * 28.0) + (rand() - 0.5) * 4.5;
          hOff = 0.8 + rand() * 5.2;
        }
        const baseZ = rand() * VALLEY_LENGTH;

        locals[i3] = localX;
        locals[i3 + 1] = hOff;
        locals[i3 + 2] = baseZ;

        seeds[i4] = Math.floor(rand() * 4);
        seeds[i4 + 1] = 0.96 + Math.pow(rand(), 1.1) * 1.65;
        seeds[i4 + 2] = (rand() - 0.5) * TWO_PI;
        seeds[i4 + 3] = rand() * TWO_PI;

        // Lush forest-olive & woodland moss greens (richer clarity on slopes)
        const tone = rand();
        const lum = 0.56 + rand() * 0.62;
        if (tone < 0.52) {
          tints[i3] = 0.52 * lum;
          tints[i3 + 1] = 0.92 * lum;
          tints[i3 + 2] = 0.26 * lum;
        } else if (tone < 0.86) {
          tints[i3] = 0.70 * lum;
          tints[i3 + 1] = 0.96 * lum;
          tints[i3 + 2] = 0.30 * lum;
        } else {
          tints[i3] = 0.38 * lum;
          tints[i3 + 1] = 0.76 * lum;
          tints[i3 + 2] = 0.24 * lum;
        }

        const ang = rand() * TWO_PI;
        const rad = 3.5 + rand() * 14.0;
        disperses[i3] = Math.cos(ang) * rad;
        disperses[i3 + 1] = (rand() - 0.22) * 9.5;
        disperses[i3 + 2] = Math.sin(ang) * rad * 0.8;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(locals, 3));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
      geo.setAttribute('aTint', new THREE.BufferAttribute(tints, 3));
      geo.setAttribute('aDisperse', new THREE.BufferAttribute(disperses, 3));

      this.leavesMat = new THREE.ShaderMaterial({
        vertexShader: `
          ${GLSL_VALLEY_MATH}
          attribute vec4 aSeed;
          attribute vec3 aTint;
          attribute vec3 aDisperse;

          uniform float uCamZ;
          uniform float uTime;
          uniform float uDpr;
          uniform float uAspect;
          uniform vec2 uMouseNDC;
          uniform float uMousePresence;
          uniform float uHover;
          uniform float uIntro;

          varying float vSprite;
          varying float vRot;
          varying vec3 vTint;
          varying float vAlpha;
          varying float vMouseGlow;
          varying float vFog;

          void main() {
            float relZ = mod(position.z - uCamZ + 14.0, VALLEY_LENGTH) - 14.0;
            float worldZ = uCamZ + relZ;
            float worldX = valleyPathX(worldZ) + position.x;
            float worldY = valleyTerrainHeight(position.x, worldZ) + position.y;

            float phase = aSeed.w;
            float sway = sin(uTime * 0.9 + worldZ * 0.18 + phase) * 0.20;
            worldX += sway;
            worldY += cos(uTime * 0.75 + phase) * 0.08;

            float hEase = uHover * uHover * (3.0 - 2.0 * uHover);
            vec3 floatDrift = vec3(
              sin(uTime * 0.55 + phase) * 1.4,
              cos(uTime * 0.42 + phase * 1.3) * 1.1,
              sin(uTime * 0.48 + phase * 0.7) * 1.1
            );
            vec3 worldPos = vec3(worldX, worldY, worldZ) + (aDisperse + floatDrift) * hEase;

            vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
            float viewDist = -mvPosition.z;

            // Leaves grow in further back along the valley hillsides, arching gently into the upper night sky
            float leafGrow = smoothstep(150.0, 22.0, viewDist);
            float growScale = mix(0.28, 1.15, pow(leafGrow, 0.85));

            float nearFade = smoothstep(2.0, 4.8, viewDist);
            float farFade = smoothstep(156.0, 68.0, viewDist);

            vec4 clipPos = projectionMatrix * mvPosition;
            vec2 ndc = clipPos.xy / max(clipPos.w, 0.001);

            vec2 delta = (ndc - uMouseNDC) * vec2(uAspect, 1.0);
            float mDist = length(delta);
            float softPush = 0.064 * exp(-mDist * mDist * 10.5) * smoothstep(0.0, 0.05, mDist) * uMousePresence;
            float depthAtten = smoothstep(82.0, 9.0, viewDist);
            vec2 pushDir = normalize(delta + vec2(0.0001));
            clipPos.xy += (pushDir * softPush * depthAtten * clipPos.w) / vec2(uAspect, 1.0);

            vMouseGlow = exp(-mDist * mDist * 8.5) * uMousePresence * depthAtten;
            vSprite = aSeed.x;
            vRot = aSeed.z + sway * 0.25;
            vTint = aTint;
            vFog = 1.0 - exp(-pow(max(viewDist, 0.0) * 0.0128, 1.78));
            vAlpha = nearFade * farFade * (0.32 + 0.68 * leafGrow) * uIntro;

            float hoverSize = mix(1.0, 0.24, hEase);
            float ptSize = (218.0 * aSeed.y * growScale * hoverSize * uDpr) / max(viewDist, 1.0);
            gl_PointSize = clamp(ptSize, 0.0, 250.0 * uDpr);
            gl_Position = clipPos;
          }
        `,
        fragmentShader: `
          uniform sampler2D uLeafAtlas;
          uniform float uHover;

          varying float vSprite;
          varying float vRot;
          varying vec3 vTint;
          varying float vAlpha;
          varying float vMouseGlow;
          varying float vFog;

          void main() {
            if (vAlpha < 0.01) discard;

            vec2 centered = gl_PointCoord - 0.5;
            float r = length(centered);
            if (r > 0.5) discard;

            float c = cos(vRot);
            float s = sin(vRot);
            vec2 rotUv = vec2(
              centered.x * c - centered.y * s,
              centered.x * s + centered.y * c
            ) + 0.5;

            float leafAlpha = 0.0;
            vec3 leafSample = vec3(0.0);

            if (rotUv.x >= 0.0 && rotUv.x <= 1.0 && rotUv.y >= 0.0 && rotUv.y <= 1.0) {
              float colIdx = mod(vSprite, 2.0);
              float rowIdx = floor(vSprite * 0.5);
              float vBase = (1.0 - rowIdx) * 0.5;
              vec2 cellUv = vec2(
                (colIdx + clamp(rotUv.x, 0.02, 0.98)) * 0.5,
                vBase + (1.0 - clamp(rotUv.y, 0.02, 0.98)) * 0.5
              );
              vec4 tex = texture2D(uLeafAtlas, cellUv);
              leafSample = tex.rgb;
              leafAlpha = tex.a;
            }

            float orbMask = exp(-r * r * 30.0) * smoothstep(0.49, 0.22, r);
            float mask = mix(leafAlpha, orbMask * 0.52, uHover);
            if (mask < 0.015) discard;

            vec3 leafCol = leafSample * vTint * 0.96;
            // Subtle warm olive rim glow near cursor without washing out flowers
            leafCol += vec3(0.16, 0.22, 0.05) * vMouseGlow * 0.42;

            vec3 orbCol = mix(vTint, vec3(0.75, 0.96, 0.55), 0.4) * 1.15;
            vec3 col = mix(leafCol, orbCol, uHover);

            col *= (1.0 - clamp(vFog * (1.0 - uHover * 0.55), 0.0, 0.97));

            gl_FragColor = vec4(col, mask * vAlpha * 0.95);
          }
        `,
        uniforms: {
          uLeafAtlas: { value: this.leafAtlas },
          uCamZ: { value: this.progress },
          uTime: { value: 0 },
          uDpr: { value: this.dpr },
          uAspect: { value: this.width / this.height },
          uMouseNDC: { value: this.mouseNDC },
          uMousePresence: { value: 0 },
          uHover: { value: 0 },
          uIntro: { value: 0 }
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending
      });

      const points = new THREE.Points(geo, this.leavesMat);
      points.frustumCulled = false;
      points.renderOrder = 1;
      this.scene.add(points);
    }

    // Layer 2: 29,000 Razor-Clear Wildflowers in Vivid Natural Colonies
    _createFlowersLayer() {
      const COUNT = 29000;
      const rand = mulberry32(99173);

      const locals = new Float32Array(COUNT * 3);
      const seeds = new Float32Array(COUNT * 4);
      const tints = new Float32Array(COUNT * 3);
      const disperses = new Float32Array(COUNT * 3);

      // Rich, high-clarity photographic botanical colors matching the reference photo
      const colonyPalettes = [
        // 0: Vivid Tangerine / Burnt-Orange sweeping meadow drift
        { sprites: [0, 5], rgb: [1.34, 0.62, 0.20], boost: 1.24 },
        // 1: Sun-Gold / Buttercup Yellow hero clusters
        { sprites: [1, 4], rgb: [1.34, 1.12, 0.24], boost: 1.28 },
        // 2: Luminous Lilac / Lavender Cosmos with crisp pale petals
        { sprites: [2, 6], rgb: [1.06, 0.78, 1.38], boost: 1.24 },
        // 3: Vivid Rose-Pink / Fuchsia wildflowers
        { sprites: [3, 7], rgb: [1.32, 0.44, 0.80], boost: 1.20 }
      ];

      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        const i4 = i * 4;

        // Abundant sweeping floral colonies on right hillside & valley floor,
        // plus upper-left & upper-right ridge blooms framing the top corners in creamy bokeh
        const side = rand() < 0.40 ? -1 : 1;
        const band = rand();
        let localX;
        let hOff;
        if (band < 0.24) {
          localX = (rand() - 0.42) * 14.0;
          hOff = 0.30 + rand() * 1.48;
        } else if (band < 0.86) {
          localX = side * (2.2 + Math.pow(rand(), 0.78) * 34.0) + (rand() - 0.5) * 3.0;
          hOff = 0.30 + rand() * 1.55;
        } else {
          // Upper hillside floral canopy arching into top-left & top-right corners
          localX = side * (17.0 + Math.pow(rand(), 0.85) * 24.0) + (rand() - 0.5) * 4.0;
          hOff = 0.9 + rand() * 4.4;
        }
        const baseZ = rand() * VALLEY_LENGTH;

        locals[i3] = localX;
        locals[i3 + 1] = hOff;
        locals[i3 + 2] = baseZ;

        const n1 = colonyNoise(localX, baseZ, 0.4);
        const n2 = colonyNoise(localX * 0.85, baseZ, 3.1);
        const sideBias = localX > 1.5 ? 0.36 : -0.30;

        let colonyIdx;
        if (rand() < 0.13) {
          colonyIdx = Math.floor(rand() * 4);
        } else if (n1 + sideBias > 0.26) {
          colonyIdx = 0; // Sweeping bright orange meadow drift
        } else if (n2 > 0.20) {
          colonyIdx = 1; // Golden buttercups
        } else if (localX < -2.0 && n1 < -0.08) {
          colonyIdx = 3; // Rose-pink / fuchsia wildflowers on left slope
        } else if (n2 < -0.14) {
          colonyIdx = 2; // Lilac / lavender cosmos
        } else {
          colonyIdx = side > 0 ? (rand() < 0.52 ? 0 : (rand() < 0.55 ? 1 : 2)) : (rand() < 0.55 ? 3 : 1);
        }

        const colInfo = colonyPalettes[colonyIdx];
        const spriteChoice = colInfo.sprites[rand() < 0.62 ? 0 : 1];

        seeds[i4] = spriteChoice;
        const baseSize = spriteChoice === 0
          ? (0.64 + Math.pow(rand(), 1.25) * 1.15)
          : (0.72 + Math.pow(rand(), 1.25) * 1.32);
        seeds[i4 + 1] = baseSize;
        seeds[i4 + 2] = (rand() - 0.5) * TWO_PI;
        seeds[i4 + 3] = rand() * TWO_PI;

        // Natural valley illumination: right & bottom meadows glow vividly, far-left inner canyon slightly moodier
        const sideLight = localX > 0.0 ? 1.10 : 0.86;
        const shimmer = (0.74 + rand() * 0.46) * colInfo.boost * sideLight;
        tints[i3] = colInfo.rgb[0] * shimmer;
        tints[i3 + 1] = colInfo.rgb[1] * shimmer;
        tints[i3 + 2] = colInfo.rgb[2] * shimmer;

        const ang = rand() * TWO_PI;
        const radial = 4.0 + rand() * 15.5;
        disperses[i3] = Math.cos(ang) * radial;
        disperses[i3 + 1] = (rand() - 0.24) * 10.5;
        disperses[i3 + 2] = Math.sin(ang) * radial * 0.85;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(locals, 3));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
      geo.setAttribute('aTint', new THREE.BufferAttribute(tints, 3));
      geo.setAttribute('aDisperse', new THREE.BufferAttribute(disperses, 3));

      this.flowersMat = new THREE.ShaderMaterial({
        vertexShader: `
          ${GLSL_VALLEY_MATH}
          attribute vec4 aSeed;
          attribute vec3 aTint;
          attribute vec3 aDisperse;

          uniform float uCamZ;
          uniform float uTime;
          uniform float uDpr;
          uniform float uAspect;
          uniform vec2 uMouseNDC;
          uniform float uMousePresence;
          uniform vec2 uKeyLightNDC;
          uniform float uHover;
          uniform float uIntro;

          varying float vSprite;
          varying float vRot;
          varying vec3 vTint;
          varying float vAlpha;
          varying float vMouseGlow;
          varying float vKeyLight;
          varying float vBloomFactor;
          varying float vFog;
          varying float vTwinkle;

          void main() {
            float relZ = mod(position.z - uCamZ + 14.0, VALLEY_LENGTH) - 14.0;
            float worldZ = uCamZ + relZ;
            float worldX = valleyPathX(worldZ) + position.x;
            float worldY = valleyTerrainHeight(position.x, worldZ) + position.y;

            float phase = aSeed.w;
            float breeze = sin(uTime * 1.05 + worldZ * 0.22 + position.x * 0.14 + phase);
            worldX += breeze * 0.18;
            worldY += cos(uTime * 0.85 + phase) * 0.08;

            float hEase = uHover * uHover * (3.0 - 2.0 * uHover);
            vec3 curlFloat = vec3(
              sin(uTime * 0.65 + phase * 1.7) * 1.6,
              cos(uTime * 0.50 + phase * 1.1) * 1.3,
              sin(uTime * 0.58 + phase * 0.9) * 1.3
            );
            vec3 worldPos = vec3(worldX, worldY, worldZ) + (aDisperse + curlFloat) * hEase;

            vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
            float viewDist = -mvPosition.z;

            // Flowers bloom from small buds into crisp, vivid full blossoms as they approach
            float bloomT = smoothstep(58.0, 9.0, viewDist);
            float bloomScale = mix(0.24, 1.16, pow(bloomT, 0.80));
            bloomScale *= (0.96 + 0.04 * sin(uTime * 1.4 + phase));

            float nearFade = smoothstep(2.0, 4.4, viewDist);
            float farFade = smoothstep(128.0, 46.0, viewDist);

            vec4 clipPos = projectionMatrix * mvPosition;
            vec2 ndc = clipPos.xy / max(clipPos.w, 0.001);

            // Soft organic Gaussian-derivative cursor parting (never punches a hard ring)
            vec2 delta = (ndc - uMouseNDC) * vec2(uAspect, 1.0);
            float mDist = length(delta);
            float softPush = 0.072 * exp(-mDist * mDist * 10.0) * smoothstep(0.0, 0.05, mDist) * uMousePresence;
            float depthAtten = smoothstep(78.0, 8.0, viewDist);
            vec2 pushDir = normalize(delta + vec2(0.0001));
            clipPos.xy += (pushDir * softPush * depthAtten * clipPos.w) / vec2(uAspect, 1.0);

            // Cursor glow (color-preserving!) + gentle warm directional key light on right/lower valley
            vMouseGlow = exp(-mDist * mDist * 9.5) * uMousePresence * depthAtten;
            vec2 keyDelta = (ndc - uKeyLightNDC) * vec2(uAspect, 1.0);
            vKeyLight = exp(-dot(keyDelta, keyDelta) * 2.6) * depthAtten;

            vSprite = aSeed.x;
            vRot = aSeed.z + (1.0 - bloomT) * 0.95 + breeze * 0.15;
            vTint = aTint;
            vBloomFactor = bloomT;
            vFog = 1.0 - exp(-pow(max(viewDist, 0.0) * 0.021, 1.85));
            vTwinkle = 0.70 + 0.30 * sin(uTime * 2.2 + phase * 3.1);
            vAlpha = nearFade * farFade * uIntro;

            float hoverSize = mix(1.0, 0.32 + 0.15 * vTwinkle, hEase);
            float mousePop = 1.0 + vMouseGlow * 0.22;
            float ptSize = (164.0 * aSeed.y * bloomScale * hoverSize * mousePop * uDpr) / max(viewDist, 1.0);
            gl_PointSize = clamp(ptSize, 0.0, 235.0 * uDpr);
            gl_Position = clipPos;
          }
        `,
        fragmentShader: `
          uniform sampler2D uFlowerAtlas;
          uniform float uHover;

          varying float vSprite;
          varying float vRot;
          varying vec3 vTint;
          varying float vAlpha;
          varying float vMouseGlow;
          varying float vKeyLight;
          varying float vBloomFactor;
          varying float vFog;
          varying float vTwinkle;

          void main() {
            if (vAlpha < 0.01) discard;

            vec2 centered = gl_PointCoord - 0.5;
            float r = length(centered);
            if (r > 0.5) discard;

            float c = cos(vRot);
            float s = sin(vRot);
            vec2 rotUv = vec2(
              centered.x * c - centered.y * s,
              centered.x * s + centered.y * c
            ) + 0.5;

            float petalAlpha = 0.0;
            vec3 petalSample = vec3(0.0);

            if (rotUv.x >= 0.0 && rotUv.x <= 1.0 && rotUv.y >= 0.0 && rotUv.y <= 1.0) {
              float colIdx = mod(vSprite, 4.0);
              float rowIdx = floor(vSprite * 0.25);
              float vBase = (1.0 - rowIdx) * 0.5;
              vec2 cellUv = vec2(
                (colIdx + clamp(rotUv.x, 0.02, 0.98)) * 0.25,
                vBase + (1.0 - clamp(rotUv.y, 0.02, 0.98)) * 0.5
              );
              vec4 tex = texture2D(uFlowerAtlas, cellUv);
              petalSample = tex.rgb;
              petalAlpha = tex.a;
            }

            float orbCore = exp(-r * r * 34.0);
            float orbHalo = exp(-r * r * 11.0) * 0.36;
            float orbMask = (orbCore + orbHalo) * smoothstep(0.49, 0.22, r);

            float mask = mix(petalAlpha, orbMask, uHover);
            if (mask < 0.012) discard;

            // Clear, vivid, color-faithful botanical illumination (preserves crisp petal shading!)
            float baseLum = mix(0.62, 1.14, vBloomFactor);
            float keyBoost = 1.0 + vKeyLight * 0.68;
            vec3 petalCol = petalSample * vTint * baseLum * keyBoost;

            // Color-preserving cursor radiance: lifts the flower's OWN rich color into warm bloom
            // instead of washing petals into flat white blobs!
            vec3 cursorLift = petalSample * mix(vTint * 1.95, vec3(1.9, 1.65, 1.15), 0.36);
            petalCol += cursorLift * pow(vMouseGlow, 1.15) * 1.65;

            vec3 orbCol = mix(vTint, vec3(1.0, 0.92, 0.72), 0.32) * (1.35 + 0.45 * vTwinkle);
            vec3 col = mix(petalCol, orbCol, uHover);

            // Dissolve naturally into pure pitch-black void
            float fogAtten = 1.0 - clamp(vFog * (1.0 - uHover * 0.65) * (1.0 - vMouseGlow * 0.55), 0.0, 0.95);
            col *= fogAtten;

            gl_FragColor = vec4(col, mask * vAlpha);
          }
        `,
        uniforms: {
          uFlowerAtlas: { value: this.flowerAtlas },
          uCamZ: { value: this.progress },
          uTime: { value: 0 },
          uDpr: { value: this.dpr },
          uAspect: { value: this.width / this.height },
          uMouseNDC: { value: this.mouseNDC },
          uMousePresence: { value: 0 },
          uKeyLightNDC: { value: new THREE.Vector2(0.40, -0.32) },
          uHover: { value: 0 },
          uIntro: { value: 0 }
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending
      });

      const points = new THREE.Points(geo, this.flowersMat);
      points.frustumCulled = false;
      points.renderOrder = 2;
      this.scene.add(points);
    }

    // Layer 3: Subtle Warm Floating Pollen Motes
    _createDustParticlesLayer() {
      const COUNT = 850;
      const rand = mulberry32(55109);

      const locals = new Float32Array(COUNT * 3);
      const seeds = new Float32Array(COUNT * 4);

      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        const i4 = i * 4;
        locals[i3] = (rand() - 0.5) * 58.0;
        locals[i3 + 1] = 0.4 + rand() * 13.5;
        locals[i3 + 2] = rand() * VALLEY_LENGTH;

        seeds[i4] = 0.38 + rand() * 1.0;
        seeds[i4 + 1] = rand() * TWO_PI;
        seeds[i4 + 2] = 0.25 + rand() * 0.7;
        seeds[i4 + 3] = rand();
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(locals, 3));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));

      this.dustMat = new THREE.ShaderMaterial({
        vertexShader: `
          ${GLSL_VALLEY_MATH}
          attribute vec4 aSeed;

          uniform float uCamZ;
          uniform float uTime;
          uniform float uDpr;
          uniform float uAspect;
          uniform vec2 uMouseNDC;
          uniform float uMousePresence;
          uniform float uHover;
          uniform float uIntro;

          varying float vAlpha;
          varying float vColorMix;
          varying float vGlow;

          void main() {
            float relZ = mod(position.z - uCamZ + 12.0, VALLEY_LENGTH) - 12.0;
            float worldZ = uCamZ + relZ;
            float phase = aSeed.y;
            float spd = aSeed.z;

            float worldX = valleyPathX(worldZ) + position.x + sin(uTime * 0.45 * spd + phase) * 1.4;
            float baseY = valleyTerrainHeight(position.x, worldZ);
            float floatY = mod(position.y + uTime * 0.30 * spd, 14.0);
            float worldY = baseY + floatY + cos(uTime * 0.5 * spd + phase) * 0.4;

            vec4 mvPosition = modelViewMatrix * vec4(worldX, worldY, worldZ, 1.0);
            float viewDist = -mvPosition.z;

            vec4 clipPos = projectionMatrix * mvPosition;
            vec2 ndc = clipPos.xy / max(clipPos.w, 0.001);
            vec2 delta = (ndc - uMouseNDC) * vec2(uAspect, 1.0);
            float mDist = length(delta);
            float softPush = 0.085 * exp(-mDist * mDist * 9.5) * smoothstep(0.0, 0.05, mDist) * uMousePresence;
            clipPos.xy += (normalize(delta + vec2(0.0001)) * softPush * clipPos.w) / vec2(uAspect, 1.0);

            float twinkle = 0.35 + 0.65 * sin(uTime * (1.8 + spd * 1.4) + phase * 2.0);
            float nearFade = smoothstep(1.5, 4.5, viewDist);
            float farFade = smoothstep(92.0, 26.0, viewDist);

            vAlpha = nearFade * farFade * twinkle * (0.34 + uHover * 0.60) * uIntro;
            vColorMix = aSeed.w;
            vGlow = exp(-mDist * mDist * 9.0) * uMousePresence;

            float ptSize = (20.0 * aSeed.x * (1.0 + uHover * 0.4 + vGlow * 0.65) * uDpr) / max(viewDist, 1.0);
            gl_PointSize = clamp(ptSize, 0.0, 32.0 * uDpr);
            gl_Position = clipPos;
          }
        `,
        fragmentShader: `
          varying float vAlpha;
          varying float vColorMix;
          varying float vGlow;

          void main() {
            float r = length(gl_PointCoord - 0.5);
            if (r > 0.5) discard;
            float soft = (exp(-r * r * 28.0) + exp(-r * r * 9.0) * 0.22) * smoothstep(0.49, 0.22, r);
            vec3 warmGold = vec3(1.0, 0.88, 0.52);
            vec3 softRose = vec3(1.0, 0.74, 0.86);
            vec3 col = mix(warmGold, softRose, vColorMix) * (1.05 + vGlow * 1.8);
            gl_FragColor = vec4(col, soft * vAlpha);
          }
        `,
        uniforms: {
          uCamZ: { value: this.progress },
          uTime: { value: 0 },
          uDpr: { value: this.dpr },
          uAspect: { value: this.width / this.height },
          uMouseNDC: { value: this.mouseNDC },
          uMousePresence: { value: 0 },
          uHover: { value: 0 },
          uIntro: { value: 0 }
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      const points = new THREE.Points(geo, this.dustMat);
      points.frustumCulled = false;
      points.renderOrder = 3;
      this.scene.add(points);
    }

    startHoverTransition() {
      this.hoverTarget = 1.0;
      audioStore().setMuffled(true);
    }

    stopHoverTransition() {
      this.hoverTarget = 0.0;
      audioStore().setMuffled(false);
    }

    _bindEvents() {
      this._onResize = () => {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);

        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setPixelRatio(this.dpr);
        this.renderer.setSize(this.width, this.height);

        const rw = Math.max(1, Math.floor(this.width * this.dpr));
        const rh = Math.max(1, Math.floor(this.height * this.dpr));
        const halfW = Math.max(1, Math.floor(rw * 0.5));
        const halfH = Math.max(1, Math.floor(rh * 0.5));
        const qtrW = Math.max(1, Math.floor(rw * 0.25));
        const qtrH = Math.max(1, Math.floor(rh * 0.25));
        const octW = Math.max(1, Math.floor(rw * 0.125));
        const octH = Math.max(1, Math.floor(rh * 0.125));

        this.sceneRT.setSize(rw, rh);
        this.dof1A.setSize(halfW, halfH);
        this.dof1B.setSize(halfW, halfH);
        this.dof2A.setSize(qtrW, qtrH);
        this.dof2B.setSize(qtrW, qtrH);
        this.brightRT.setSize(halfW, halfH);
        this.blur1A.setSize(halfW, halfH);
        this.blur1B.setSize(halfW, halfH);
        this.blur2A.setSize(qtrW, qtrH);
        this.blur2B.setSize(qtrW, qtrH);
        this.blur3A.setSize(octW, octH);
        this.blur3B.setSize(octW, octH);

        const aspect = this.width / this.height;
        this.leavesMat.uniforms.uDpr.value = this.dpr;
        this.leavesMat.uniforms.uAspect.value = aspect;
        this.flowersMat.uniforms.uDpr.value = this.dpr;
        this.flowersMat.uniforms.uAspect.value = aspect;
        this.dustMat.uniforms.uDpr.value = this.dpr;
        this.dustMat.uniforms.uAspect.value = aspect;
        this.compositeMat.uniforms.uResolution.value.set(rw, rh);
      };

      this._onPointerMove = (e) => {
        this.mouseTargetX = (e.clientX / this.width) * 2.0 - 1.0;
        this.mouseTargetY = -(e.clientY / this.height) * 2.0 + 1.0;
        this.mousePresenceTarget = 1.0;
      };

      this._onPointerLeave = () => {
        this.mousePresenceTarget = 0.0;
      };

      this._onWheel = (e) => {
        e.preventDefault();
        let dy = e.deltaY;
        if (e.deltaMode === 1) dy *= 32;
        else if (e.deltaMode === 2) dy *= window.innerHeight;
        this.scrollVelocity += dy * 0.011;
      };

      this._onTouchStart = (e) => {
        if (e.touches.length > 0) {
          this.lastTouchY = e.touches[0].clientY;
        }
      };

      this._onTouchMove = (e) => {
        if (e.touches.length > 0 && this.lastTouchY !== null) {
          const y = e.touches[0].clientY;
          const x = e.touches[0].clientX;
          const dy = this.lastTouchY - y;
          this.lastTouchY = y;
          this.scrollVelocity += dy * 0.011 * 20.0 * 0.12;
          this.mouseTargetX = (x / this.width) * 2.0 - 1.0;
          this.mouseTargetY = -(y / this.height) * 2.0 + 1.0;
          this.mousePresenceTarget = 0.85;
        }
      };

      this._onTouchEnd = () => {
        this.lastTouchY = null;
        this.mousePresenceTarget = 0.0;
      };

      this._onKeyDown = (e) => {
        if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
          this.scrollVelocity += 1.8;
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
          this.scrollVelocity -= 1.8;
        }
      };

      window.addEventListener('resize', this._onResize);
      window.addEventListener('pointermove', this._onPointerMove, { passive: true });
      window.addEventListener('pointerleave', this._onPointerLeave, { passive: true });
      window.addEventListener('wheel', this._onWheel, { passive: false });
      window.addEventListener('touchstart', this._onTouchStart, { passive: true });
      window.addEventListener('touchmove', this._onTouchMove, { passive: true });
      window.addEventListener('touchend', this._onTouchEnd, { passive: true });
      window.addEventListener('keydown', this._onKeyDown);
    }

    _blurPass(srcRT, midRT, dstRT, stride) {
      const r = this.renderer;
      const invW = 1.0 / midRT.width;
      const invH = 1.0 / midRT.height;

      this.blurMat.uniforms.tDiffuse.value = srcRT.texture;
      this.blurMat.uniforms.uDirection.value.set(invW * stride, 0);
      r.setRenderTarget(midRT);
      r.render(this.blurScene, this.postCamera);

      this.blurMat.uniforms.tDiffuse.value = midRT.texture;
      this.blurMat.uniforms.uDirection.value.set(0, invH * stride);
      r.setRenderTarget(dstRT);
      r.render(this.blurScene, this.postCamera);
    }

    _renderPost() {
      const r = this.renderer;

      // 1. Render sharp HDR 3D valley scene
      r.setRenderTarget(this.sceneRT);
      r.clear();
      r.render(this.scene, this.camera);

      // 2. Optical Peripheral Lens Blur pyramid (strict stride=1.0 multi-iteration Gaussian = silky zero-grid bokeh!)
      this._blurPass(this.sceneRT, this.dof1A, this.dof1B, 1.0);
      this._blurPass(this.dof1B, this.dof1A, this.dof1B, 1.0);
      this._blurPass(this.dof1B, this.dof2A, this.dof2B, 1.0);
      this._blurPass(this.dof2B, this.dof2A, this.dof2B, 1.0);

      // 3. Soft-knee HDR Bloom pyramid
      r.setRenderTarget(this.brightRT);
      r.render(this.brightScene, this.postCamera);
      this._blurPass(this.brightRT, this.blur1A, this.blur1B, 1.0);
      this._blurPass(this.blur1B, this.blur2A, this.blur2B, 1.15);
      this._blurPass(this.blur2B, this.blur3A, this.blur3B, 1.25);

      // 4. Final composite to screen
      r.setRenderTarget(null);
      r.render(this.compositeScene, this.postCamera);
    }

    _animate() {
      if (this.disposed) return;
      this._rafId = requestAnimationFrame(this._animate.bind(this));

      const dt = Math.min(this.clock.getDelta(), 0.05);
      const elapsed = this.clock.elapsedTime;

      if (this.loaded) {
        this.introElapsed = Math.min(this.introElapsed + dt, this.introDuration);
      }
      const introLinear = this.introElapsed / this.introDuration;
      const introEase = 1.0 - Math.pow(1.0 - introLinear, 3.0);

      const hoverRate = 1.0 - Math.exp(-dt * 2.4);
      this.hoverValue += (this.hoverTarget - this.hoverValue) * hoverRate;
      const flightScale = Math.max(0.0, 1.0 - this.hoverValue * 0.985);

      const scrollDamp = Math.exp(-dt * 3.8);
      this.scrollVelocity *= scrollDamp;
      this.scrollVelocity = THREE.MathUtils.clamp(this.scrollVelocity, -24, 24);

      const idleDrift = 1.55;
      const introBoost = (1.0 - introEase) * 8.5;
      const frameSpeed = (idleDrift + introBoost + this.scrollVelocity) * flightScale;
      this.progress += frameSpeed * dt;

      const rawSpeedNorm = THREE.MathUtils.clamp(Math.abs(this.scrollVelocity) / 14.0, 0.0, 1.0);
      this.speedSmooth += (rawSpeedNorm - this.speedSmooth) * (1.0 - Math.exp(-dt * 4.5));

      const mLerp = 1.0 - Math.exp(-dt * 7.5);
      this.mouseSmooth.x += (this.mouseTargetX - this.mouseSmooth.x) * mLerp;
      this.mouseSmooth.y += (this.mouseTargetY - this.mouseSmooth.y) * mLerp;
      this.mousePresence += (this.mousePresenceTarget - this.mousePresence) * (1.0 - Math.exp(-dt * 5.0));

      if (this.mousePresence > 0.002) {
        this.mouseNDC.set(this.mouseSmooth.x, this.mouseSmooth.y);
      } else {
        this.mouseNDC.set(99, 99);
      }

      const camPos = new THREE.Vector3();
      const lookPos = new THREE.Vector3();
      this._sampleSpline(this.progress, camPos);
      this._sampleSpline(this.progress + 16.0, lookPos);

      camPos.y += 0.45 + (1.0 - introEase) * 4.2;
      lookPos.y -= 0.10;

      const tiltStrength = this.mousePresence * (1.0 - this.hoverValue * 0.35);
      camPos.x += this.mouseSmooth.x * 1.15 * tiltStrength;
      camPos.y += this.mouseSmooth.y * 0.65 * tiltStrength;

      lookPos.x += this.mouseSmooth.x * 3.2 * tiltStrength;
      lookPos.y += this.mouseSmooth.y * 2.0 * tiltStrength;

      this.camera.position.copy(camPos);
      this.camera.lookAt(lookPos);

      const targetFov = 60.0 + this.speedSmooth * 4.5 + this.hoverValue * 2.0;
      if (Math.abs(this.camera.fov - targetFov) > 0.01) {
        this.camera.fov += (targetFov - this.camera.fov) * (1.0 - Math.exp(-dt * 4.0));
        this.camera.updateProjectionMatrix();
      }

      this.flowersMat.uniforms.uKeyLightNDC.value.set(
        0.40 + Math.sin(elapsed * 0.28) * 0.05,
        -0.30 + Math.cos(elapsed * 0.22) * 0.04
      );

      this.terrainMat.uniforms.uCamZ.value = this.progress;
      this.terrainMat.uniforms.uHover.value = this.hoverValue;

      this.leavesMat.uniforms.uCamZ.value = this.progress;
      this.leavesMat.uniforms.uTime.value = elapsed;
      this.leavesMat.uniforms.uMousePresence.value = this.mousePresence;
      this.leavesMat.uniforms.uHover.value = this.hoverValue;
      this.leavesMat.uniforms.uIntro.value = introEase;

      this.flowersMat.uniforms.uCamZ.value = this.progress;
      this.flowersMat.uniforms.uTime.value = elapsed;
      this.flowersMat.uniforms.uMousePresence.value = this.mousePresence;
      this.flowersMat.uniforms.uHover.value = this.hoverValue;
      this.flowersMat.uniforms.uIntro.value = introEase;

      this.dustMat.uniforms.uCamZ.value = this.progress;
      this.dustMat.uniforms.uTime.value = elapsed;
      this.dustMat.uniforms.uMousePresence.value = this.mousePresence;
      this.dustMat.uniforms.uHover.value = this.hoverValue;
      this.dustMat.uniforms.uIntro.value = introEase;

      this.compositeMat.uniforms.uTime.value = elapsed;
      this.compositeMat.uniforms.uSpeed.value = this.speedSmooth;
      this.compositeMat.uniforms.uHover.value = this.hoverValue;
      this.compositeMat.uniforms.uIntro.value = introEase;

      this._renderPost();

      if (this.loaded && introLinear >= 0.86) {
        this.onIntroDone();
      }
    }
  }

  window.__GE = {
    et: () => Valley,
    Y: () => audioStore
  };
})();
