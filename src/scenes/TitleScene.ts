import Phaser from "phaser";

/**
 * Title screen shown before the game starts.
 * Skipped entirely when `?dev` is in the URL.
 */
export default class TitleScene extends Phaser.Scene {
  private overlay!: HTMLDivElement;

  constructor() {
    super("Title");
  }

  create(): void {
    this.buildOverlay();
    this.showOverlay();
  }

  private buildOverlay(): void {
    const existing = document.getElementById("title-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "title-overlay";
    overlay.className = "title-overlay";

    overlay.innerHTML = `
      <div class="title-card">
        <h1 class="title-heading">Cliffside Castle Conquest</h1>
        <p class="title-tagline">A tactical auto-battler across a crumbling bridge</p>
        <div class="title-rules">
          <p>Buy units from the shop and arrange them in your wave grid.</p>
          <p>Each wave, your troops march across the bridge to assault the enemy castle.</p>
          <p>Capture control points for bonus income. Destroy the enemy castle to win.</p>
        </div>
        <button class="title-button title-start">Start Game</button>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;

    const startBtn = overlay.querySelector(".title-start") as HTMLButtonElement;
    startBtn.addEventListener("click", () => this.startGame());
  }

  private showOverlay(): void {
    // Force reflow then add visible class for transition
    void this.overlay.offsetHeight;
    this.overlay.classList.add("is-visible");
  }

  private hideOverlay(onComplete: () => void): void {
    this.overlay.classList.remove("is-visible");
    this.overlay.addEventListener(
      "transitionend",
      () => {
        this.overlay.remove();
        onComplete();
      },
      { once: true }
    );

    // Fallback in case transitionend doesn't fire
    setTimeout(() => {
      if (this.overlay.parentElement) {
        this.overlay.remove();
        onComplete();
      }
    }, 400);
  }

  private startGame(): void {
    this.hideOverlay(() => {
      this.scene.start("Game");
    });
  }

  shutdown(): void {
    if (this.overlay?.parentElement) {
      this.overlay.remove();
    }
  }
}
