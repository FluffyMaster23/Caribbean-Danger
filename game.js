"use strict";

const BASE_PRICES = {
  grain: 100,
  wood: 100,
  tobacco: 300,
  rum: 600
};

const GOODS = ["grain", "wood", "tobacco", "rum"];
const MAX_SAVE_SLOTS = 3;
const STORAGE_PREFIX = "caribbean-danger-slot-";

const HARBORS = {
  "San Juan": {
    world: { x: 3, y: 9 },
    dock: { x: 2, y: 12 },
    mooring: { x: 2, y: 11 },
    soldGoods: ["wood", "grain"],
    harborAmbience: "sounds/harbors/san_juan.wav",
    townAmbience: "sounds/harbors/town_san_juan.wav"
  },
  "Puerto Plata": {
    world: { x: 0, y: 10 },
    dock: { x: 2, y: 12 },
    mooring: { x: 2, y: 11 },
    soldGoods: ["tobacco", "rum"],
    harborAmbience: "sounds/harbors/puerto_plata.wav"
  },
  Princapolca: {
    world: { x: 8, y: 2 },
    dock: { x: 2, y: 12 },
    mooring: { x: 2, y: 11 },
    soldGoods: ["tobacco", "grain"],
    harborAmbience: "sounds/harbors/princapolca.wav"
  },
  Cartagena: {
    world: { x: 7, y: 0 },
    dock: { x: 2, y: 12 },
    mooring: { x: 2, y: 11 },
    soldGoods: ["rum", "tobacco"],
    harborAmbience: "sounds/harbors/cartagena.wav"
  },
  Curacao: {
    world: { x: 8, y: 0 },
    dock: { x: 2, y: 12 },
    mooring: { x: 2, y: 11 },
    soldGoods: ["grain", "rum"],
    harborAmbience: "sounds/harbors/curacao.wav"
  },
  Kingstown: {
    world: { x: 9, y: 0 },
    dock: { x: 2, y: 12 },
    mooring: { x: 2, y: 11 },
    soldGoods: ["grain", "wood"],
    harborAmbience: "sounds/harbors/kingstown.wav"
  },
  Camarco: {
    world: { x: -6, y: 3 },
    dock: { x: 2, y: 12 },
    mooring: { x: 2, y: 11 },
    soldGoods: ["wood", "rum"],
    harborAmbience: "sounds/harbors/camarco.wav"
  },
  "Spring Point": {
    world: { x: -2, y: 9 },
    dock: { x: 2, y: 12 },
    mooring: { x: 2, y: 11 },
    soldGoods: ["wood", "tobacco"],
    harborAmbience: "sounds/harbors/spring_point.wav"
  }
};

const HARBOR_ZONES = [
  { id: "dock", x: 2, y: 12, radius: 2, label: "Gangplank and dock entrance" },
  { id: "town", x: 8, y: 10, radius: 3, label: "Town approach" },
  { id: "merchant", x: 10, y: 15, radius: 2, label: "Merchant" },
  { id: "tavern", x: 10, y: 20, radius: 2, label: "Tavern" },
  { id: "goods", x: -6, y: 4, radius: 2, label: "Goods crates" },
  { id: "shipyard", x: 15, y: 25, radius: 2, label: "Shipyard" },
  { id: "mission", x: 40, y: 45, radius: 2, label: "Mission hut" },
  { id: "treasure", x: 20, y: 40, radius: 2, label: "Treasure location" }
];

const SHIP_ZONES = [
  { id: "wheel", x: 2, y: 1, radius: 1, label: "Captain's wheel" },
  { id: "mast", x: 2, y: 4, radius: 1, label: "Main mast" },
  { id: "cargo", x: 2, y: 7, radius: 1, label: "Cargo hatch" },
  { id: "crew", x: 2, y: 9, radius: 1, label: "Crew area" },
  { id: "gangplank", x: 2, y: 11, radius: 1, label: "Ship gangplank" },
  { id: "deck", x: 2, y: 6, radius: 4, label: "Main deck" }
];

