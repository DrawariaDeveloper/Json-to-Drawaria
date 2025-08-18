// Advanced async art effects methods
export class ArtEffectsAsync {

  static async drawPixel(context, x, y, size, color, drawDelay) {
    const endX = x + size * 0.0001;
    const endY = y + size * 0.0001;
    const effectiveThickness = size * Math.min(context._canvas.width, context._canvas.height) * 0.9;

    if (!context._sendDrawCmd([x, y], [endX, endY], color, effectiveThickness)) {
      context._drawingActive = false;
      return false;
    }
    if (drawDelay > 0) await context._delay(drawDelay);
    return true;
  }

  static async executeDrawingCommands(context, commands) {
    if (!getGameSocket() || getGameSocket().readyState !== WebSocket.OPEN) {
      context.notify("error", "Not connected to Drawaria. Please be in a room.");
      context._drawingActive = false;
      return;
    }
    context._drawingActive = true;
    context.notify("info", `Drawing ${commands.length} lines...`);
    const drawDelay = parseInt(context._ui.engineDrawDelay.value, 10) || 10;

    for (let i = 0; i < commands.length; i++) {
      if (!context._drawingActive) {
        context.notify("info", "Drawing stopped by user.");
        break;
      }
      let line = commands[i];
      if (!context._sendDrawCmd(line.pos1, line.pos2, line.color, line.thickness)) {
        context.notify("warning", "Drawing interrupted: WebSocket closed or error.");
        break;
      }
      if (drawDelay > 0) await context._delay(drawDelay);
    }
    context._drawingActive = false;
    context.notify("success", 'Finished drawing.');
  }

  static async clearCanvas(context) {
    if (!context._canvas || !context._ctx) {
      context.notify("error", "Canvas not found, cannot clear locally.");
      return;
    }
    if (!getGameSocket() || getGameSocket().readyState !== WebSocket.OPEN) {
      context.notify("error", "Not connected to Drawaria. Cannot send clear command to server.");
      return;
    }

    context._ctx.clearRect(0, 0, context._canvas.width, context._canvas.height);
    context.notify("info", "Sending clear commands...");
    const clearThickness = 2000;
    const clearColor = '#FFFFFF';
    const steps = 5;

    for (let i = 0; i <= steps; i++) {
      if (!context._sendDrawCmd([0.01, (i / steps)], [0.99, (i / steps)], clearColor, clearThickness, true)) break;
      await context._delay(5);
      if (!context._sendDrawCmd([(i / steps), 0.01], [(i / steps), 0.99], clearColor, clearThickness, true)) break;
      await context._delay(5);
    }
    context.notify("success", "Clear commands sent.");
  }

  static async drawPixelText(context, text, startX, startY, charPixelSize, color, textPixelDelay, letterSpacingFactor = 0.8) {
    let currentX = startX;
    text = text.toUpperCase();

    for (const char of text) {
      if (!context._drawingActive) return;
      const charData = context._pixelFont[char];
      if (charData) {
        let charWidth = 0;
        for (let y = 0; y < context._charHeight; y++) {
          if (!context._drawingActive) return;
          const row = charData[y];
          charWidth = Math.max(charWidth, row.length);
          for (let x = 0; x < row.length; x++) {
            if (!context._drawingActive) return;
            if (row[x] === '1') {
              const dX = currentX + x * charPixelSize;
              const dY = startY + y * charPixelSize;
              if (!await ArtEffectsAsync.drawPixel(context, dX, dY, charPixelSize, color, textPixelDelay)) return;
            }
          }
        }
        currentX += (charWidth + letterSpacingFactor) * charPixelSize;
      } else {
        currentX += (3 + letterSpacingFactor) * charPixelSize;
      }
    }
  }

