/*
 * ZaLand Habit Tracker
 *
 * This script drives the interactivity of the ZaLand app.  It
 * handles the welcome splash screen, name entry, poem and habit
 * generation, rope dragging to reveal a game, and the simple
 * catch‑the‑habits game itself.
 */

// Wait for the DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  const welcomeOverlay = document.getElementById('welcome');
  const main = document.getElementById('main');
  const nameInput = document.getElementById('nameInput');
  const startButton = document.getElementById('startButton');
  const resultSection = document.getElementById('result');
  const poemContainer = document.getElementById('poem');
  const tasksList = document.getElementById('tasks');
  const projectorHandle = document.getElementById('projectorHandle');
  const projectorScreen = document.getElementById('projectorScreen');
  const gameCanvas = document.getElementById('gameCanvas');
  const scoreDisplay = document.getElementById('score');
  const closeGameBtn = document.getElementById('closeGame');

  let game = null; // will hold our Game instance

  /*
   * Hide the welcome overlay after 3 seconds.  Fade it out gently
   * and reveal the main interface.
   */
  setTimeout(() => {
    welcomeOverlay.style.opacity = '0';
    setTimeout(() => {
      welcomeOverlay.classList.add('hidden');
      main.classList.remove('hidden');
    }, 500);
  }, 3000);

  /*
   * Respond to the user clicking the "Get My Habits" button.  It
   * collects the entered name, generates a poem and a list of daily
   * habits, and displays them to the user.
   */
  startButton.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) {
      alert('Please enter your name to continue.');
      return;
    }
    // Generate poem and tasks, then render
    const poem = generatePoem(name);
    const tasks = generateTasks();
    // Convert newline characters into <br> elements for HTML display
    const htmlPoem = poem.replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
    poemContainer.innerHTML = htmlPoem;
    // Clear existing tasks
    tasksList.innerHTML = '';
    tasks.forEach(task => {
      const li = document.createElement('li');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      li.appendChild(checkbox);
      const span = document.createElement('span');
      span.textContent = task;
      li.appendChild(span);
      // Mark tasks as completed when checkbox is checked
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          li.classList.add('completed');
        } else {
          li.classList.remove('completed');
        }
      });
      tasksList.appendChild(li);
    });
    resultSection.classList.remove('hidden');
  });

  /**
   * Generate a short four‑line poem based on the user's name.  The
   * poem uses gentle, positive language and always ends with the
   * person's name to personalise it.  A small collection of
   * templates keeps things varied and fresh.
   *
   * @param {string} name The user's entered name
   * @returns {string} A poem incorporating the name
   */
  function generatePoem(name) {
    const capitalName = name.charAt(0).toUpperCase() + name.slice(1);
    const templates = [
      `A gentle breeze blows through the trees,\nBringing with it whispers on the breeze.\nWithin that song a melody proclaims,\nThe world is brighter when you’re here, ${capitalName}.`,
      `Your name paints colours in the sky,\nSoft hues that lift our spirits high.\nKindness in your heart you proudly claim,\nWe celebrate you and your name, ${capitalName}.`,
      `Like sunshine breaking through the morning haze,\nYour presence warms and lights our days.\nThe world sings softly, always the same,\nThere’s joy within the sound of ${capitalName}.`,
      `An echo carried on a quiet stream,\nA tender promise and a tranquil dream.\nPeace is written in each letter’s frame,\nSuch comfort lies inside your name, ${capitalName}.`
    ];
    // pick a random template
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate a list of four daily habits.  At least one habit is
   * intentionally light‑hearted to inject some humour into the day.
   * Content remains wholesome and safe for all audiences.
   *
   * @returns {string[]} An array of task descriptions
   */
  function generateTasks() {
    const habitPool = [
      'Drink a glass of water first thing in the morning',
      'Spend 10 minutes meditating or breathing deeply',
      'Take a short walk outside to enjoy fresh air',
      'Write down three things you’re grateful for today',
      'Read a chapter from a book you enjoy',
      'Tidy up your workspace for five minutes',
      'Reach out to a friend or family member',
      'Stretch or do some light exercise for 15 minutes'
    ];
    const funnyPool = [
      'Do a silly dance to your favourite song',
      'Speak like a pirate for two minutes',
      'Attempt to juggle with soft items (be careful!)',
      'Try to balance a book on your head while walking',
      'Make the silliest face you can in the mirror'
    ];
    // pick three unique habits from the habit pool
    const selectedHabits = [];
    while (selectedHabits.length < 3) {
      const index = Math.floor(Math.random() * habitPool.length);
      const habit = habitPool[index];
      if (!selectedHabits.includes(habit)) {
        selectedHabits.push(habit);
      }
    }
    // pick one random funny habit
    const funnyHabit = funnyPool[Math.floor(Math.random() * funnyPool.length)];
    // combine and shuffle
    const allTasks = [...selectedHabits, funnyHabit];
    return shuffleArray(allTasks);
  }

  /**
   * Shuffle an array in place using the Fisher–Yates algorithm.
   *
   * @param {any[]} array The array to shuffle
   * @returns {any[]} The shuffled array
   */
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /*
   * Rope dragging behaviour.  When the user drags the rope handle
   * upward beyond a threshold, the projector screen reveals itself and
   * the game starts.  This also prevents accidental triggers by
   * requiring a minimum drag distance.
   */
  let isDragging = false;
  let startY = 0;
  const dragThreshold = 80; // pixels to drag upwards to open the screen

  // Start dragging
  projectorHandle.addEventListener('mousedown', (e) => {
    isDragging = true;
    startY = e.clientY;
  });
  projectorHandle.addEventListener('touchstart', (e) => {
    isDragging = true;
    startY = e.touches[0].clientY;
  });

  // Track movement
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dy = startY - e.clientY;
    if (dy > dragThreshold) {
      openProjector();
      isDragging = false;
    }
  });
  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const dy = startY - e.touches[0].clientY;
    if (dy > dragThreshold) {
      openProjector();
      isDragging = false;
    }
  });
  // End dragging
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
  document.addEventListener('touchend', () => {
    isDragging = false;
  });

  // Allow users to simply click the rope handle to open the game.  This
  // serves as a fallback in case drag gestures aren’t recognised.
  projectorHandle.addEventListener('click', () => {
    openProjector();
  });


  /**
   * Open the projector screen.  This slides up the game area, hides
   * the rope handle and starts the game logic.
   */
  function openProjector() {
    // Reveal the projector screen by removing its hidden state and expanding it
    projectorScreen.classList.remove('hidden');
    projectorScreen.classList.add('active');
    // Hide the rope handle so it doesn’t interfere while the game is open
    projectorHandle.classList.add('hidden');
    // Delay the start of the game slightly to allow CSS animation to finish
    setTimeout(() => {
      startGame();
    }, 300);
  }

  /**
   * Close the projector screen and stop the game.  Re‑show the rope
   * handle so the user can play again later.
   */
  function closeProjector() {
    // Collapse the projector screen
    projectorScreen.classList.remove('active');
    // Wait for the collapse animation to finish before hiding completely
    setTimeout(() => {
      projectorScreen.classList.add('hidden');
    }, 400);
    // Show the rope handle again
    projectorHandle.classList.remove('hidden');
    // Stop the game if running
    if (game) {
      game.destroy();
      game = null;
    }
  }

  // Close game event
  closeGameBtn.addEventListener('click', () => {
    closeProjector();
  });

  /**
   * Initialize and start the catch‑the‑habits game.  Sets up the
   * canvas size, attaches event listeners and starts the animation loop.
   */
  function startGame() {
    // Adjust canvas dimensions to match its displayed size
    gameCanvas.width = gameCanvas.clientWidth;
    gameCanvas.height = gameCanvas.clientHeight;
    scoreDisplay.textContent = 'Score: 0';
    game = new CatchGame(gameCanvas, scoreDisplay);
  }

  /**
   * Simple catch game constructor.  Items fall from the top and the
   * player moves a paddle left and right to catch them.  Catching
   * items increases the score.
   * @param {HTMLCanvasElement} canvas The canvas on which to draw
   * @param {HTMLElement} scoreLabel The element displaying the score
   */
  class CatchGame {
    constructor(canvas, scoreLabel) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.scoreLabel = scoreLabel;
      this.width = canvas.width;
      this.height = canvas.height;
      this.player = { x: this.width / 2 - 40, width: 80, height: 15, speed: 6, moveLeft: false, moveRight: false };
      this.items = [];
      this.score = 0;
      this.running = true;
      // spawn items every second
      this.spawnInterval = setInterval(() => {
        this.spawnItem();
      }, 1000);
      // Bind methods for event listeners
      this.onKeyDown = this.onKeyDown.bind(this);
      this.onKeyUp = this.onKeyUp.bind(this);
      // Listen for keyboard input
      document.addEventListener('keydown', this.onKeyDown);
      document.addEventListener('keyup', this.onKeyUp);
      // Start the animation loop
      this.update = this.update.bind(this);
      requestAnimationFrame(this.update);
    }
    onKeyDown(e) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.player.moveLeft = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.player.moveRight = true;
      }
    }
    onKeyUp(e) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.player.moveLeft = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.player.moveRight = false;
      }
    }
    spawnItem() {
      const radius = 12 + Math.random() * 6;
      const x = radius + Math.random() * (this.width - 2 * radius);
      const speed = 2 + Math.random() * 2;
      this.items.push({ x, y: -radius, r: radius, vy: speed });
    }
    update() {
      if (!this.running) return;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);
      // Move player
      if (this.player.moveLeft) {
        this.player.x -= this.player.speed;
      }
      if (this.player.moveRight) {
        this.player.x += this.player.speed;
      }
      // Keep player within bounds
      if (this.player.x < 0) this.player.x = 0;
      if (this.player.x + this.player.width > this.width) this.player.x = this.width - this.player.width;
      // Update items
      for (let i = this.items.length - 1; i >= 0; i--) {
        const item = this.items[i];
        item.y += item.vy;
        // Check collision with player
        const hitY = this.height - this.player.height;
        if (item.y + item.r >= hitY) {
          // Check horizontal overlap
          if (item.x + item.r >= this.player.x && item.x - item.r <= this.player.x + this.player.width) {
            // Caught the item
            this.items.splice(i, 1);
            this.score += 10;
            this.scoreLabel.textContent = `Score: ${this.score}`;
            continue;
          }
        }
        // Remove items that fall off screen
        if (item.y - item.r > this.height) {
          this.items.splice(i, 1);
        }
      }
      // Draw items
      this.items.forEach(item => {
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 122, 255, 0.8)';
        ctx.fill();
      });
      // Draw player paddle
      ctx.fillStyle = '#34c759';
      ctx.fillRect(this.player.x, this.height - this.player.height, this.player.width, this.player.height);
      requestAnimationFrame(this.update);
    }
    destroy() {
      this.running = false;
      clearInterval(this.spawnInterval);
      document.removeEventListener('keydown', this.onKeyDown);
      document.removeEventListener('keyup', this.onKeyUp);
    }
  }
});