class AmbientManager {
  constructor(context) {
    this.context = context;
    this.buffers = new Map();
    this.active = new Map();
    this.master = this.context.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.context.destination);
  }

  async load(path) {
    if (!path) {
      return null;
    }
    if (this.buffers.has(path)) {
      return this.buffers.get(path);
    }
    try {
      const data = await this.fetchAudioArrayBuffer(path);
      const buffer = await this.context.decodeAudioData(data);
      this.buffers.set(path, buffer);
      return buffer;
    } catch (error) {
      return null;
    }
  }

  async fetchAudioArrayBuffer(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Fetch failed for ${path}`);
      }
      return await response.arrayBuffer();
    } catch (error) {
      return await new Promise((resolve, reject) => {
        const req = new XMLHttpRequest();
        req.open("GET", path, true);
        req.responseType = "arraybuffer";
        req.onload = () => {
          if (req.status === 200 || req.status === 0) {
            resolve(req.response);
          } else {
            reject(new Error(`XHR failed for ${path}`));
          }
        };
        req.onerror = () => reject(new Error(`XHR error for ${path}`));
        req.send();
      });
    }
  }

  async playLoop(key, path, gainValue = 0.45) {
    if (!path) {
      return;
    }
    const buffer = await this.load(path);
    if (!buffer) {
      return;
    }

    this.stop(key);

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gain = this.context.createGain();
    gain.gain.value = gainValue;

    source.connect(gain);
    gain.connect(this.master);

    source.start();
    this.active.set(key, { source, gain });
  }

  async crossfade(key, path, targetGain = 0.45, time = 1.2) {
    const oldTrack = this.active.get(key);
    const buffer = await this.load(path);
    if (!buffer) {
      return;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gain = this.context.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(this.master);

    const now = this.context.currentTime;
    gain.gain.linearRampToValueAtTime(targetGain, now + time);
    source.start(now);

    if (oldTrack) {
      oldTrack.gain.gain.cancelScheduledValues(now);
      oldTrack.gain.gain.linearRampToValueAtTime(0, now + time);
      oldTrack.source.stop(now + time + 0.05);
    }

    this.active.set(key, { source, gain });
  }

  stop(key) {
    const track = this.active.get(key);
    if (!track) {
      return;
    }
    try {
      track.source.stop();
    } catch (error) {
      // no-op if already stopped
    }
    this.active.delete(key);
  }
}

class CombatManager {
  constructor(context, ambientManager) {
    this.context = context;
    this.ambient = ambientManager;
    this.eventSamples = {
      cannon: "sounds/merchants/puerto plata/small_cannon.wav",
      shipCreak: "sounds/ship/creaking_ship.wav"
    };
  }

  async play(type, volume = 0.7) {
    const path = this.eventSamples[type];
    if (!path) {
      return;
    }
    const buffer = await this.ambient.load(path);
    if (!buffer) {
      return;
    }

    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(this.context.destination);
    source.start();
  }
}

class PanningManager {
  constructor() {
    this.ready = false;
  }

  setListenerPosition() {
    // Panning system placeholder for future moving sound sources.
  }
}

class CaribbeanDanger {
  constructor() {
    this.audioContext = null;
    this.ambientManager = null;
    this.combatManager = null;
    this.panningManager = new PanningManager();

    this.ui = {
      shell: document.querySelector(".shell"),
      menuPanel: document.getElementById("menuPanel"),
      gamePanel: document.getElementById("gamePanel"),
      zonePanel: document.getElementById("zonePanel"),
      goodsPanel: document.getElementById("goodsPanel"),
      tradePanel: document.getElementById("tradePanel"),
      sailPanel: document.getElementById("sailPanel"),
      savePanel: document.getElementById("savePanel"),
      mainMenuButtons: document.getElementById("mainMenuButtons"),
      statusGrid: document.getElementById("statusGrid"),
      zoneText: document.getElementById("zoneText"),
      goodsText: document.getElementById("goodsText"),
      tradeInfo: document.getElementById("tradeInfo"),
      tradeActions: document.getElementById("tradeActions"),
      sailInfo: document.getElementById("sailInfo"),
      sailActions: document.getElementById("sailActions"),
      slotActions: document.getElementById("slotActions"),
      log: document.getElementById("log"),
      srAnnouncer: document.getElementById("srAnnouncer"),
      srHint: document.getElementById("srHint")
    };

    this.menuItems = [];
    this.activeSaveSlot = 1;
    this.hasAudioLoadWarning = false;

    this.state = this.freshState();
    this.bindInput();
    this.renderMenu();
    this.tickLoop();

    this.focusShell();
  }

  freshState() {
    return {
      mode: "menu",
      inPanel: null,
      menuIndex: 0,
      location: {
        scene: "ship",
        currentHarbor: "San Juan",
        x: 2,
        y: 1,
        zone: "wheel"
      },
      destinationSelectionIndex: 0,
      sea: {
        inProgress: false,
        from: null,
        to: null,
        totalMiles: 0,
        remainingMiles: 0,
        heading: "N",
        speedKnots: 0,
        travelSecondsTotal: 0,
        travelSecondsLeft: 0
      },
      lastVoyageSeconds: 0,
      lastVisitedHarbor: "San Juan",
      worldDay: 1,
      specialEvent: null,
      player: {
        gold: 1500,
        victoryPoints: 0,
        ship: {
          hull: 100,
          sails: 100,
          cannons: 2,
          crew: 2,
          cargoBase: 2,
          cargoBonus: 0,
          cargoUpgradeLevel: 0
        },
        cargo: {
          grain: 0,
          wood: 0,
          tobacco: 0,
          rum: 0
        }
      },
      market: this.createMarketState(),
      prompts: {
        reachedFiveVpPromptShown: false
      }
    };
  }

  createMarketState() {
    const market = {};
    for (const harbor of Object.keys(HARBORS)) {
      market[harbor] = {};
      for (const good of GOODS) {
        market[harbor][good] = {
          demand: this.rand(0.85, 1.2),
          supply: this.rand(0.85, 1.2)
        };
      }
    }
    return market;
  }

  bindInput() {
    document.addEventListener("keydown", async (event) => {
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "enter", "b", "c", "g", "t", "v", "escape"].includes(key)) {
        event.preventDefault();
      }

      if (this.state.mode === "menu") {
        this.handleMenuInput(key);
        return;
      }

      if (this.state.mode !== "playing") {
        return;
      }

      await this.ensureAudioSafe();

      if (this.state.inPanel === "trade" || this.state.inPanel === "sail" || this.state.inPanel === "save") {
        if (key === "arrowup") {
          this.moveOptionSelection(-1);
          return;
        }
        if (key === "arrowdown") {
          this.moveOptionSelection(1);
          return;
        }
        if (key === "enter") {
          this.activateCurrentOption();
          return;
        }
      }

      if (key === "b") {
        this.speakAndLog(this.describeLocation());
        return;
      }

      if (key === "c") {
        this.speakAndLog(`Coordinates ${this.state.location.x}, ${this.state.location.y}.`);
        return;
      }

      if (key === "g") {
        this.speakAndLog(`Gold ${this.state.player.gold}.`);
        return;
      }

      if (key === "escape") {
        this.closePanels();
        return;
      }

      if (key === "v") {
        this.openSavePanel();
        return;
      }

      if (this.state.inPanel === "trade" || this.state.inPanel === "sail" || this.state.inPanel === "save") {
        return;
      }

      if (key.startsWith("arrow")) {
        this.movePlayer(key);
        return;
      }

      if (key === "enter") {
        this.interactWithZone();
        return;
      }

      if (key === "t" && this.state.location.zone === "merchant") {
        this.openTradePanel();
      }
    });
  }

  async ensureAudio() {
    if (this.audioContext) {
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
      return;
    }

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      return;
    }

    this.audioContext = new Ctx();
    this.ambientManager = new AmbientManager(this.audioContext);
    this.combatManager = new CombatManager(this.audioContext, this.ambientManager);

    await this.ambientManager.playLoop("ship", "sounds/ship/creaking_ship.wav", 0.22);
    await this.updateAmbienceForLocation();

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
    this.log("Audio engine ready.");
  }

  async ensureAudioSafe() {
    try {
      await this.ensureAudio();
    } catch (error) {
      if (!this.hasAudioLoadWarning) {
        this.hasAudioLoadWarning = true;
        this.log("Audio failed to initialize. Run from a local server (http://localhost), not file://.");
      }
    }
  }

  renderMenu() {
    this.state.mode = "menu";
    this.closePanels();
    this.ui.menuPanel.classList.remove("hidden");
    this.ui.gamePanel.classList.add("hidden");
    this.ui.zonePanel.classList.add("hidden");
    this.ui.goodsPanel.classList.add("hidden");

    this.renderMenuButtons([
      { label: "New Voyage", click: () => this.openNewVoyageMenu() },
      { label: "Load Captain's Log", click: () => this.openLoadMenu() },
      { label: "Quit", click: () => this.quitGame() }
    ], this.ui.mainMenuButtons);

    this.log("Main menu ready. Choose New Voyage, Load Captain's Log, or Quit.");
    this.announceHint("Main menu. Use up and down arrows, then Enter.");
  }

  handleMenuInput(key) {
    if (!this.menuItems.length) {
      return;
    }

    if (key === "arrowup") {
      this.state.menuIndex = (this.state.menuIndex + this.menuItems.length - 1) % this.menuItems.length;
      this.syncMenuFocus();
      return;
    }

    if (key === "arrowdown") {
      this.state.menuIndex = (this.state.menuIndex + 1) % this.menuItems.length;
      this.syncMenuFocus();
      return;
    }

    if (key === "enter") {
      this.menuItems[this.state.menuIndex].button.click();
    }
  }

  openNewVoyageMenu() {
    this.renderMenuButtons([
      { label: "Start New Voyage in Slot 1", click: () => this.startNewVoyageFromSlot(1) },
      { label: "Start New Voyage in Slot 2", click: () => this.startNewVoyageFromSlot(2) },
      { label: "Start New Voyage in Slot 3", click: () => this.startNewVoyageFromSlot(3) },
      { label: "Back to Main Menu", click: () => this.renderMenu() }
    ], this.ui.mainMenuButtons);
    this.log("Choose a save slot for your new voyage.");
    this.announceHint("Select a slot for new voyage.");
  }

  async startNewVoyageFromSlot(slot) {
    this.activeSaveSlot = slot;
    this.state = this.freshState();
    this.state.mode = "playing";
    this.ui.menuPanel.classList.add("hidden");
    this.ui.gamePanel.classList.remove("hidden");
    this.ui.zonePanel.classList.remove("hidden");
    this.ui.goodsPanel.classList.remove("hidden");

    await this.ensureAudioSafe();
    this.updateZone();
    this.updateStatus();
    this.updateGoodsPanel();
    this.saveSlot(slot);
    this.log(`A new voyage begins in San Juan from slot ${slot}. You start with 1500 gold.`);
    this.speakAndLog("New voyage. You are at the captain's wheel near the bow, docked at San Juan.");
    this.focusShell();
  }

  openLoadMenu() {
    const actions = [];
    for (let slot = 1; slot <= MAX_SAVE_SLOTS; slot += 1) {
      const data = this.readSlot(slot);
      const summary = data
        ? `Slot ${slot}: Day ${data.worldDay}, ${data.location.currentHarbor}, ${data.player.gold} gold, ${data.player.victoryPoints} VP`
        : `Slot ${slot}: empty`;
      actions.push({ label: summary, click: () => this.loadSlot(slot), disabled: !data });
    }

    actions.push({ label: "Back to Main Menu", click: () => this.renderMenu() });
    this.renderMenuButtons(actions, this.ui.mainMenuButtons);

    this.log("Captain's Log opened.");
    this.announceHint("Load Captain's Log list. Use up and down arrows, then Enter.");
  }

  quitGame() {
    this.state.mode = "quit";
    this.renderMenuButtons([
      { label: "Return to Main Menu", click: () => this.renderMenu() }
    ], this.ui.mainMenuButtons);
    this.log("Voyage ended. You can return to the main menu.");
    this.announceHint("Quit selected. Press Enter to return to main menu.");
  }

  async loadSlot(slot) {
    const data = this.readSlot(slot);
    if (!data) {
      this.log(`Slot ${slot} is empty.`);
      return;
    }

    this.state = data;
    this.state.mode = "playing";
    this.state.inPanel = null;
    this.activeSaveSlot = slot;

    this.ui.menuPanel.classList.add("hidden");
    this.ui.gamePanel.classList.remove("hidden");
    this.ui.zonePanel.classList.remove("hidden");
    this.ui.goodsPanel.classList.remove("hidden");

    await this.ensureAudioSafe();
    this.updateZone();
    this.updateStatus();
    this.updateGoodsPanel();
    this.updateAmbienceForLocation();
    this.log(`Loaded slot ${slot}.`);
    this.speakAndLog(`Loaded Captain's Log slot ${slot}.`);
    this.focusShell();
  }

  saveSlot(slot) {
    const data = JSON.stringify(this.state);
    localStorage.setItem(`${STORAGE_PREFIX}${slot}`, data);
    this.log(`Saved voyage to slot ${slot}.`);
    this.speakAndLog(`Saved to slot ${slot}.`);
  }

  readSlot(slot) {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${slot}`);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  movePlayer(key) {
    const delta = { x: 0, y: 0 };
    if (key === "arrowup") {
      delta.y += 1;
    }
    if (key === "arrowdown") {
      delta.y -= 1;
    }
    if (key === "arrowleft") {
      delta.x -= 1;
    }
    if (key === "arrowright") {
      delta.x += 1;
    }

    const movingSouth = delta.y > 0;

    const bounds = this.state.location.scene === "harbor"
      ? { minX: -25, maxX: 24, minY: -25, maxY: 24 }
      : { minX: 0, maxX: 3, minY: 0, maxY: 11 };

    if (
      this.state.location.scene === "ship"
      && !this.state.sea.inProgress
      && this.state.location.zone === "gangplank"
      && movingSouth
    ) {
      const harborData = HARBORS[this.state.location.currentHarbor];
      this.state.location.scene = "harbor";
      this.state.location.x = harborData.dock.x;
      this.state.location.y = harborData.dock.y;
      this.updateZone();
      this.updateStatus();
      this.playFootstep();
      this.speakAndLog(`Entering ${this.state.location.currentHarbor} dock.`);
      return;
    }

    this.state.location.x = this.clamp(this.state.location.x + delta.x, bounds.minX, bounds.maxX);
    this.state.location.y = this.clamp(this.state.location.y + delta.y, bounds.minY, bounds.maxY);

    this.updateZone();
    this.updateStatus();
    this.updateGoodsPanel();
    this.playFootstep();
  }

  updateZone() {
    const zones = this.state.location.scene === "harbor" ? HARBOR_ZONES : SHIP_ZONES;
    let nearest = null;
    for (const zone of zones) {
      const d = this.distance(this.state.location, zone);
      if (d <= zone.radius) {
        nearest = zone;
        break;
      }
    }

    this.state.location.zone = nearest ? nearest.id : "open";

    const locationName = this.state.location.scene === "harbor"
      ? `${this.state.location.currentHarbor} harbor`
      : (this.state.sea.inProgress ? "ship at sea" : `ship docked at ${this.state.location.currentHarbor}`);

    const zoneLine = nearest ? nearest.label : "Open area";
    this.ui.zoneText.innerHTML = [
      `<strong>Area:</strong> ${locationName}<br>`,
      `<strong>Zone:</strong> ${zoneLine}<br>`,
      `<strong>Coordinates:</strong> <span class="mono">${this.state.location.x}, ${this.state.location.y}</span>`
    ].join("");

    this.updateAmbienceForLocation();
  }

  interactWithZone() {
    const zone = this.state.location.zone;
    const harborData = HARBORS[this.state.location.currentHarbor];

    if (this.state.location.scene === "ship" && zone === "gangplank" && !this.state.sea.inProgress) {
      this.state.location.scene = "harbor";
      this.state.location.x = harborData.dock.x;
      this.state.location.y = harborData.dock.y;
      this.updateZone();
      this.updateStatus();
      this.log(`You cross the gangplank into ${this.state.location.currentHarbor}.`);
      this.speakAndLog(`Entering ${this.state.location.currentHarbor} harbor.`);
      return;
    }

    if (this.state.location.scene === "harbor" && zone === "dock") {
      this.state.location.scene = "ship";
      this.state.location.x = 2;
      this.state.location.y = 11;
      this.updateZone();
      this.updateStatus();
      this.log("You return to your ship.");
      return;
    }

    if (this.state.location.scene === "ship" && zone === "wheel") {
      this.openSailPanel();
      return;
    }

    if (this.state.location.scene === "harbor" && zone === "merchant") {
      this.openTradePanel();
      return;
    }

    if (this.state.location.scene === "harbor" && zone === "shipyard") {
      this.repairShip();
      return;
    }

    if (this.state.location.scene === "harbor" && zone === "tavern") {
      this.showTavernRumor();
      return;
    }

    if (this.state.location.scene === "harbor" && zone === "goods") {
      this.log("Crates are stacked here. Trade through the merchant to load cargo.");
    }
  }

  openTradePanel() {
    this.closePanels();
    this.state.inPanel = "trade";
    this.ui.tradePanel.classList.remove("hidden");

    const harbor = this.state.location.currentHarbor;
    const soldGoods = HARBORS[harbor].soldGoods;

    this.ui.tradeInfo.innerHTML = [
      `<strong>Harbor:</strong> ${harbor}<br>`,
      `<strong>Sold Here:</strong> ${soldGoods.join(", ")}<br>`,
      `<strong>Special Event:</strong> ${this.state.specialEvent || "none"}`
    ].join("");

    this.ui.tradeActions.innerHTML = "";

    soldGoods.forEach((good) => {
      const buyPrice = this.calculateBuyPrice(harbor, good);
      this.ui.tradeActions.appendChild(this.makeOptionRow(`Buy ${good} (${buyPrice} gold)`, () => this.buyGood(good), false));
    });

    GOODS.forEach((good) => {
      const qty = this.state.player.cargo[good];
      if (qty > 0) {
        const sellPrice = this.calculateSellPrice(harbor, good);
        this.ui.tradeActions.appendChild(this.makeOptionRow(`Sell ${good} (${sellPrice} gold)`, () => this.sellGood(good), false));
      }
    });

    this.ui.tradeActions.appendChild(this.makeOptionRow("Upgrade cargo hold (small +2 capacity, costs 2 VP)", () => this.buyCargoUpgrade("small"), false));
    this.ui.tradeActions.appendChild(this.makeOptionRow("Upgrade cargo hold (large +4 capacity, costs 3 VP)", () => this.buyCargoUpgrade("large"), false));
    this.ui.tradeActions.appendChild(this.makeOptionRow("Close merchant", () => this.closePanels(), false));

    this.capturePanelOptions(this.ui.tradeActions);

    this.log("Merchant exchange opened.");
  }

  buyCargoUpgrade(size) {
    const ship = this.state.player.ship;

    if (size === "small") {
      if (ship.cargoUpgradeLevel >= 1) {
        this.log("Small cargo hold is already installed.");
        return;
      }
      if (this.state.player.victoryPoints < 2) {
        this.log("You need 2 victory points for small cargo hold.");
        return;
      }
      ship.cargoUpgradeLevel = 1;
      ship.cargoBonus = 2;
      this.state.player.victoryPoints -= 2;
      this.log("Installed small cargo hold. Capacity increased by 2.");
      this.openTradePanel();
      this.updateStatus();
      return;
    }

    if (ship.cargoUpgradeLevel >= 2) {
      this.log("Large cargo hold is already installed.");
      return;
    }
    if (this.state.player.victoryPoints < 3) {
      this.log("You need 3 victory points for large cargo hold.");
      return;
    }
    ship.cargoUpgradeLevel = 2;
    ship.cargoBonus = 4;
    this.state.player.victoryPoints -= 3;
    this.log("Installed large cargo hold. Capacity increased by 4.");
    this.openTradePanel();
    this.updateStatus();
  }

  buyGood(good) {
    const harbor = this.state.location.currentHarbor;
    const price = this.calculateBuyPrice(harbor, good);
    const cargoSpace = this.totalCargoCapacity() - this.currentCargoLoad();

    if (cargoSpace <= 0) {
      this.log("Cargo hold is full.");
      return;
    }

    if (this.state.player.gold < price) {
      this.log("Not enough gold.");
      return;
    }

    this.state.player.gold -= price;
    this.state.player.cargo[good] += 1;

    this.log(`Bought 1 ${good} for ${price} gold.`);
    this.updateStatus();
    this.updateGoodsPanel();
    this.openTradePanel();
  }

  sellGood(good) {
    if (this.state.player.cargo[good] <= 0) {
      this.log(`No ${good} in cargo.`);
      return;
    }

    const harbor = this.state.location.currentHarbor;
    const price = this.calculateSellPrice(harbor, good);
    this.state.player.cargo[good] -= 1;
    this.state.player.gold += price;

    const vpGain = Math.max(0, Math.floor((price - BASE_PRICES[good]) / 220));
    if (vpGain > 0) {
      this.state.player.victoryPoints += vpGain;
      this.log(`Earned ${vpGain} victory point${vpGain > 1 ? "s" : ""} from profitable trade.`);
    }

    this.log(`Sold 1 ${good} for ${price} gold.`);

    if (!this.state.prompts.reachedFiveVpPromptShown && this.state.player.victoryPoints >= 5) {
      this.state.prompts.reachedFiveVpPromptShown = true;
      this.askContinueAtFiveVp();
    }

    this.updateStatus();
    this.updateGoodsPanel();
    this.openTradePanel();
  }

  askContinueAtFiveVp() {
    const keepPlaying = window.confirm("You reached 5 victory points. Continue voyaging?");
    if (keepPlaying) {
      this.log("You continue your voyage beyond 5 victory points.");
      return;
    }

    this.log("Voyage complete at 5+ victory points. Save your captain's log before leaving if you wish.");
    this.openSavePanel();
  }

  openSailPanel() {
    if (this.state.sea.inProgress) {
      this.log("Already sailing.");
      return;
    }

    this.closePanels();
    this.state.inPanel = "sail";
    this.ui.sailPanel.classList.remove("hidden");

    const harbors = Object.keys(HARBORS).filter((h) => h !== this.state.location.currentHarbor);
    if (this.state.destinationSelectionIndex >= harbors.length) {
      this.state.destinationSelectionIndex = 0;
    }

    const selected = harbors[this.state.destinationSelectionIndex];
    const miles = this.routeDistance(this.state.location.currentHarbor, selected).toFixed(1);
    const heading = this.routeHeading(this.state.location.currentHarbor, selected);

    this.ui.sailInfo.innerHTML = [
      `<strong>From:</strong> ${this.state.location.currentHarbor}<br>`,
      `<strong>Destination:</strong> ${selected}<br>`,
      `<strong>Heading:</strong> ${heading}<br>`,
      `<strong>Distance:</strong> ${miles} nautical miles`
    ].join("");

    this.ui.sailActions.innerHTML = "";
    this.ui.sailActions.appendChild(this.makeOptionRow("Previous destination", () => {
      this.state.destinationSelectionIndex = (this.state.destinationSelectionIndex + harbors.length - 1) % harbors.length;
      this.openSailPanel();
    }, false));

    this.ui.sailActions.appendChild(this.makeOptionRow("Next destination", () => {
      this.state.destinationSelectionIndex = (this.state.destinationSelectionIndex + 1) % harbors.length;
      this.openSailPanel();
    }, false));

    this.ui.sailActions.appendChild(this.makeOptionRow("Set sail", () => this.beginVoyage(selected), false));
    this.ui.sailActions.appendChild(this.makeOptionRow("Leave wheel", () => this.closePanels(), false));

    this.capturePanelOptions(this.ui.sailActions);
  }

  beginVoyage(destination) {
    const from = this.state.location.currentHarbor;
    const miles = this.routeDistance(from, destination);

    const cargoWeightFactor = 1 - (this.currentCargoLoad() / Math.max(1, this.totalCargoCapacity())) * 0.25;
    const sailFactor = this.state.player.ship.sails / 100;
    const windFactor = this.rand(0.82, 1.18);
    const baseKnots = 12;
    const speedKnots = Math.max(3.2, baseKnots * sailFactor * cargoWeightFactor * windFactor);

    const realHours = miles / speedKnots;
    const scaledSeconds = Math.max(20, realHours * 3600 * 0.25);

    this.state.sea = {
      inProgress: true,
      from,
      to: destination,
      totalMiles: miles,
      remainingMiles: miles,
      heading: this.routeHeading(from, destination),
      speedKnots,
      travelSecondsTotal: scaledSeconds,
      travelSecondsLeft: scaledSeconds
    };

    this.state.location.scene = "ship";
    this.state.location.x = 0;
    this.state.location.y = 9;
    this.closePanels();
    this.log(`Set sail from ${from} to ${destination}.`);
    this.speakAndLog(`Set sail. Destination ${destination}.`);
    this.updateStatus();
    this.updateZone();
    this.updateAmbienceForLocation();
  }

  progressVoyage(seconds) {
    if (!this.state.sea.inProgress) {
      return;
    }

    this.state.sea.travelSecondsLeft = Math.max(0, this.state.sea.travelSecondsLeft - seconds);
    const ratio = 1 - this.state.sea.travelSecondsLeft / this.state.sea.travelSecondsTotal;
    this.state.sea.remainingMiles = Math.max(0, this.state.sea.totalMiles * (1 - ratio));

    if (Math.random() < 0.018 * seconds) {
      this.triggerSeaEvent();
    }

    if (this.state.sea.travelSecondsLeft <= 0) {
      this.arriveAtDestination();
    }
  }

  triggerSeaEvent() {
    const events = ["storm", "merchant convoy", "sea monster", "floating cargo", "rescue"];
    const event = events[Math.floor(Math.random() * events.length)];

    if (event === "storm") {
      this.state.player.ship.sails = Math.max(20, this.state.player.ship.sails - Math.floor(this.rand(4, 12)));
      this.state.player.ship.hull = Math.max(30, this.state.player.ship.hull - Math.floor(this.rand(1, 5)));
      this.log("Storm hit the ship. Sail and hull condition dropped.");
      this.combatManager.play("shipCreak", 0.55);
      return;
    }

    if (event === "sea monster") {
      this.state.player.ship.hull = Math.max(15, this.state.player.ship.hull - Math.floor(this.rand(5, 14)));
      this.log("A sea monster attacked! Hull integrity reduced.");
      this.combatManager.play("cannon", 0.8);
      return;
    }

    if (event === "merchant convoy") {
      this.state.player.gold += 120;
      this.log("You traded briefly with a merchant convoy and gained 120 gold.");
      return;
    }

    if (event === "floating cargo") {
      const randomGood = GOODS[Math.floor(Math.random() * GOODS.length)];
      if (this.currentCargoLoad() < this.totalCargoCapacity()) {
        this.state.player.cargo[randomGood] += 1;
        this.log(`Recovered floating cargo: +1 ${randomGood}.`);
      } else {
        this.log("Found floating cargo but your hold is full.");
      }
      return;
    }

    this.state.player.gold += 80;
    this.log("You rescued sailors at sea and received 80 gold as reward.");
  }

  arriveAtDestination() {
    const to = this.state.sea.to;
    this.state.lastVoyageSeconds = this.state.sea.travelSecondsTotal;
    this.state.sea.inProgress = false;
    this.state.location.currentHarbor = to;
    this.state.location.scene = "ship";
    this.state.location.x = 0;
    this.state.location.y = 11;
    this.state.lastVisitedHarbor = to;

    this.state.worldDay += 1;
    this.applyDailyMarketShift();

    this.log(`Arrived at ${to}.`);
    this.speakAndLog(`Arrived at ${to}.`);
    this.updateStatus();
    this.updateZone();
    this.updateGoodsPanel();
  }

  applyDailyMarketShift() {
    const events = ["none", "festival", "shortage", "pirate raid", "none", "none"];
    this.state.specialEvent = events[Math.floor(Math.random() * events.length)];

    for (const harbor of Object.keys(this.state.market)) {
      for (const good of GOODS) {
        const point = this.state.market[harbor][good];
        point.demand = this.clamp(point.demand + this.rand(-0.05, 0.05), 0.65, 1.35);
        point.supply = this.clamp(point.supply + this.rand(-0.05, 0.05), 0.65, 1.35);
      }
    }

    if (this.state.specialEvent && this.state.specialEvent !== "none") {
      this.log(`World event: ${this.state.specialEvent}.`);
    }
  }

  repairShip() {
    const ship = this.state.player.ship;
    const missingHull = 100 - ship.hull;
    const missingSails = 100 - ship.sails;
    if (missingHull <= 0 && missingSails <= 0) {
      this.log("Ship is already fully repaired.");
      return;
    }

    const cost = Math.ceil((missingHull + missingSails) * 2.8);
    if (this.state.player.gold < cost) {
      this.log(`Need ${cost} gold to fully repair. Not enough gold.`);
      return;
    }

    this.state.player.gold -= cost;
    ship.hull = 100;
    ship.sails = 100;
    this.log(`Ship repaired for ${cost} gold.`);
    this.updateStatus();
  }

  showTavernRumor() {
    const rumors = [
      "Rumor: Grain prices may rise in Curacao.",
      "Rumor: A shortage is building near Cartagena.",
      "Rumor: Spring Point seeks tobacco shipments.",
      "Rumor: The governor wants urgent wood in San Juan."
    ];
    const line = rumors[Math.floor(Math.random() * rumors.length)];
    this.log(`Tavern: ${line}`);
    this.speakAndLog(line);
  }

  calculateBuyPrice(harbor, good) {
    const market = this.state.market[harbor][good];
    const availabilityBonus = HARBORS[harbor].soldGoods.includes(good) ? 0.93 : 1.2;
    const eventFactor = this.eventFactor(good, true);
    const dynamic = (market.demand * 0.55 + (2 - market.supply) * 0.45) * availabilityBonus * eventFactor;
    return Math.max(30, Math.round(BASE_PRICES[good] * dynamic));
  }

  calculateSellPrice(harbor, good) {
    const market = this.state.market[harbor][good];
    const destinationFactor = HARBORS[harbor].soldGoods.includes(good) ? 0.86 : 1.23;
    const supplyDemandFactor = (market.demand * 0.68 + (2 - market.supply) * 0.4);

    const shipDamage = (this.state.player.ship.hull + this.state.player.ship.sails) / 200;
    const damageFactor = this.clamp(0.72 + shipDamage * 0.38, 0.72, 1.1);

    const travelTimeNorm = this.clamp(this.state.lastVoyageSeconds / 160, 0, 1.8);
    const timePenalty = this.clamp(1.06 - travelTimeNorm * (good === "rum" ? 0.02 : 0.12), 0.72, 1.08);

    const eventFactor = this.eventFactor(good, false);

    const price = BASE_PRICES[good] * destinationFactor * supplyDemandFactor * damageFactor * timePenalty * eventFactor;
    return Math.max(40, Math.round(price));
  }

  eventFactor(good, isBuying) {
    const event = this.state.specialEvent;
    if (!event || event === "none") {
      return 1;
    }

    if (event === "festival") {
      if (good === "rum") {
        return isBuying ? 1.15 : 1.2;
      }
      return isBuying ? 1.05 : 1.08;
    }

    if (event === "shortage") {
      if (good === "grain" || good === "wood") {
        return isBuying ? 1.1 : 1.16;
      }
      return isBuying ? 1.03 : 1.08;
    }

    if (event === "pirate raid") {
      return isBuying ? 1.06 : 0.96;
    }

    return 1;
  }

  describeLocation() {
    if (this.state.sea.inProgress) {
      return "Open sea";
    }

    const harbor = this.state.location.currentHarbor;
    const zone = this.state.location.zone;

    if (this.state.location.scene === "harbor") {
      if (zone === "open") {
        return harbor;
      }
      if (zone === "dock") {
        return `${harbor} dock`;
      }
      return `${harbor} ${zone}`;
    }

    if (zone === "open") {
      return "Ship";
    }
    return `Ship ${zone}`;
  }

  updateStatus() {
    const ship = this.state.player.ship;
    const cargoLoad = this.currentCargoLoad();
    const cargoCap = this.totalCargoCapacity();
    const seaInfo = this.state.sea.inProgress
      ? `<span class="bad">At sea to ${this.state.sea.to} (${this.state.sea.remainingMiles.toFixed(1)} nm left)</span>`
      : `<span class="good">Docked at ${this.state.location.currentHarbor}</span>`;

    this.ui.statusGrid.innerHTML = [
      `<div><strong>Day</strong><br>${this.state.worldDay}</div>`,
      `<div><strong>Gold</strong><br>${this.state.player.gold}</div>`,
      `<div><strong>Victory Points</strong><br>${this.state.player.victoryPoints}</div>`,
      `<div><strong>Status</strong><br>${seaInfo}</div>`,
      `<div><strong>Hull / Sails</strong><br>${Math.round(ship.hull)}% / ${Math.round(ship.sails)}%</div>`,
      `<div><strong>Crew / Cannons</strong><br>${ship.crew} / ${ship.cannons}</div>`,
      `<div><strong>Cargo</strong><br>${cargoLoad} / ${cargoCap}</div>`,
      `<div><strong>World Event</strong><br>${this.state.specialEvent || "none"}</div>`
    ].join("");
  }

  updateGoodsPanel() {
    const harbor = this.state.location.currentHarbor;
    const sold = HARBORS[harbor].soldGoods;

    const sellLines = GOODS.map((good) => `${good}: ${this.calculateSellPrice(harbor, good)} gold`).join("<br>");
    const buyLines = sold.map((good) => `${good}: ${this.calculateBuyPrice(harbor, good)} gold`).join("<br>");
    const cargoLines = GOODS.map((good) => `${good}: ${this.state.player.cargo[good]}`).join("<br>");

    this.ui.goodsText.innerHTML = [
      `<strong>Harbor Market (${harbor})</strong><br>`,
      `<strong>Buy:</strong><br>${buyLines || "No local goods listed."}<br><br>`,
      `<strong>Sell:</strong><br>${sellLines}<br><br>`,
      `<strong>Your Cargo:</strong><br>${cargoLines}`
    ].join("");
  }

  openSavePanel() {
    this.closePanels();
    this.state.inPanel = "save";
    this.ui.savePanel.classList.remove("hidden");
    this.ui.slotActions.innerHTML = "";

    for (let i = 1; i <= MAX_SAVE_SLOTS; i += 1) {
      const existing = this.readSlot(i);
      const suffix = existing ? "(overwrite)" : "(empty)";
      this.ui.slotActions.appendChild(this.makeOptionRow(`Save to slot ${i} ${suffix}`, () => this.saveSlot(i), false));
    }

    this.ui.slotActions.appendChild(this.makeOptionRow("Load a slot now", () => this.openLoadPanelInGame(), false));
    this.ui.slotActions.appendChild(this.makeOptionRow("Close", () => this.closePanels(), false));
    this.capturePanelOptions(this.ui.slotActions);
  }

  openLoadPanelInGame() {
    this.ui.slotActions.innerHTML = "";
    for (let i = 1; i <= MAX_SAVE_SLOTS; i += 1) {
      const data = this.readSlot(i);
      const line = data
        ? `Load slot ${i}: Day ${data.worldDay}, ${data.location.currentHarbor}, ${data.player.gold} gold`
        : `Slot ${i} is empty`;
      const button = this.makeOptionRow(line, () => this.loadSlot(i), false);
      this.setOptionDisabled(button, !data);
      this.ui.slotActions.appendChild(button);
    }
    this.ui.slotActions.appendChild(this.makeOptionRow("Back", () => this.openSavePanel(), false));
    this.capturePanelOptions(this.ui.slotActions);
  }

  closePanels() {
    this.state.inPanel = null;
    this.ui.tradePanel.classList.add("hidden");
    this.ui.sailPanel.classList.add("hidden");
    this.ui.savePanel.classList.add("hidden");
    this.focusShell();
  }

  async updateAmbienceForLocation() {
    if (!this.ambientManager) {
      return;
    }

    const harbor = this.state.location.currentHarbor;
    const data = HARBORS[harbor];

    if (this.state.sea.inProgress) {
      await this.ambientManager.crossfade("world", "sounds/harbors/shore.wav", 0.24, 1.2);
      return;
    }

    if (this.state.location.scene === "harbor") {
      const isTownArea = this.state.location.zone === "town" || this.state.location.zone === "merchant" || this.state.location.zone === "tavern";
      if (isTownArea && harbor === "San Juan") {
        await this.ambientManager.crossfade("world", data.townAmbience, 0.34, 1.1);
      } else {
        await this.ambientManager.crossfade("world", data.harborAmbience, 0.3, 1.1);
      }
      return;
    }

    await this.ambientManager.crossfade("world", "sounds/harbors/shore.wav", 0.18, 1.0);
  }

  async playFootstep() {
    if (!this.ambientManager || !this.audioContext) {
      return;
    }

    const surface = this.resolveStepSurface();

    const pick = (min, max) => Math.floor(this.rand(min, max));
    let path;

    if (surface === "deck") {
      path = `sounds/steps/deck/deck${pick(1, 6)}.wav`;
    } else if (surface === "plank") {
      path = `sounds/steps/plank/plankstep${pick(1, 6)}.ogg`;
    } else if (surface === "sand") {
      path = `sounds/steps/sand/sand${pick(1, 6)}.wav`;
    } else if (surface === "grass") {
      // Grass files are not in the workspace yet; attempt grass path first, then fallback below.
      path = `sounds/steps/grass/grass${pick(1, 6)}.ogg`;
    } else {
      path = `sounds/steps/concrete3/concretestep${pick(1, 9)}.ogg`;
    }

    let buffer = await this.ambientManager.load(path);
    if (!buffer && surface === "grass") {
      path = `sounds/steps/concrete3/concretestep${pick(1, 9)}.ogg`;
      buffer = await this.ambientManager.load(path);
    }
    if (!buffer) {
      if (!this.hasAudioLoadWarning) {
        this.hasAudioLoadWarning = true;
        this.log(`Audio file could not be loaded: ${path}. Use http://localhost serving to allow sound loading.`);
      }
      return;
    }

    const source = this.audioContext.createBufferSource();
    const gain = this.audioContext.createGain();
    source.buffer = buffer;
    gain.gain.value = 0.14;
    source.connect(gain);
    gain.connect(this.audioContext.destination);
    source.start();
  }

  resolveStepSurface() {
    if (this.state.location.scene === "ship") {
      if (this.state.location.zone === "gangplank") {
        return "plank";
      }
      return "deck";
    }

    if (this.state.location.zone === "dock") {
      return "sand";
    }

    if (
      this.state.location.currentHarbor === "San Juan"
      && (this.state.location.zone === "town" || this.state.location.zone === "merchant" || this.state.location.zone === "tavern")
    ) {
      return "grass";
    }

    return "concrete";
  }

  speakAndLog(line) {
    this.log(line);
    this.announce(line);
  }

  log(line) {
    const p = document.createElement("p");
    p.textContent = line;
    this.ui.log.prepend(p);

    while (this.ui.log.childElementCount > 70) {
      this.ui.log.removeChild(this.ui.log.lastChild);
    }
  }

  tickLoop() {
    let last = performance.now();

    const step = (now) => {
      const delta = (now - last) / 1000;
      last = now;

      if (this.state.mode === "playing") {
        this.progressVoyage(delta);
        this.updateStatus();
        this.updateGoodsPanel();
      }

      requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }

  makeOptionRow(text, onClick, focused) {
    const option = document.createElement("div");
    option.className = "option-row";
    option.setAttribute("role", "option");
    option.tabIndex = -1;
    option.textContent = text;
    option._disabled = false;
    option.addEventListener("click", async () => {
      if (option._disabled) {
        return;
      }
      if (this.state.mode === "playing") {
        await this.ensureAudioSafe();
      }
      onClick();
    });
    if (focused) {
      setTimeout(() => option.focus(), 0);
    }
    return option;
  }

  renderMenuButtons(actions, container) {
    container.innerHTML = "";
    this.menuItems = [];

    actions.forEach((action) => {
      const button = this.makeOptionRow(action.label, action.click, false);
      if (action.disabled) {
        this.setOptionDisabled(button, true);
      }
      button.addEventListener("focus", () => {
        const idx = this.menuItems.findIndex((item) => item.button === button);
        if (idx >= 0) {
          this.state.menuIndex = idx;
          this.applyMenuHighlight();
          this.announceHint(action.label);
        }
      });

      this.menuItems.push({ button, label: action.label });
      container.appendChild(button);
    });

    const firstEnabled = this.menuItems.findIndex((item) => !item.button._disabled);
    this.state.menuIndex = firstEnabled >= 0 ? firstEnabled : 0;
    this.applyMenuHighlight();
    this.syncMenuFocus();
  }

  applyMenuHighlight() {
    this.menuItems.forEach((item, idx) => {
      item.button.classList.toggle("primary", idx === this.state.menuIndex);
    });
  }

  syncMenuFocus() {
    if (!this.menuItems.length) {
      return;
    }

    if (this.menuItems[this.state.menuIndex].button._disabled) {
      const enabled = this.menuItems.findIndex((item) => !item.button._disabled);
      this.state.menuIndex = enabled >= 0 ? enabled : 0;
    }

    this.applyMenuHighlight();
    const selected = this.menuItems[this.state.menuIndex];
    selected.button.focus();
    this.announceHint(selected.label);
  }

  setOptionDisabled(option, disabled) {
    option._disabled = disabled;
    option.setAttribute("aria-disabled", disabled ? "true" : "false");
  }

  capturePanelOptions(container) {
    const rows = Array.from(container.querySelectorAll(".option-row"));
    this.menuItems = rows.map((row) => ({ button: row, label: row.textContent || "option" }));
    const firstEnabled = this.menuItems.findIndex((item) => !item.button._disabled);
    this.state.menuIndex = firstEnabled >= 0 ? firstEnabled : 0;
    this.syncMenuFocus();
  }

  moveOptionSelection(dir) {
    if (!this.menuItems.length) {
      return;
    }
    let next = this.state.menuIndex;
    for (let i = 0; i < this.menuItems.length; i += 1) {
      next = (next + dir + this.menuItems.length) % this.menuItems.length;
      if (!this.menuItems[next].button._disabled) {
        this.state.menuIndex = next;
        this.syncMenuFocus();
        return;
      }
    }
  }

  activateCurrentOption() {
    if (!this.menuItems.length) {
      return;
    }
    const selected = this.menuItems[this.state.menuIndex];
    if (selected.button._disabled) {
      return;
    }
    selected.button.click();
  }

  announce(text) {
    if (!this.ui.srAnnouncer) {
      return;
    }
    this.ui.srAnnouncer.textContent = "";
    setTimeout(() => {
      this.ui.srAnnouncer.textContent = text;
    }, 10);
  }

  announceHint(text) {
    if (!this.ui.srHint) {
      return;
    }
    this.ui.srHint.textContent = "";
    setTimeout(() => {
      this.ui.srHint.textContent = text;
    }, 10);
  }

  focusShell() {
    if (this.ui.shell) {
      this.ui.shell.focus();
    }
  }

  totalCargoCapacity() {
    return this.state.player.ship.cargoBase + this.state.player.ship.cargoBonus;
  }

  currentCargoLoad() {
    return GOODS.reduce((sum, good) => sum + this.state.player.cargo[good], 0);
  }

  routeDistance(from, to) {
    const a = HARBORS[from].world;
    const b = HARBORS[to].world;
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) * 2.2;
  }

  routeHeading(from, to) {
    const a = HARBORS[from].world;
    const b = HARBORS[to].world;
    const dx = b.x - a.x;
    const dy = b.y - a.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? "East" : "West";
    }
    return dy > 0 ? "North" : "South";
  }

  distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new CaribbeanDanger();
});