  static async pixelArtCharacters(context) {
    if (!getGameSocket() || getGameSocket().readyState !== WebSocket.OPEN) { 
      context.notify("error", "Not connected to Drawaria. Please be in a room."); 
      return; 
    }
    context._drawingActive = true; 
    context.notify("info", "Starting Enhanced Pixel Art Characters...");

    const Q_TOP_LEFT = { xMin: 0.0, yMin: 0.0, xMax: 0.5, yMax: 0.5 };
    const Q_TOP_RIGHT = { xMin: 0.5, yMin: 0.0, xMax: 1.0, yMax: 0.5 };
    const Q_BOTTOM_LEFT = { xMin: 0.0, yMin: 0.5, xMax: 0.5, yMax: 1.0 };
    const Q_BOTTOM_RIGHT = { xMin: 0.5, yMin: 0.5, xMax: 1.0, yMax: 1.0 };

    const marioSprite = {
      name: "MARIO", nameColor: "#FF0000", width: 12,
      data: ["____RRRRR___", "___RRRRRRR__", "___NNNYNY___", "__NSSYSYYN__", "__NSSYSYYYNN", "__NYYYYYYYYN", "____BBBB____", "__RBBBRBBR__", "_RBBRRRBBRR_", "RBBBBBRBBBB_", "BBBBBBRBBBBB", "BBBB__BBBB__", "NNN____NNN__", "_NN____NN___"],
      colors: { R: "#E60000", N: "#7A3D03", Y: "#FBD000", S: "#FFCC99", B: "#0040FF" },
      quadrant: Q_TOP_LEFT, textOffsetY: -0.08
    };
    const pikachuSprite = {
      name: "PIKACHU", nameColor: "#FFA500", width: 13,
      data: ["____PPPPP____", "___PKKKPKK___", "__PKKPKPKKK__", "_PKKPKKPKPKK_", "_PKKPOKPKPOKK", "PPKPKKKPKPKPP", "PPKPK_KPKPKPP", "_PKPKKKPKPKP_", "__PKKKKKPKP__", "___PPPPPPP___", "____PP_PP____"],
      colors: { P: "#FFDE38", K: "#000000", O: "#FF4444", W: "#FFFFFF" },
      quadrant: Q_TOP_RIGHT, textOffsetY: -0.08
    };
    const linkSprite = {
      name: "LINK", nameColor: "#008000", width: 11,
      data: ["____GGG____", "___GGGGG___", "__LGGGGGL__", "_LGSYYSGLS_", "_GSSSSSGSG_", "__GSSSG GG_", "___GGGGG___", "___GNGNG___", "___GNGNG___", "__NNYNYNN__", "_BN___NB_", "B_______B"],
      colors: { G: "#00A000", L: "#90EE90", S: "#FFDBAC", Y: "#FFFF99", N: "#704830", B: "#503020" },
      quadrant: Q_BOTTOM_LEFT, textOffsetY: 0.13
    };
    const sonicSprite = {
      name: "SONIC", nameColor: "#0000FF", width: 13,
      data: ["___CCCCCCC___", "__CCCWCCCWC__", "_CCWCCCWCWCC_", "_CTWCWCWTWCC_", "CTTTWCWTTTWCW", "CTTT K TTTWCW", "CCTTTTTTWCC_", "_CCTTTTTCC__", "__EWWWEWWWE__", "__E_W_W_W_E__", "___E___E____"],
      colors: { C: "#0070FF", T: "#C0D8F0", W: "#FFFFFF", E: "#D00000", K: "#000000" },
      quadrant: Q_BOTTOM_RIGHT, textOffsetY: 0.13
    };

    const characters = [marioSprite, pikachuSprite, linkSprite, sonicSprite];
    const pixelDrawDelay = 3;
    const textPixelDelay = 2;
    const textCharPixelSize = 0.008;

    const lineThickness = 8;
    const vsTextSize = 0.02;
    const vsColor = "#000000";
    if (!context._sendDrawCmd([0, 0.5], [1, 0.5], marioSprite.colors.R, lineThickness)) { context._drawingActive = false; return; }
    if (!context._sendDrawCmd([0.5, 0], [0.5, 1], pikachuSprite.colors.O, lineThickness)) { context._drawingActive = false; return; }
    if (!context._sendDrawCmd([0.5, 0.5], [0.5, 1.0], sonicSprite.colors.C, lineThickness)) { context._drawingActive = false; return; }
    if (!context._sendDrawCmd([0.0, 0.5], [0.5, 0.5], linkSprite.colors.G, lineThickness)) { context._drawingActive = false; return; }

    await context._delay(100);
    if (context._drawingActive) await ArtEffectsAsync.drawPixelText(context, "VS", 0.5 - (vsTextSize * (context._pixelFont['V'].length + context._pixelFont['S'].length + 0.8)) / 2, 0.5 - (vsTextSize * context._charHeight) / 2, vsTextSize, vsColor, textPixelDelay);
    await context._delay(100);

    for (const char of characters) {
      if (!context._drawingActive) break;
      const charHeightPx = char.data.length;
      const charWidthPx = char.width;
      const quadW = char.quadrant.xMax - char.quadrant.xMin;
      const quadH = char.quadrant.yMax - char.quadrant.yMin;

      const scaleFactor = 0.65;
      const pixelSizeX = (quadW * scaleFactor) / charWidthPx;
      const pixelSizeY = (quadH * scaleFactor) / charHeightPx;
      const finalPixelSize = Math.min(pixelSizeX, pixelSizeY);

      const totalSpriteW = charWidthPx * finalPixelSize;
      const totalSpriteH = charHeightPx * finalPixelSize;
      const startX = char.quadrant.xMin + (quadW - totalSpriteW) / 2;
      const startY = char.quadrant.yMin + (quadH - totalSpriteH) / 2;

      const nameLenEst = char.name.length * (context._pixelFont['M'] ? context._pixelFont['M'].length : 3) * textCharPixelSize;
      const textStartX = char.quadrant.xMin + (quadW - nameLenEst) / 2;
      let textStartY;
      if (char.textOffsetY < 0) {
        textStartY = startY + char.textOffsetY - (context._charHeight * textCharPixelSize);
      } else {
        textStartY = startY + totalSpriteH + char.textOffsetY;
      }
      textStartY = Math.max(char.quadrant.yMin + 0.01, Math.min(char.quadrant.yMax - 0.01 - (context._charHeight * textCharPixelSize), textStartY));

      if (context._drawingActive) await ArtEffectsAsync.drawPixelText(context, char.name, textStartX, textStartY, textCharPixelSize, char.nameColor, textPixelDelay);
      await context._delay(50);

      for (let y = 0; y < charHeightPx; y++) {
        if (!context._drawingActive) break;
        for (let x = 0; x < charWidthPx; x++) {
          if (!context._drawingActive) break;
          const colorChar = char.data[y][x];
          if (colorChar !== "_" && char.colors[colorChar]) {
            const dX = startX + x * finalPixelSize;
            const dY = startY + y * finalPixelSize;
            if (!await ArtEffectsAsync.drawPixel(context, dX, dY, finalPixelSize, char.colors[colorChar], pixelDrawDelay)) { context._drawingActive = false; break; }
          }
        }
      }
      if (!context._drawingActive) break;
      await context._delay(200);
    }
    context._drawingActive = false; 
    context.notify("success", "Enhanced Pixel Art Characters finished.");
  }

