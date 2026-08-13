(function () {
  'use strict';

  const canvas = document.getElementById('tetrisCanvas');
  const nextCanvas = document.getElementById('tetrisNext');
  const holdCanvas = document.getElementById('tetrisHold');
  const gameWindow = document.getElementById('tetris-window');
  if (!canvas || !nextCanvas || !holdCanvas || !gameWindow) return;

  const context = canvas.getContext('2d');
  const nextContext = nextCanvas.getContext('2d');
  const holdContext = holdCanvas.getContext('2d');
  const overlay = document.getElementById('tetrisOverlay');
  const overlayTitle = overlay.querySelector('strong');
  const overlayText = overlay.querySelector('span');
  const startButton = document.getElementById('tetrisStart');
  const pauseButton = document.getElementById('tetrisPause');
  const restartButton = document.getElementById('tetrisRestart');
  const soundButton = document.getElementById('tetrisSound');
  const status = document.getElementById('tetrisStatus');
  const scoreDisplay = document.getElementById('tetrisScore');
  const linesDisplay = document.getElementById('tetrisLines');
  const levelDisplay = document.getElementById('tetrisLevel');
  const comboDisplay = document.getElementById('tetrisCombo');
  const bestDisplay = document.getElementById('tetrisBest');

  const COLS = 10;
  const ROWS = 20;
  const CELL = canvas.width / COLS;
  const LOCK_DELAY = 480;
  const MAX_LOCK_RESETS = 15;
  const COLORS = {
    I: '#35C5F0', J: '#4F78FF', L: '#FF9D35', O: '#FFD43B',
    S: '#55D66B', T: '#AA6BFF', Z: '#FF5A67'
  };
  const SHAPES = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    O: [[1, 1], [1, 1]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]]
  };

  let board = createBoard();
  let bag = [];
  let queue = [];
  let current = null;
  let heldType = null;
  let canHold = true;
  let score = 0;
  let lines = 0;
  let level = 1;
  let combo = -1;
  let backToBack = false;
  let highScore = loadHighScore();
  let running = false;
  let paused = false;
  let muted = false;
  let lastTime = 0;
  let dropCounter = 0;
  let groundedAt = 0;
  let lockResets = 0;
  let animationId = 0;
  let audioContext = null;

  function loadHighScore() {
    try {
      return Math.max(0, Number(localStorage.getItem('akio-tetris-best')) || 0);
    } catch (_) {
      return 0;
    }
  }

  function saveHighScore() {
    if (score <= highScore) return;
    highScore = score;
    try {
      localStorage.setItem('akio-tetris-best', String(highScore));
    } catch (_) {}
  }

  function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function cloneMatrix(matrix) {
    return matrix.map(row => row.slice());
  }

  function refillBag() {
    bag = Object.keys(SHAPES);
    for (let index = bag.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [bag[index], bag[swap]] = [bag[swap], bag[index]];
    }
  }

  function nextType() {
    if (!bag.length) refillBag();
    return bag.pop();
  }

  function fillQueue() {
    while (queue.length < 4) queue.push(nextType());
  }

  function makePiece(type) {
    const matrix = cloneMatrix(SHAPES[type]);
    return {
      type,
      matrix,
      x: Math.floor((COLS - matrix[0].length) / 2),
      y: matrix.length === 4 ? -1 : 0
    };
  }

  function spawnPiece(type) {
    fillQueue();
    current = makePiece(type || queue.shift());
    groundedAt = 0;
    lockResets = 0;
    fillQueue();
    canHold = true;
    drawPreviews();
    if (collides(current, 0, 0, current.matrix)) endGame();
  }

  function collides(piece, offsetX, offsetY, matrix) {
    for (let row = 0; row < matrix.length; row += 1) {
      for (let column = 0; column < matrix[row].length; column += 1) {
        if (!matrix[row][column]) continue;
        const x = piece.x + column + offsetX;
        const y = piece.y + row + offsetY;
        if (x < 0 || x >= COLS || y >= ROWS) return true;
        if (y >= 0 && board[y][x]) return true;
      }
    }
    return false;
  }

  function mergePiece() {
    let aboveTop = false;
    current.matrix.forEach((row, rowIndex) => row.forEach((filled, columnIndex) => {
      if (!filled) return;
      const y = current.y + rowIndex;
      const x = current.x + columnIndex;
      if (y < 0) aboveTop = true;
      else board[y][x] = current.type;
    }));
    playSound('lock');
    groundedAt = 0;
    lockResets = 0;
    if (aboveTop) {
      endGame();
      return;
    }
    clearLines();
    spawnPiece();
  }

  function clearLines() {
    let cleared = 0;
    for (let row = ROWS - 1; row >= 0; row -= 1) {
      if (board[row].every(Boolean)) {
        board.splice(row, 1);
        board.unshift(Array(COLS).fill(null));
        cleared += 1;
        row += 1;
      }
    }
    if (!cleared) {
      combo = -1;
      updateStats();
      return;
    }
    combo += 1;
    const basePoints = [0, 100, 300, 500, 800][cleared] * level;
    const backToBackBonus = cleared === 4 && backToBack ? Math.floor(basePoints * .5) : 0;
    const comboBonus = combo > 0 ? combo * 50 * level : 0;
    const points = basePoints + backToBackBonus + comboBonus;
    score += points;
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    backToBack = cleared === 4;
    updateStats();
    playSound(cleared === 4 ? 'tetris' : 'line');
    const comboText = combo > 0 ? ` · ${combo + 1}× combo` : '';
    const backToBackText = backToBackBonus ? ' · Back-to-back!' : '';
    status.textContent = cleared === 4
      ? `Tetris! +${points}${comboText}${backToBackText}`
      : `${cleared} line${cleared > 1 ? 's' : ''} cleared · +${points}${comboText}`;
    status.classList.add('is-highlighted');
    gameWindow.classList.remove('line-clear');
    void gameWindow.offsetWidth;
    gameWindow.classList.add('line-clear');
    window.setTimeout(() => {
      status.classList.remove('is-highlighted');
      gameWindow.classList.remove('line-clear');
    }, 550);
  }

  function rotateMatrix(matrix, direction) {
    const rotated = matrix.map((row, rowIndex) => row.map((_, columnIndex) => matrix[matrix.length - 1 - columnIndex][rowIndex]));
    if (direction < 0) return rotateMatrix(rotateMatrix(rotated, 1), 1);
    return rotated;
  }

  function isGrounded() {
    return Boolean(current) && collides(current, 0, 1, current.matrix);
  }

  function refreshLockDelay() {
    if (!isGrounded()) {
      groundedAt = 0;
      lockResets = 0;
      return;
    }
    if (!groundedAt) {
      groundedAt = performance.now();
      return;
    }
    if (lockResets < MAX_LOCK_RESETS) {
      groundedAt = performance.now();
      lockResets += 1;
    }
  }

  function rotate(direction) {
    if (!canControl() || current.type === 'O') return;
    const rotated = rotateMatrix(current.matrix, direction);
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!collides(current, kick, 0, rotated)) {
        current.x += kick;
        current.matrix = rotated;
        refreshLockDelay();
        playSound('rotate');
        draw();
        return;
      }
    }
  }

  function move(horizontal) {
    if (!canControl() || collides(current, horizontal, 0, current.matrix)) return;
    current.x += horizontal;
    refreshLockDelay();
    playSound('move');
    draw();
  }

  function softDrop(manual) {
    if (!canControl()) return;
    if (!collides(current, 0, 1, current.matrix)) {
      current.y += 1;
      groundedAt = 0;
      if (manual) {
        score += 1;
        updateStats();
      }
    } else if (!groundedAt) groundedAt = performance.now();
    dropCounter = 0;
    draw();
  }

  function hardDrop() {
    if (!canControl()) return;
    let distance = 0;
    while (!collides(current, 0, distance + 1, current.matrix)) distance += 1;
    current.y += distance;
    score += distance * 2;
    updateStats();
    playSound('drop');
    mergePiece();
    dropCounter = 0;
    draw();
  }

  function holdPiece() {
    if (!canControl() || !canHold) return;
    const outgoing = current.type;
    if (heldType) {
      const incoming = heldType;
      heldType = outgoing;
      current = makePiece(incoming);
      if (collides(current, 0, 0, current.matrix)) endGame();
    } else {
      heldType = outgoing;
      fillQueue();
      current = makePiece(queue.shift());
      fillQueue();
    }
    groundedAt = 0;
    lockResets = 0;
    canHold = false;
    playSound('hold');
    drawPreviews();
    draw();
  }

  function ghostY() {
    let offset = 0;
    while (!collides(current, 0, offset + 1, current.matrix)) offset += 1;
    return current.y + offset;
  }

  function drawCell(target, x, y, size, color, alpha) {
    target.save();
    target.globalAlpha = alpha == null ? 1 : alpha;
    target.fillStyle = color;
    target.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    target.fillStyle = 'rgba(255,255,255,.25)';
    target.fillRect(x * size + 2, y * size + 2, size - 4, 3);
    target.strokeStyle = 'rgba(0,0,0,.24)';
    target.strokeRect(x * size + 1.5, y * size + 1.5, size - 3, size - 3);
    target.restore();
  }

  function drawGrid() {
    context.fillStyle = '#080d18';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgba(255,255,255,.038)';
    context.lineWidth = 1;
    for (let column = 1; column < COLS; column += 1) {
      context.beginPath(); context.moveTo(column * CELL, 0); context.lineTo(column * CELL, canvas.height); context.stroke();
    }
    for (let row = 1; row < ROWS; row += 1) {
      context.beginPath(); context.moveTo(0, row * CELL); context.lineTo(canvas.width, row * CELL); context.stroke();
    }
  }

  function drawMatrix(matrix, offsetX, offsetY, type, alpha) {
    matrix.forEach((row, rowIndex) => row.forEach((filled, columnIndex) => {
      if (filled && offsetY + rowIndex >= 0) drawCell(context, offsetX + columnIndex, offsetY + rowIndex, CELL, COLORS[type], alpha);
    }));
  }

  function draw() {
    drawGrid();
    board.forEach((row, rowIndex) => row.forEach((type, columnIndex) => {
      if (type) drawCell(context, columnIndex, rowIndex, CELL, COLORS[type]);
    }));
    if (!current) return;
    drawMatrix(current.matrix, current.x, ghostY(), current.type, .18);
    drawMatrix(current.matrix, current.x, current.y, current.type, 1);
  }

  function drawPreview(target, type) {
    const width = target.canvas.width;
    const height = target.canvas.height;
    target.clearRect(0, 0, width, height);
    target.fillStyle = 'rgba(4,7,14,.45)';
    target.fillRect(0, 0, width, height);
    if (!type) return;
    const matrix = SHAPES[type];
    const size = Math.min(22, Math.floor(Math.min(width / (matrix[0].length + 1), height / (matrix.length + 1))));
    const startX = (width - matrix[0].length * size) / 2;
    const startY = (height - matrix.length * size) / 2;
    matrix.forEach((row, rowIndex) => row.forEach((filled, columnIndex) => {
      if (!filled) return;
      target.fillStyle = COLORS[type];
      target.fillRect(startX + columnIndex * size + 1, startY + rowIndex * size + 1, size - 2, size - 2);
      target.fillStyle = 'rgba(255,255,255,.24)';
      target.fillRect(startX + columnIndex * size + 2, startY + rowIndex * size + 2, size - 4, 3);
    }));
  }

  function drawPreviews() {
    drawPreview(nextContext, queue[0]);
    drawPreview(holdContext, heldType);
  }

  function updateStats() {
    saveHighScore();
    scoreDisplay.textContent = score.toLocaleString();
    linesDisplay.textContent = String(lines);
    levelDisplay.textContent = String(level);
    comboDisplay.textContent = String(Math.max(0, combo + 1));
    bestDisplay.textContent = highScore.toLocaleString();
  }

  function dropInterval() {
    return Math.max(85, 820 * Math.pow(.83, level - 1));
  }

  function isWindowActive() {
    return gameWindow.classList.contains('open') && gameWindow.dataset.minimized !== 'true';
  }

  function canControl() {
    return running && !paused && current && isWindowActive();
  }

  function loop(time) {
    const delta = Math.min(100, time - lastTime || 0);
    lastTime = time;
    if (canControl()) {
      dropCounter += delta;
      if (dropCounter >= dropInterval()) softDrop(false);
      if (current && isGrounded()) {
        if (!groundedAt) groundedAt = time;
        if (time - groundedAt >= LOCK_DELAY) {
          mergePiece();
          dropCounter = 0;
        }
      } else {
        groundedAt = 0;
      }
    }
    animationId = window.requestAnimationFrame(loop);
  }

  function showOverlay(title, message, buttonLabel) {
    overlayTitle.textContent = title;
    overlayText.textContent = message;
    startButton.textContent = buttonLabel;
    overlay.hidden = false;
  }

  function startGame() {
    ensureAudio();
    board = createBoard();
    bag = [];
    queue = [];
    heldType = null;
    canHold = true;
    score = 0;
    lines = 0;
    level = 1;
    combo = -1;
    backToBack = false;
    running = true;
    paused = false;
    dropCounter = 0;
    groundedAt = 0;
    lockResets = 0;
    pauseButton.textContent = 'Pause';
    pauseButton.disabled = false;
    overlay.hidden = true;
    fillQueue();
    spawnPiece();
    updateStats();
    status.textContent = 'Game started. Good luck!';
    playSound('start');
    draw();
    canvas.focus({ preventScroll: true });
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    pauseButton.textContent = paused ? 'Resume' : 'Pause';
    if (paused) {
      showOverlay('Paused', 'Your game is waiting.', 'Resume');
      status.textContent = 'Game paused.';
      playSound('pause');
    } else {
      overlay.hidden = true;
      dropCounter = 0;
      status.textContent = 'Game resumed.';
      playSound('start');
    }
  }

  function endGame() {
    running = false;
    paused = false;
    saveHighScore();
    updateStats();
    pauseButton.disabled = true;
    showOverlay('Game Over', `Final score: ${score.toLocaleString()} · Lines: ${lines}`, 'Play Again');
    status.textContent = `Game over. Final score ${score.toLocaleString()}.`;
    playSound('gameover');
    draw();
  }

  function ensureAudio() {
    if (audioContext) {
      if (audioContext.state === 'suspended') audioContext.resume();
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioContext = new AudioContextClass();
  }

  function tone(frequency, duration, offset, volume, wave) {
    if (muted) return;
    ensureAudio();
    if (!audioContext) return;
    const start = audioContext.currentTime + (offset || 0);
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = wave || 'square';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(volume || .035, start);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  function playSound(kind) {
    if (muted) return;
    const sounds = {
      move: () => tone(185, .035, 0, .018),
      rotate: () => tone(310, .055, 0, .025),
      lock: () => tone(120, .06, 0, .025, 'triangle'),
      drop: () => { tone(190, .06, 0, .035); tone(95, .09, .045, .03); },
      hold: () => { tone(240, .05, 0, .025); tone(330, .06, .045, .025); },
      line: () => { tone(440, .08, 0, .035); tone(660, .1, .07, .035); },
      tetris: () => { [392, 523, 659, 784].forEach((note, index) => tone(note, .12, index * .065, .04)); },
      start: () => { tone(262, .08, 0, .03); tone(392, .1, .08, .03); },
      pause: () => tone(210, .12, 0, .025, 'sine'),
      gameover: () => { [330, 247, 196, 147].forEach((note, index) => tone(note, .18, index * .13, .035, 'sawtooth')); }
    };
    sounds[kind]?.();
  }

  function performAction(action) {
    ensureAudio();
    if (action === 'left') move(-1);
    else if (action === 'right') move(1);
    else if (action === 'rotate') rotate(1);
    else if (action === 'rotate-left') rotate(-1);
    else if (action === 'down') softDrop(true);
    else if (action === 'drop') hardDrop();
    else if (action === 'hold') holdPiece();
    else if (action === 'pause') togglePause();
  }

  startButton.addEventListener('click', () => {
    if (running && paused) togglePause();
    else startGame();
  });
  pauseButton.addEventListener('click', togglePause);
  restartButton.addEventListener('click', startGame);
  soundButton.addEventListener('click', () => {
    muted = !muted;
    soundButton.setAttribute('aria-pressed', String(!muted));
    soundButton.textContent = muted ? 'Sound off' : 'Sound on';
    if (!muted) playSound('start');
  });

  let repeatDelay = 0;
  let repeatInterval = 0;

  function clearControlRepeat() {
    window.clearTimeout(repeatDelay);
    window.clearInterval(repeatInterval);
    repeatDelay = 0;
    repeatInterval = 0;
  }

  document.querySelectorAll('[data-tetris-action]').forEach(button => {
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      const action = button.dataset.tetrisAction;
      performAction(action);
      if (!['left', 'right', 'down'].includes(action)) return;
      clearControlRepeat();
      repeatDelay = window.setTimeout(() => {
        repeatInterval = window.setInterval(() => performAction(action), action === 'down' ? 55 : 85);
      }, 220);
    });
    button.addEventListener('pointerup', clearControlRepeat);
    button.addEventListener('pointercancel', clearControlRepeat);
    button.addEventListener('pointerleave', clearControlRepeat);
  });

  gameWindow.addEventListener('akio:window-close', () => {
    clearControlRepeat();
    if (running && !paused) togglePause();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && running && !paused && gameWindow.classList.contains('open')) togglePause();
  });

  document.addEventListener('keydown', event => {
    if (!gameWindow.classList.contains('open') || !gameWindow.classList.contains('frontmost')) return;
    const controls = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'rotate', ArrowDown: 'down',
      z: 'rotate-left', Z: 'rotate-left', x: 'rotate', X: 'rotate',
      c: 'hold', C: 'hold', p: 'pause', P: 'pause', Escape: 'pause',
      ' ': 'drop', Space: 'drop', Spacebar: 'drop'
    };
    if (event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      startGame();
      return;
    }
    const action = event.code === 'Space' ? 'drop' : controls[event.key];
    if (!action) return;
    event.preventDefault();
    performAction(action);
  });

  draw();
  drawPreviews();
  updateStats();
  pauseButton.disabled = true;
  if (!animationId) animationId = window.requestAnimationFrame(loop);
})();
