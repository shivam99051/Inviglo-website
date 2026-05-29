/**
 * INVIGLO Scroll-Driven Animation Engine
 * Creates a high-fidelity scroll experience utilizing preloaded images,
 * linear interpolation (lerp) for smooth frame changes, and narrative overlays.
 */

// Configuration
const CONFIG = {
  totalFrames: 210,
  framePath: (index) => `./frames/ezgif-frame-${String(index).padStart(3, '0')}.jpg`,
  lerpFactor: 0.1, // Lower value = smoother but more inertia (0.1 is sweet spot)
  scrollSectionId: 'scroll-section',
  canvasId: 'animation-canvas'
};

// Application State
const state = {
  images: [],
  imagesLoaded: 0,
  currentFrame: 1,
  targetFrame: 1,
  scrollProgress: 0,
  width: 0,
  height: 0
};

// DOM Elements
const elements = {
  loader: document.getElementById('loader'),
  loaderBar: document.getElementById('loader-bar'),
  loaderText: document.getElementById('loader-text'),
  canvas: document.getElementById(CONFIG.canvasId),
  ctx: null,
  scrollSection: document.getElementById(CONFIG.scrollSectionId),
  scrollHero: document.getElementById('scroll-hero')
};

// Get canvas 2d context
elements.ctx = elements.canvas.getContext('2d');

/* ==========================================================================
   IMAGE PRELOADER
   ========================================================================== */
function preloadImages() {
  return new Promise((resolve) => {
    for (let i = 1; i <= CONFIG.totalFrames; i++) {
      const img = new Image();
      img.src = CONFIG.framePath(i);
      img.onload = () => {
        state.imagesLoaded++;
        updateLoaderProgress();
        if (state.imagesLoaded === CONFIG.totalFrames) {
          setTimeout(hideLoader, 600); // Small timeout for aesthetic transition
          resolve();
        }
      };
      img.onerror = () => {
        console.error(`Failed to load frame: ${CONFIG.framePath(i)}`);
        // Continue preloading even if one fails
        state.imagesLoaded++;
        updateLoaderProgress();
        if (state.imagesLoaded === CONFIG.totalFrames) {
          setTimeout(hideLoader, 600);
          resolve();
        }
      };
      state.images.push(img);
    }
  });
}

function updateLoaderProgress() {
  const progressPct = Math.round((state.imagesLoaded / CONFIG.totalFrames) * 100);
  elements.loaderBar.style.width = `${progressPct}%`;
  elements.loaderText.textContent = `Loading Experience... ${progressPct}%`;
}

function hideLoader() {
  elements.loader.style.opacity = '0';
  elements.loader.style.visibility = 'hidden';
  // Trigger initial draw
  resizeCanvas();
  renderCanvas(state.currentFrame);
}

/* ==========================================================================
   CANVAS RENDERING & FIT
   ========================================================================== */
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  
  elements.canvas.width = state.width * dpr;
  elements.canvas.height = state.height * dpr;
  elements.ctx.scale(dpr, dpr);
  
  // Re-render current frame immediately on resize
  renderCanvas(state.currentFrame);
}

// "Cover" fit implementation for drawing image to canvas
function renderCanvas(frameIndex) {
  const imgIndex = Math.clamp(Math.round(frameIndex) - 1, 0, CONFIG.totalFrames - 1);
  const img = state.images[imgIndex];
  
  if (!img || !img.complete) return;
  
  const canvasWidth = state.width;
  const canvasHeight = state.height;
  const imgWidth = img.naturalWidth;
  const imgHeight = img.naturalHeight;
  
  // Calculate ratios
  const imgRatio = imgWidth / imgHeight;
  const canvasRatio = canvasWidth / canvasHeight;
  
  let drawWidth, drawHeight, drawX, drawY;
  
  if (canvasRatio > imgRatio) {
    // Canvas is wider than image aspect ratio
    drawWidth = canvasWidth;
    drawHeight = canvasWidth / imgRatio;
    drawX = 0;
    drawY = (canvasHeight - drawHeight) / 2;
  } else {
    // Canvas is taller than image aspect ratio
    drawWidth = canvasHeight * imgRatio;
    drawHeight = canvasHeight;
    drawX = (canvasWidth - drawWidth) / 2;
    drawY = 0;
  }
  
  elements.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  elements.ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
}

// Utility clamp function
Math.clamp = (num, min, max) => Math.min(Math.max(num, min), max);

/* ==========================================================================
   SCROLL ENGINE & SMOOTH INTERPOLATION (LERP)
   ========================================================================== */
// Custom piecewise mapping to accelerate intermediate frames (blank desk between book and logo)
function mapScrollToFrame(progress) {
  if (progress < 0.5) {
    // Map progress [0.0 - 0.5] to frames [1 - 140] (book sign remains visible)
    const ratio = progress / 0.5;
    return 1 + ratio * (140 - 1);
  } else if (progress < 0.6) {
    // Map progress [0.5 - 0.6] to frames [140 - 185] (fast fade out/in gap)
    const ratio = (progress - 0.5) / 0.1;
    return 140 + ratio * (185 - 140);
  } else {
    // Map progress [0.6 - 1.0] to frames [185 - 210] (smooth logo reveal)
    const ratio = (progress - 0.6) / 0.4;
    return 185 + ratio * (210 - 185);
  }
}

function updateScrollProgress() {
  if (!elements.scrollSection) return;
  
  const rect = elements.scrollSection.getBoundingClientRect();
  const totalScrollableHeight = rect.height - window.innerHeight;
  
  if (totalScrollableHeight <= 0) return;
  
  // Calculate how far down the scroll-section we have scrolled (0 to 1)
  const scrolledDistance = -rect.top;
  const rawProgress = scrolledDistance / totalScrollableHeight;
  state.scrollProgress = Math.clamp(rawProgress, 0, 1);
  
  // Map progress to target frame using the non-linear curve
  state.targetFrame = mapScrollToFrame(state.scrollProgress);
}

// Animation loop using RequestAnimationFrame to interpolate frames
function animationLoop() {
  // LERP: currentFrame creeps toward targetFrame
  const diff = state.targetFrame - state.currentFrame;
  
  if (Math.abs(diff) > 0.01) {
    state.currentFrame += diff * CONFIG.lerpFactor;
    renderCanvas(state.currentFrame);
  }
  
  // Fade out headline dynamically: fades completely at 30% scroll progress
  if (elements.scrollHero) {
    const currentProgress = (state.currentFrame - 1) / (CONFIG.totalFrames - 1);
    const opacity = Math.max(0, Math.min(1, 1 - (currentProgress / 0.3)));
    elements.scrollHero.style.opacity = opacity;
    elements.scrollHero.style.visibility = opacity === 0 ? 'hidden' : 'visible';
  }
  
  requestAnimationFrame(animationLoop);
}

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => {
  // Event listeners
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  
  // Preload and run
  preloadImages().then(() => {
    // Start the physics animation loop
    animationLoop();
  });
});