  static async directionalHueBlast(context) {
    if (!getGameSocket() || getGameSocket().readyState !== WebSocket.OPEN) { 
      context.notify("error", "Not connected to Drawaria. Please be in a room."); 
      return; 
    }
    context._drawingActive = true; 
    context.notify("info", "Starting Directional Hue Blast...");
    
    const directions = [
      { s: [0.5, 0], e: [0.5, 1] }, 
      { s: [0.5, 1], e: [0.5, 0] }, 
      { s: [0, 0.5], e: [1, 0.5] }, 
      { s: [1, 0.5], e: [0, 0.5] }
    ];
    
    for (let i = 0; i < 100 && context._drawingActive; i++) {
      for (let direction of directions) {
        if (!context._drawingActive) break;
        let t = i / 100;
        let x = direction.s + (direction.e - direction.s) * t;
        let y = direction.s[1] + (direction.e[1] - direction.s[1]) * t;
        if (!context._sendDrawCmd([x, y], [x + 0.001, y + 0.001], `hsl(${i * 3.6},100%,50%)`, 10 + i * 0.5)) break;
      }
      if (!context._drawingActive) break;
      await context._delay(40);
    }
    context._drawingActive = false; 
    context.notify("success", "Directional Hue Blast finished.");
  }

  static async colorFestival(context) {
    if (!getGameSocket() || getGameSocket().readyState !== WebSocket.OPEN) { 
      context.notify("error", "Not connected to Drawaria. Please be in a room."); 
      return; 
    }
    context._drawingActive = true; 
    context.notify("info", "Starting Color Festival...");
    
    const numShapes = 120;
    const frameDelay = 60;
    const shapeDelay = 10;
    
    for (let i = 0; i < numShapes && context._drawingActive; i++) {
      let x = Math.random() * 0.8 + 0.1;
      let y = Math.random() * 0.8 + 0.1;
      let brushSize = Math.random() * 0.08 + 0.03;
      let color = context._getRandomColor(90, 55);
      let thickness = Math.floor(Math.random() * 10) + 4;
      let type = Math.floor(Math.random() * 4);
      let ok = true;
      
      if (type === 0) {
        // Horizontal lines
        for (let j = 0; j < brushSize * 100 && ok && context._drawingActive; j += thickness / 2) {
          let lineY = y - brushSize / 2 + (j / 100);
          if (lineY > y + brushSize / 2) break;
          ok = context._sendDrawCmd([x - brushSize / 2, lineY], [x + brushSize / 2, lineY], color, thickness);
          if (shapeDelay > 0 && ok) await context._delay(shapeDelay);
        }
      } else if (type === 1) {
        // Triangle
        const size = brushSize;
        ok = context._sendDrawCmd([x, y - size / 2], [x + size / 2, y + size / 2], color, thickness);
        if (ok && context._drawingActive && shapeDelay > 0) await context._delay(shapeDelay); 
        if (!ok || !context._drawingActive) break;
        ok = context._sendDrawCmd([x + size / 2, y + size / 2], [x - size / 2, y + size / 2], color, thickness);
        if (ok && context._drawingActive && shapeDelay > 0) await context._delay(shapeDelay); 
        if (!ok || !context._drawingActive) break;
        ok = context._sendDrawCmd([x - size / 2, y + size / 2], [x, y - size / 2], color, thickness);
      } else if (type === 2) {
        // Star rays
        const size = brushSize * 0.7;
        for (let k = 0; k < 8 && ok && context._drawingActive; k++) {
          const angle = (k / 8) * 2 * Math.PI;
          ok = context._sendDrawCmd([x, y], [x + size * Math.cos(angle), y + size * Math.sin(angle)], color, thickness);
          if (shapeDelay > 0 && ok) await context._delay(shapeDelay);
        }
      } else {
        // Spiral
        let lastX = x, lastY = y;
        for (let k = 0; k <= 20 && ok && context._drawingActive; k++) {
          const angle = (k / 20) * 2 * 2 * Math.PI;
          const radius = (k / 20) * brushSize;
          const currentX = x + radius * Math.cos(angle);
          const currentY = y + radius * Math.sin(angle);
          if (k > 0) ok = context._sendDrawCmd([lastX, lastY], [currentX, currentY], color, thickness);
          lastX = currentX; 
          lastY = currentY;
          if (shapeDelay > 0 && ok) await context._delay(shapeDelay);
        }
      }
      if (!ok || !context._drawingActive) break;
      if (frameDelay > 0) await context._delay(frameDelay);
    }
    context._drawingActive = false; 
    context.notify("success", "Color Festival finished.");
  }

  static async lightSpeedFireworks(context) {
    if (!getGameSocket() || getGameSocket().readyState !== WebSocket.OPEN) { 
      context.notify("error", "Not connected to Drawaria. Please be in a room."); 
      return; 
    }
    context._drawingActive = true; 
    context.notify("info", "Starting Light Speed Fireworks...");
    
    const numFireworks = 8;
    const fireworkDelay = 600;
    
    for (let i = 0; i < numFireworks && context._drawingActive; i++) {
      let startX = Math.random() * 0.6 + 0.2;
      let startY = 0.95;
      let peakX = startX + (Math.random() - 0.5) * 0.3;
      let peakY = Math.random() * 0.4 + 0.05;
      let launchColor = context._getRandomColor(100, 70);
      let launchThickness = 6;
      let particleCount = 40 + Math.floor(Math.random() * 40);
      let particleThickness = 4 + Math.floor(Math.random() * 4);
      let launchSteps = 25;
      let launchStepDelay = 4;
      let explosionParticleDelay = 8;
      let ok = true;

      // Launch trajectory
      for (let step = 0; step < launchSteps && ok && context._drawingActive; step++) {
        let progress = step / launchSteps;
        let nextProgress = (step + 1) / launchSteps;
        let currentX = startX + (peakX - startX) * progress;
        let currentY = startY + (peakY - startY) * progress;
        let nextX = startX + (peakX - startX) * nextProgress;
        let nextY = startY + (peakY - startY) * nextProgress;
        ok = context._sendDrawCmd([currentX, currentY], [nextX, nextY], launchColor, launchThickness);
        if (launchStepDelay > 0 && ok) await context._delay(launchStepDelay);
      }
      if (!ok || !context._drawingActive) break;

      // Explosion
      const explosionHue = Math.random() * 360;
      for (let j = 0; j < particleCount && ok && context._drawingActive; j++) {
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * 0.20 + 0.05;
        const endX = peakX + distance * Math.cos(angle);
        const endY = peakY + distance * Math.sin(angle);
        const particleHue = (explosionHue + (Math.random() - 0.5) * 60 + 360) % 360;
        ok = context._sendDrawCmd([peakX, peakY], [endX, endY], `hsl(${particleHue},100%,60%)`, particleThickness);
        if (explosionParticleDelay > 0 && ok) await context._delay(explosionParticleDelay);
      }
      if (!ok || !context._drawingActive) break;
      if (fireworkDelay > 0) await context._delay(fireworkDelay);
    }
    context._drawingActive = false; 
    context.notify("success", "Light Speed Fireworks finished.");
  }

  static async fractalBloomMandala(context) {
    if (!getGameSocket() || getGameSocket().readyState !== WebSocket.OPEN) { 
      context.notify("error", "Not connected to Drawaria. Please be in a room."); 
      return; 
    }
    context._drawingActive = true; 
    context.notify("info", "Starting Fractal Bloom Mandala...");
    
    const centerX = 0.5;
    const centerY = 0.5;
    const maxDepth = 4;
    const initialBranches = 6 + Math.floor(Math.random() * 3);
    const initialLength = 0.15;
    const lengthRatio = 0.65;
    const angleStep = Math.PI / (3 + Math.random() * 2);
    const delay = 20;
    const baseHue = Math.random() * 360;
    let globalRotation = context._globalFrameCount * 0.01;

    async function drawBranch(cx, cy, angle, length, depth, colorHue, branchThickness) {
      if (!context._drawingActive || depth > maxDepth || length < 0.005) return;
      
      const x2 = cx + length * Math.cos(angle);
      const y2 = cy + length * Math.sin(angle);
      const thickness = Math.max(1, branchThickness * Math.pow(lengthRatio, depth - 1) * 2);
      const color = `hsl(${(colorHue + depth * 20) % 360},${80 - depth * 10}%,${60 - depth * 8}%)`;
      
      if (!context._sendDrawCmd([cx, cy], [x2, y2], color, thickness)) { 
        context._drawingActive = false; 
        return; 
      }
      if (delay > 0) await context._delay(delay);
      if (!context._drawingActive) return;
      
      await drawBranch(x2, y2, angle - angleStep, length * lengthRatio, depth + 1, colorHue, branchThickness);
      if (!context._drawingActive) return;
      await drawBranch(x2, y2, angle + angleStep, length * lengthRatio, depth + 1, colorHue, branchThickness);
      if (depth < maxDepth - 1 && Math.random() < 0.4) {
        if (!context._drawingActive) return;
        await drawBranch(x2, y2, angle, length * lengthRatio * 0.8, depth + 1, colorHue, branchThickness);
      }
    }

    for (let i = 0; i < initialBranches && context._drawingActive; i++) {
      const angle = (i / initialBranches) * 2 * Math.PI + globalRotation;
      await drawBranch(centerX, centerY, angle, initialLength, 1, (baseHue + i * (360 / initialBranches)) % 360, 10);
      if (delay > 0 && context._drawingActive) await context._delay(delay * 3);
    }
    context._globalFrameCount++; 
    context._drawingActive = false; 
    context.notify("success", "Fractal Bloom Mandala finished.");
  }

  static async pulsatingStainedGlass(context) {
    if (!getGameSocket() || getGameSocket().readyState !== WebSocket.OPEN) { 
      context.notify("error", "Not connected to Drawaria. Please be in a room."); 
      return; 
    }
    context._drawingActive = true; 
    context.notify("info", "Starting Pulsating Stained Glass...");
    
    const gridX = 5 + Math.floor(Math.random() * 4);
    const gridY = 4 + Math.floor(Math.random() * 3);
    const cellWidth = 1 / gridX;
    const cellHeight = 1 / gridY;
    const animationSteps = 150;
    const glassDelay = 50;
    const lineThickness = 3;
    const lineColor = "rgb(40,40,40)";
    let cells = [];

    // Generate glass cells
    for (let row = 0; row < gridY; row++) {
      for (let col = 0; col < gridX; col++) {
        const cellType = Math.random();
        let points = [];
        const x = col * cellWidth;
        const y = row * cellHeight;
        const w = cellWidth;
        const h = cellHeight;
        
        if (cellType < 0.33) {
          // Rectangle
          points = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
        } else if (cellType < 0.66) {
          // Diagonal split
          if (Math.random() < 0.5) {
            points = [[x, y], [x + w, y], [x + w, y + h], [x, y], [x, y + h], [x + w, y + h]];
          } else {
            points = [[x, y], [x + w, y], [x, y + h], [x + w, y], [x + w, y + h], [x, y + h]];
          }
        } else {
          // Star pattern
          const cx = x + w / 2;
          const cy = y + h / 2;
          points = [[x, y], [x + w, y], [cx, cy], [x + w, y], [x + w, y + h], [cx, cy], [x + w, y + h], [x, y + h], [cx, cy], [x, y + h], [x, y], [cx, cy]];
        }
        cells.push({ 
          basePoints: points, 
          hue: Math.random() * 360, 
          lightPhase: Math.random() * Math.PI * 2, 
          lightSpeed: 0.05 + Math.random() * 0.1 
        });
      }
    }

    // Draw cell outlines
    for (const cell of cells) {
      if (!context._drawingActive) break;
      for (let i = 0; i < cell.basePoints.length; i += 3) {
        if (!context._drawingActive || i + 2 >= cell.basePoints.length) break;
        const p1 = cell.basePoints[i];
        const p2 = cell.basePoints[i + 1];
        const p3 = cell.basePoints[i + 2];
        if (!context._sendDrawCmd(p1, p2, lineColor, lineThickness)) { context._drawingActive = false; break; }
        if (!context._sendDrawCmd(p2, p3, lineColor, lineThickness)) { context._drawingActive = false; break; }
        if (!context._sendDrawCmd(p3, p1, lineColor, lineThickness)) { context._drawingActive = false; break; }
        await context._delay(5);
      }
    }

    // Animate glass colors
    for (let frame = 0; frame < animationSteps && context._drawingActive; frame++) {
      for (const cell of cells) {
        if (!context._drawingActive) break;
        const currentLightness = 40 + 20 * Math.sin(cell.lightPhase + frame * cell.lightSpeed);
        const color = `hsl(${cell.hue},80%,${currentLightness}%)`;
        for (let i = 0; i < cell.basePoints.length; i += 3) {
          if (!context._drawingActive || i + 2 >= cell.basePoints.length) break;
          const p1 = cell.basePoints[i];
          const p2 = cell.basePoints[i + 1];
          const p3 = cell.basePoints[i + 2];
          const mid12 = [(p1 + p2) / 2, (p1[1] + p2[1]) / 2];
          const mid23 = [(p2 + p3) / 2, (p2[1] + p3[1]) / 2];
          if (!context._sendDrawCmd(mid12, p3, color, lineThickness * 3 + 2)) { context._drawingActive = false; break; }
          if (!context._sendDrawCmd(mid23, p1, color, lineThickness * 3 + 2)) { context._drawingActive = false; break; }
        }
      }
      if (!context._drawingActive) break;
      await context._delay(glassDelay);
    }
    context._drawingActive = false; 
    context.notify("success", "Pulsating Stained Glass finished.");
  }

  static async celestialBallet(context) {
    if (!getGameSocket() || getGameSocket().readyState !== WebSocket.OPEN) { 
      context.notify("error", "Not connected to Drawaria. Please be in a room."); 
      return; 
    }
    context._drawingActive = true; 
    context.notify("info", "Starting Celestial Ballet...");
    
    const numDancers = 8 + Math.floor(Math.random() * 5);
    const steps = 150;
    const thickness = 3;
    const balletDelay = 25;
    const dancers = [];

    for (let i = 0; i < numDancers; i++) {
      dancers.push({ 
        x: 0.5, 
        y: 0.5, 
        vx: (Math.random() - 0.5) * 0.02, 
        vy: (Math.random() - 0.5) * 0.02, 
        orbitCenterX: 0.5 + (Math.random() - 0.5) * 0.4, 
        orbitCenterY: 0.5 + (Math.random() - 0.5) * 0.4, 
        orbitSpeed: (Math.random() * 0.05 + 0.02) * (Math.random() < 0.5 ? 1 : -1), 
        hue: Math.random() * 360, 
        lastX: 0.5, 
        lastY: 0.5 
      });
    }

    for (let step = 0; step < steps && context._drawingActive; step++) {
      for (const dancer of dancers) {
        if (!context._drawingActive) break;
        dancer.lastX = dancer.x; 
        dancer.lastY = dancer.y;
        const angleToOrbit = Math.atan2(dancer.y - dancer.orbitCenterY, dancer.x - dancer.orbitCenterX);
        dancer.vx += Math.cos(angleToOrbit + Math.PI / 2) * dancer.orbitSpeed * 0.1; 
        dancer.vy += Math.sin(angleToOrbit + Math.PI / 2) * dancer.orbitSpeed * 0.1;
        dancer.vx += (0.5 - dancer.x) * 0.0005; 
        dancer.vy += (0.5 - dancer.y) * 0.0005;
        dancer.vx *= 0.97; 
        dancer.vy *= 0.97;
        dancer.x += dancer.vx; 
        dancer.y += dancer.vy;
        if (dancer.x < 0.01 || dancer.x > 0.99) dancer.vx *= -0.8;
        if (dancer.y < 0.01 || dancer.y > 0.99) dancer.vy *= -0.8;
        dancer.x = Math.max(0.01, Math.min(0.99, dancer.x)); 
        dancer.y = Math.max(0.01, Math.min(0.99, dancer.y));
        dancer.hue = (dancer.hue + 0.5) % 360;
        const color = `hsl(${dancer.hue},100%,70%)`;
        if (!context._sendDrawCmd([dancer.lastX, dancer.lastY], [dancer.x, dancer.y], color, thickness)) { context._drawingActive = false; break; }
      }
      if (balletDelay > 0 && context._drawingActive) await context._delay(balletDelay);
    }
    context._drawingActive = false; 
    context.notify("success", "Celestial Ballet finished.");
  }

  static async recursiveStarPolygonNova(context) {
    if (!getGameSocket() || getGameSocket().readyState !== WebSocket.OPEN) { 
      context.notify("error", "Not connected to Drawaria. Please be in a room."); 
      return; 
    }
    context._drawingActive = true; 
    context.notify("info", "Starting Recursive Star Polygon Nova...");
    
    const centerX = 0.5;
    const centerY = 0.5;
    const initialRadius = 0.25;
    const maxDepth = 3 + Math.floor(Math.random() * 1);
    const numPoints = 5 + Math.floor(Math.random() * 2) * 2;
    const skipFactor = 2 + Math.floor(Math.random() * 1);
    const recursiveScaleFactor = 0.4;
    const starDelay = 15;
    const baseHue = Math.random() * 360;
    let globalRotation = context._globalFrameCount * 0.01;

    async function drawStar(cx, cy, radius, points, skip, depth, colorHue, currentThickness, parentAngle) {
      if (!context._drawingActive || depth > maxDepth || radius < 0.005) return;
      
      const starCorners = [];
      for (let i = 0; i < points; i++) { 
        const angle = (i / points) * 2 * Math.PI + parentAngle + globalRotation; 
        starCorners.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }); 
      }
      
      const color = `hsl(${(colorHue + depth * 30) % 360},95%,${65 - depth * 10}%)`;
      const thickness = Math.max(1, currentThickness);
      
      for (let i = 0; i < points && context._drawingActive; i++) {
        const p1 = starCorners[i];
        const p2 = starCorners[(i + skip) % points];
        if (!context._sendDrawCmd([p1.x, p1.y], [p2.x, p2.y], color, thickness)) { context._drawingActive = false; return; }
        if (starDelay > 0 && context._drawingActive) await context._delay(starDelay);
      }
      
      for (let i = 0; i < points && context._drawingActive; i++) {
        const newAngle = (i / points) * 2 * Math.PI + parentAngle + Math.PI / points;
        await drawStar(starCorners[i].x, starCorners[i].y, radius * recursiveScaleFactor, points, skip, depth + 1, colorHue, thickness * 0.7, newAngle);
      }
    }

    await drawStar(centerX, centerY, initialRadius, numPoints, skipFactor, 1, baseHue, 6, 0);
    context._globalFrameCount++; 
    context._drawingActive = false; 
    context.notify("success", "Recursive Star Polygon Nova finished.");
  }
}
