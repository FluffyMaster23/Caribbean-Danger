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
    world: { x: 0, y: 0 },
    dock: { x: 0, y: 8 },
    mooring: { x: 0, y: 7 },
    soldGoods: ["wood", "grain"],
    harborAmbience: "sounds/harbors/san_juan.wav",
    townAmbience: "sounds/harbors/town_san_juan.wav"
  },
  "Puerto Plata": {
    world: { x: 0, y: 8 },
    dock: { x: 0, y: 8 },
    mooring: { x: 0, y: 7 },
    soldGoods: ["tobacco", "rum"],
    harborAmbience: "sounds/harbors/puerto_plata.wav"
  },
  Princapolca: {
    world: { x: 5, y: -7 },
    dock: { x: 0, y: 8 },
    mooring: { x: 0, y: 7 },
    soldGoods: ["tobacco", "grain"],
    harborAmbience: "sounds/harbors/princapolca.wav"
  },
  Cartagena: {
    world: { x: 0, y: -8 },
    dock: { x: 0, y: 8 },
    mooring: { x: 0, y: 7 },
    soldGoods: ["rum", "tobacco"],
    harborAmbience: "sounds/harbors/cartagena.wav"
  },
  Curacao: {
    world: { x: -4, y: -7 },
    dock: { x: 0, y: 8 },
    mooring: { x: 0, y: 7 },
    soldGoods: ["grain", "rum"],
    harborAmbience: "sounds/harbors/curacao.wav"
  },
  Kingstown: {
    world: { x: -7, y: -4 },
    dock: { x: 0, y: 8 },
    mooring: { x: 0, y: 7 },
    soldGoods: ["grain", "wood"],
    harborAmbience: "sounds/harbors/kingstown.wav"
  },
  Camarco: {
    world: { x: -8, y: 0 },
    dock: { x: 0, y: 8 },
    mooring: { x: 0, y: 7 },
    soldGoods: ["wood", "rum"],
    harborAmbience: "sounds/harbors/camarco.wav"
  },
  "Spring Point": {
    world: { x: -7, y: 5 },
    dock: { x: 0, y: 8 },
    mooring: { x: 0, y: 7 },
    soldGoods: ["wood", "tobacco"],
    harborAmbience: "sounds/harbors/spring_point.wav"
  }
};

const HARBOR_COMMON_ZONES = [
  { id: "dock", x: 0, y: 8, radius: 2, label: "Gangplank and dock entrance" },
  { id: "town", x: 8, y: 10, radius: 3, label: "Town approach" },
  { id: "merchant", x: 10, y: 15, radius: 2, label: "Merchant" },
  { id: "tavern", x: 10, y: 20, radius: 2, label: "Tavern" },
  { id: "shipyard", x: 15, y: 25, radius: 2, label: "Shipyard" },
  { id: "mission", x: 40, y: 45, radius: 2, label: "Mission hut" },
  { id: "treasure", x: 20, y: 40, radius: 2, label: "Treasure location" }
];

function getHarborZones(harbor) {
  const soldGoods = HARBORS[harbor].soldGoods;

  return [
    ...HARBOR_COMMON_ZONES,
    { id: `goods-${soldGoods[0]}`, x: -6, y: 4, radius: 0.4, label: soldGoods[0], good: soldGoods[0] },
    { id: `goods-${soldGoods[1]}`, x: -5, y: 4, radius: 0.4, label: soldGoods[1], good: soldGoods[1] },
    { id: "goodsApproach", x: -6, y: 5, radius: 2, label: "Crates with goods" }
  ];
}

const SHIP_DECK_ZONES = [
  { id: "wheel", x: 2, y: 1, radius: 1, label: "Captain's wheel" },
  { id: "mast", x: 1, y: 3, radius: 0.4, label: "Main mast" },
  { id: "cargoHatch", x: 3, y: 8, radius: 0.4, label: "stairs to cargo hatch" },
  { id: "crew", x: 2, y: 9, radius: 1, label: "Crew area" },
  { id: "gangplank", x: 2, y: 11, radius: 1, label: "Ship gangplank" }
];

const SHIP_HOLD_ZONES = [
  { id: "cargoHatch", x: 3, y: 9, box: { minX: 3, maxX: 3, minY: 8, maxY: 10 }, label: "stairs to cargo hatch" },
  { id: "cargoHold", x: 1.5, y: 9.5, box: { minX: 0, maxX: 3, minY: 8, maxY: 11 }, label: "cargo hold" }
];

function getShipZones(shipLevel) {
  return shipLevel === "hold" ? SHIP_HOLD_ZONES : SHIP_DECK_ZONES;
}

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
    const encodedPath = encodeURI(path);

    try {
      const response = await fetch(encodedPath);
      if (!response.ok) {
        throw new Error(`Fetch failed for ${encodedPath}`);
      }
      return await response.arrayBuffer();
    } catch (error) {
      return await new Promise((resolve, reject) => {
        const req = new XMLHttpRequest();
        req.open("GET", encodedPath, true);
        req.responseType = "arraybuffer";
        req.onload = () => {
          if (req.status === 200 || req.status === 0) {
            resolve(req.response);
          } else {
            reject(new Error(`XHR failed for ${encodedPath}`));
          }
        };
        req.onerror = () => reject(new Error(`XHR error for ${encodedPath}`));
        req.send();
      });
    }
  }

  async playLoop(key, path, gainValue = 0.45) {
    if (!path) {
      return;
    }
    const activeTrack = this.active.get(key);
    if (activeTrack && activeTrack.path === path) {
      this.setGain(key, gainValue, 0.1);
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
    this.active.set(key, { source, gain, path });
  }

  async crossfade(key, path, targetGain = 0.45, time = 1.2) {
    const oldTrack = this.active.get(key);
    if (oldTrack && oldTrack.path === path) {
      this.setGain(key, targetGain, Math.max(0.05, time * 0.5));
      return;
    }

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

    this.active.set(key, { source, gain, path });
  }

  setGain(key, gainValue, time = 0.15) {
    const track = this.active.get(key);
    if (!track) {
      return;
    }

    const now = this.context.currentTime;
    track.gain.gain.cancelScheduledValues(now);
    track.gain.gain.linearRampToValueAtTime(gainValue, now + time);
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

class FootstepManager {
  constructor(context, loader) {
    this.context = context;
    this.loader = loader;
    this.master = this.context.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.context.destination);
    this.lastStepAt = 0;
  }

  setMasterGain(value, time = 0.12) {
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.linearRampToValueAtTime(this.clamp(value, 0, 1), now + time);
  }

  async playSample(path, gainValue = 0.14, minIntervalMs = 170) {
    const nowMs = performance.now();
    if (nowMs - this.lastStepAt < minIntervalMs) {
      return true;
    }

    const buffer = await this.loader(path);
    if (!buffer) {
      return false;
    }

    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    gain.gain.value = gainValue;
    source.connect(gain);
    gain.connect(this.master);
    source.start();
    this.lastStepAt = nowMs;
    return true;
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
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
    this.footstepManager = null;
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
    this.currentShipAmbiencePath = null;
    this.lastZoneKey = null;
    this.lastNamedZone = {
      id: "wheel",
      name: "Captain's wheel",
      scene: "ship",
      shipLevel: "deck"
    };
    this.pendingLoadSelection = null;
    this.arrowKeyTimes = {
      arrowup: 0,
      arrowdown: 0,
      arrowleft: 0,
      arrowright: 0,
      pageup: 0,
      pagedown: 0
    };

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
        shipLevel: "deck",
        currentHarbor: "San Juan",
        x: 2,
        y: 1,
        zone: "wheel",
        zoneLabel: "Captain's wheel",
        zoneData: null
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
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "pageup", "pagedown", "enter", "b", "c", "d", "g", "p", "t", "v", "escape"].includes(key)) {
        event.preventDefault();
      }

      if ((key === "arrowup" || key === "arrowdown" || key === "pageup" || key === "pagedown") && !this.allowArrowStep(key, event.repeat)) {
        return;
      }

      if (this.state.mode === "menu") {
        this.handleMenuInput(key);
        return;
      }

      if (this.state.mode !== "playing") {
        return;
      }

      await this.ensureAudioSafe();

      if (this.pendingLoadSelection) {
        if (key === "arrowup") {
          this.adjustLoadSelection(1);
          return;
        }
        if (key === "arrowdown") {
          this.adjustLoadSelection(-1);
          return;
        }
        if (key === "enter") {
          this.confirmLoadSelection();
          return;
        }
        if (key === "escape") {
          this.cancelLoadSelection();
          return;
        }
      }

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
        return;
      }

      if (key === "pageup" || key === "pagedown") {
        await this.movePlayer(key);
        return;
      }

      if (key === "b") {
        this.speakAndLog(this.describeLocation());
        return;
      }

      if (key === "c") {
        this.speakAndLog(`Coordinates ${this.state.location.x}, ${this.state.location.y}.`);
        return;
      }

      if (key === "d" && this.state.sea.inProgress) {
        this.speakAndLog(this.describeSeaDistance());
        return;
      }

      if (key === "g") {
        this.speakAndLog(`${this.state.player.gold} gold.`);
        return;
      }

      if (key === "p") {
        this.speakAndLog(`${this.state.player.victoryPoints} victory points.`);
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
        await this.movePlayer(key);
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
    this.footstepManager = new FootstepManager(this.audioContext, (path) => this.ambientManager.load(path));

    await this.updateShipAmbienceForLocation();
    await this.updateAmbienceForLocation();

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
    this.log("Audio engine ready.");
  }

  setFootstepsVolume(value) {
    if (!this.footstepManager) {
      return;
    }
    this.footstepManager.setMasterGain(value);
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
    this.lastZoneKey = null;
    this.transitionSpeech = null;
    this.transitionSpeechSourceKey = null;
    this.pendingLoadSelection = null;
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
    this.pendingLoadSelection = null;
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
    if (!this.state.location.shipLevel) {
      this.state.location.shipLevel = "deck";
    }
    this.state.mode = "playing";
    this.state.inPanel = null;
    this.activeSaveSlot = slot;
    this.lastZoneKey = null;
    this.transitionSpeech = null;
    this.transitionSpeechSourceKey = null;
    this.pendingLoadSelection = null;

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

  async movePlayer(key) {
    if (this.state.location.scene === "ship" && key === "pagedown") {
      if (
        this.state.location.shipLevel === "deck"
        && (
          this.state.location.zone === "cargoHatch"
          || (this.state.location.x === 3 && this.state.location.y === 7)
        )
      ) {
        this.state.location.shipLevel = "hold";
        this.state.location.x = 3;
        this.state.location.y = 8;
        this.updateZone();
        this.updateStatus();
        this.updateGoodsPanel();
        this.updateShipAmbienceForLocation();
        await this.playFootstep("plank");
      } else if (this.state.location.shipLevel === "hold" && this.state.location.x === 3 && this.state.location.y < 11) {
        this.state.location.y += 1;
        this.updateZone();
        this.updateStatus();
        this.updateGoodsPanel();
        this.updateShipAmbienceForLocation();
        await this.playFootstep("plank");
        if (this.state.location.y === 11) {
          this.announce("cargo hold");
        }
      }
      return;
    }

    if (this.state.location.scene === "ship" && key === "pageup") {
      if (this.state.location.shipLevel === "hold" && this.state.location.x === 3 && this.state.location.y > 8) {
        this.state.location.y -= 1;
        this.updateZone();
        this.updateStatus();
        this.updateGoodsPanel();
        this.updateShipAmbienceForLocation();
        await this.playFootstep("plank");
      } else if (
        this.state.location.shipLevel === "hold"
        && this.state.location.x === 3
        && this.state.location.y === 8
        && (this.state.location.zone === "cargoHatch" || this.state.location.zone === "cargoHold")
      ) {
        this.state.location.shipLevel = "deck";
        this.state.location.x = 3;
        this.state.location.y = 7;
        this.updateZone();
        this.updateStatus();
        this.updateGoodsPanel();
        this.updateShipAmbienceForLocation();
        await this.playFootstep("plank");
        this.announce("main deck");
      }
      return;
    }

    const delta = { x: 0, y: 0 };
    if (key === "arrowup") {
      delta.y -= 1;
    }
    if (key === "arrowdown") {
      delta.y += 1;
    }
    if (key === "arrowleft") {
      delta.x -= 1;
    }
    if (key === "arrowright") {
      delta.x += 1;
    }

    if (this.state.location.scene === "ship" && (key === "arrowup" || key === "arrowdown")) {
      if (this.state.location.shipLevel === "hold") {
        if (this.state.location.zone === "cargoHatch") {
          return;
        }
      }
    }

    if ((key === "pageup" || key === "pagedown") && this.state.location.scene !== "ship") {
      return;
    }

    const movingSouth = delta.y > 0;
    const movingNorth = delta.y < 0;

    const bounds = this.state.location.scene === "harbor"
      ? { minX: -25, maxX: 24, minY: -25, maxY: 24 }
      : (this.state.location.shipLevel === "hold"
        ? { minX: 0, maxX: 3, minY: 8, maxY: 11 }
        : { minX: 0, maxX: 3, minY: 0, maxY: 11 });

    if (
      this.state.location.scene === "ship"
      && !this.state.sea.inProgress
      && this.state.location.zone === "gangplank"
      && movingSouth
    ) {
      const harborData = HARBORS[this.state.location.currentHarbor];
      this.state.location.scene = "harbor";
      this.state.location.shipLevel = "deck";
      this.state.location.x = harborData.dock.x;
      this.state.location.y = harborData.dock.y;
      this.updateZone();
      this.updateStatus();
      this.playFootstep("plank");
      this.speakAndLog(`Entering ${this.state.location.currentHarbor} dock.`);
      return;
    }

    const harborData = HARBORS[this.state.location.currentHarbor];
    const atHarborDock = this.state.location.scene === "harbor"
      && this.distance(this.state.location, harborData.dock) <= 2.05;

    if (
      atHarborDock
      && movingNorth
      && !this.state.sea.inProgress
    ) {
      this.state.location.scene = "ship";
      this.state.location.shipLevel = "deck";
      this.state.location.x = 2;
      this.state.location.y = 11;
      this.updateZone();
      this.updateStatus();
      this.updateGoodsPanel();
      this.updateShipAmbienceForLocation();
      await this.playFootstep("plank");
      this.log("You return to your ship.");
      return;
    }

    const previousX = this.state.location.x;
    const previousY = this.state.location.y;
    const previousShipY = this.state.location.y;

    this.state.location.x = this.clamp(this.state.location.x + delta.x, bounds.minX, bounds.maxX);
    this.state.location.y = this.clamp(this.state.location.y + delta.y, bounds.minY, bounds.maxY);

    const moved = this.state.location.x !== previousX || this.state.location.y !== previousY;
    if (!moved) {
      return;
    }

    this.updateZone();
    this.updateStatus();
    this.updateGoodsPanel();
    this.updateShipAmbienceForLocation();
    const shipStepSurface = this.state.location.scene === "ship"
      ? ((previousShipY >= 8 || this.state.location.y >= 8) ? "plank" : "deck")
      : null;
    await this.playFootstep(shipStepSurface);
  }

  updateZone() {
    const zones = this.state.location.scene === "harbor"
      ? getHarborZones(this.state.location.currentHarbor)
      : getShipZones(this.state.location.shipLevel);
    let nearest = null;
    for (const zone of zones) {
      const inBox = zone.box
        ? this.state.location.x >= zone.box.minX
          && this.state.location.x <= zone.box.maxX
          && this.state.location.y >= zone.box.minY
          && this.state.location.y <= zone.box.maxY
        : false;
      const d = zone.box ? 0 : this.distance(this.state.location, zone);
      if (inBox || (zone.radius && d <= zone.radius)) {
        nearest = zone;
        break;
      }
    }

    this.state.location.zone = nearest ? nearest.id : "open";
    this.state.location.zoneLabel = nearest ? nearest.label : "Open area";
    this.state.location.zoneData = nearest;

    if (this.state.location.zone !== "open") {
      const explicitName = this.getZoneSpeechText() || this.state.location.zoneLabel;
      this.lastNamedZone = {
        id: this.state.location.zone,
        name: explicitName,
        scene: this.state.location.scene,
        shipLevel: this.state.location.shipLevel
      };
    }

    const currentZoneKey = `${this.state.location.scene}:${this.state.location.zone}`;
    const currentZoneSpeech = this.getZoneSpeechText();
    const previousZoneSpeech = this.getPreviousZoneSpeechText();

    if (this.lastZoneKey !== null && this.lastZoneKey !== currentZoneKey) {
      if (previousZoneSpeech) {
        this.announce(`leaving ${previousZoneSpeech}.`);
      }
      if (currentZoneSpeech) {
        this.announce(`${currentZoneSpeech}.`);
      }
    }

    this.lastZoneKey = currentZoneKey;

    const locationName = this.state.location.scene === "harbor"
      ? `${this.state.location.currentHarbor} harbor`
      : (this.state.sea.inProgress ? "ship at sea" : `ship docked at ${this.state.location.currentHarbor}`);

    const zoneLine = this.state.location.zoneLabel;
    this.ui.zoneText.innerHTML = [
      `<strong>Area:</strong> ${locationName}<br>`,
      `<strong>Zone:</strong> ${zoneLine}<br>`,
      `<strong>Coordinates:</strong> <span class="mono">${this.state.location.x}, ${this.state.location.y}</span>`
    ].join("");

    this.updateAmbienceForLocation();
    this.updateShipAmbienceForLocation();
  }

  interactWithZone() {
    const zone = this.state.location.zone;
    const harborData = HARBORS[this.state.location.currentHarbor];
    const atHarborDock = this.state.location.scene === "harbor"
      && this.distance(this.state.location, harborData.dock) <= 2.05;

    if (this.state.location.scene === "ship" && zone === "gangplank" && !this.state.sea.inProgress) {
      this.state.location.scene = "harbor";
      this.state.location.shipLevel = "deck";
      this.state.location.x = harborData.dock.x;
      this.state.location.y = harborData.dock.y;
      this.updateZone();
      this.updateStatus();
      this.log(`You cross the gangplank into ${this.state.location.currentHarbor}.`);
      this.speakAndLog(`Entering ${this.state.location.currentHarbor} harbor.`);
      return;
    }

    if (this.state.location.scene === "harbor" && (zone === "dock" || atHarborDock)) {
      this.state.location.scene = "ship";
      this.state.location.shipLevel = "deck";
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

    if (this.state.location.scene === "harbor" && zone === "goodsApproach") {
      this.announce("Crates with goods.");
      return;
    }

    if (this.state.location.scene === "harbor" && this.state.location.zoneData && this.state.location.zoneData.good) {
      this.loadGoodFromCrates(this.state.location.zoneData.good);
      return;
    }

    if (this.state.location.scene === "ship" && zone === "cargoHold") {
      if (this.state.sea.inProgress || this.currentCargoLoad() <= 0) {
        this.announce("no goods loaded yet.");
        return;
      }

      this.openTradePanel();
    }
  }

  openTradePanel() {
    this.closePanels();
    this.state.inPanel = "trade";
    this.ui.tradePanel.classList.remove("hidden");

    const harbor = this.state.location.currentHarbor;
    const soldGoods = HARBORS[harbor].soldGoods;
    const cargoLoad = this.currentCargoLoad();
    const cargoCap = this.totalCargoCapacity();
    const cargoSpace = Math.max(0, cargoCap - cargoLoad);

    this.ui.tradeInfo.innerHTML = [
      `<strong>Harbor:</strong> ${harbor}<br>`,
      `<strong>Sold Here:</strong> ${soldGoods.join(", ")}<br>`,
      `<strong>Cargo Capacity:</strong> ${cargoLoad} / ${cargoCap} (${cargoSpace} free)<br>`,
      `<strong>Loading:</strong> Go to the crates with the specific good.<br>`,
      `<strong>Special Event:</strong> ${this.state.specialEvent || "none"}`
    ].join("");

    this.ui.tradeActions.innerHTML = "";

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

  loadGoodFromCrates(good) {
    const harbor = this.state.location.currentHarbor;
    if (!HARBORS[harbor].soldGoods.includes(good)) {
      this.log(`${good} is not sold at ${harbor}.`);
      return;
    }

    if (this.state.location.scene !== "harbor") {
      this.log(`Move to the crates for ${good}.`);
      return;
    }

    const zone = this.state.location.zoneData;
    if (!zone || zone.good !== good) {
      this.log(`Move onto the ${good} crate to load it.`);
      return;
    }

    const price = this.calculateBuyPrice(harbor, good);
    const maxQuantity = this.maxPurchasableQuantity(good, price);

    if (maxQuantity <= 0) {
      this.log("Cargo hold is full.");
      return;
    }

    this.pendingLoadSelection = {
      good,
      harbor,
      price,
      maxQuantity,
      quantity: Math.max(1, Math.min(maxQuantity, 1))
    };

    this.announceHint(`Loading ${good} crates. Use up and down arrows to choose how many to load, from 1 to ${maxQuantity}. Enter confirms. Escape cancels.`);
    this.announce(`${good} crates. ${this.pendingLoadSelection.quantity} selected of ${maxQuantity}.`);
    this.log(`Loading ${good} crates. Choose quantity with up and down arrows.`);
  }

  adjustLoadSelection(delta) {
    if (!this.pendingLoadSelection) {
      return;
    }

    const nextQuantity = this.clamp(this.pendingLoadSelection.quantity + delta, 1, this.pendingLoadSelection.maxQuantity);
    this.pendingLoadSelection.quantity = nextQuantity;
    this.announce(`${this.pendingLoadSelection.good} crates. ${nextQuantity} selected of ${this.pendingLoadSelection.maxQuantity}.`);
  }

  confirmLoadSelection() {
    if (!this.pendingLoadSelection) {
      return;
    }

    const selection = this.pendingLoadSelection;
    const totalPrice = selection.price * selection.quantity;

    if (this.state.player.gold < totalPrice) {
      this.announce("Not enough gold.");
      this.pendingLoadSelection = null;
      return;
    }

    this.state.player.gold -= totalPrice;
    this.state.player.cargo[selection.good] += selection.quantity;
    this.pendingLoadSelection = null;

    this.log(`Loaded ${selection.quantity} ${selection.good} for ${totalPrice} gold.`);
    this.announce(`Loaded ${selection.quantity} ${selection.good}.`);
    this.updateStatus();
    this.updateGoodsPanel();
    this.updateZone();
  }

  cancelLoadSelection() {
    if (!this.pendingLoadSelection) {
      return;
    }

    const good = this.pendingLoadSelection.good;
    this.pendingLoadSelection = null;
    this.announce(`Cancelled loading ${good}.`);
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

    const harbors = this.getAvailableDestinations(this.state.location.currentHarbor);
    this.ui.sailInfo.innerHTML = [
      `<strong>From:</strong> ${this.state.location.currentHarbor}<br>`,
      `<strong>Choose Destination:</strong> Use up and down arrows, then Enter.<br>`,
      `<strong>Available Harbors:</strong> ${harbors.length}`
    ].join("");

    this.ui.sailActions.innerHTML = "";
    this.renderMenuButtons([
      ...harbors.map((harbor) => {
        const miles = this.routeDistance(this.state.location.currentHarbor, harbor).toFixed(1);
        const heading = this.routeClockDirection(this.state.location.currentHarbor, harbor);
        return {
          label: `${harbor}. ${heading}. ${miles} nautical miles.`,
          click: () => this.beginVoyage(harbor)
        };
      }),
      { label: "Leave wheel", click: () => this.closePanels() }
    ], this.ui.sailActions);
  }

  beginVoyage(destination) {
    const from = this.state.location.currentHarbor;
    const miles = this.routeDistance(from, destination);
    const speedKnots = this.computeVoyageSpeed();
    const travelSeconds = speedKnots > 0 ? miles / speedKnots : miles;

    this.state.sea = {
      inProgress: true,
      from,
      to: destination,
      totalMiles: miles,
      remainingMiles: miles,
      heading: this.routeHeading(from, destination),
      speedKnots,
      travelSecondsTotal: travelSeconds,
      travelSecondsLeft: travelSeconds
    };

    this.state.location.scene = "ship";
  this.state.location.shipLevel = "deck";
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

    const currentSpeed = this.computeVoyageSpeed();
    this.state.sea.speedKnots = currentSpeed;
    this.state.sea.remainingMiles = Math.max(0, this.state.sea.remainingMiles - currentSpeed * seconds);
    this.state.sea.travelSecondsLeft = currentSpeed > 0
      ? this.state.sea.remainingMiles / currentSpeed
      : this.state.sea.remainingMiles;

    if (Math.random() < 0.018 * seconds) {
      this.triggerSeaEvent();
    }

    if (this.state.sea.remainingMiles <= 0) {
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
    this.state.location.shipLevel = "deck";
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

    const effectiveZone = this.getEffectiveZoneForSpeech();
    const zoneName = effectiveZone.name;
    return `Current location: ${zoneName}.`;
  }

  describeSeaDistance() {
    const destination = this.state.sea.to;
    const bearing = this.routeClockDirection(this.state.sea.from, destination);
    return `${destination} at ${bearing}, ${this.state.sea.remainingMiles.toFixed(1)} nautical miles away.`;
  }

  getEffectiveZoneForSpeech() {
    if (this.state.location.zone !== "open") {
      return {
        id: this.state.location.zone,
        name: this.getZoneSpeechText() || this.state.location.zoneLabel || this.state.location.zone
      };
    }

    if (this.state.location.scene === "ship") {
      return {
        id: this.state.location.shipLevel === "hold" ? "cargoHold" : "mainDeck",
        name: this.state.location.shipLevel === "hold" ? "cargo hold" : "main deck"
      };
    }

    return {
      id: "open",
      name: `${this.state.location.currentHarbor} harbor`
    };
  }

  getZoneSpeechText() {
    if (this.state.location.scene === "harbor") {
      if (this.state.location.zone === "goodsApproach") {
        return "Crates with goods";
      }
      if (this.state.location.zoneData && this.state.location.zoneData.good) {
        return `${this.state.location.zoneData.good} crates`;
      }
      return this.state.location.zone === "open" ? null : (this.state.location.zoneLabel || null);
    }

    if (this.state.location.zone === "open") {
      return null;
    }

    if (this.state.location.zone === "cargoHold") {
      return "cargo hold";
    }

    if (this.state.location.zone === "cargoHatch") {
      return "stairs to cargo hatch";
    }

    return this.state.location.zoneLabel || null;
  }

  getPreviousZoneSpeechText() {
    if (!this.lastZoneKey) {
      return null;
    }

    const [scene, zone] = this.lastZoneKey.split(":");
    if (scene === "harbor") {
      if (zone === "goodsApproach") {
        return "Crates with goods";
      }
      const harborZones = getHarborZones(this.state.location.currentHarbor);
      const previousZone = harborZones.find((item) => item.id === zone);
      if (previousZone && previousZone.good) {
        return `${previousZone.good} crates`;
      }
      return previousZone ? previousZone.label : null;
    }

    const shipZone = [...SHIP_DECK_ZONES, ...SHIP_HOLD_ZONES].find((item) => item.id === zone);
    return shipZone ? shipZone.label : null;
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
    const cargoLoad = this.currentCargoLoad();
    const cargoCap = this.totalCargoCapacity();
    const cargoSpace = Math.max(0, cargoCap - cargoLoad);

    const sellLines = GOODS.map((good) => `${good}: ${this.calculateSellPrice(harbor, good)} gold`).join("<br>");
    const buyLines = sold.map((good) => `${good}: ${this.calculateBuyPrice(harbor, good)} gold`).join("<br>");
    const cargoLines = GOODS.map((good) => `${good}: ${this.state.player.cargo[good]}`).join("<br>");

    this.ui.goodsText.innerHTML = [
      `<strong>Harbor Market (${harbor})</strong><br>`,
      `<strong>Cargo Space:</strong> ${cargoLoad} / ${cargoCap} (${cargoSpace} free)<br><br>`,
      `<strong>Load at Crates:</strong><br>${buyLines || "No local goods listed."}<br><br>`,
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

  async updateShipAmbienceForLocation() {
    if (!this.ambientManager) {
      return;
    }

    if (this.state.location.scene !== "ship") {
      this.currentShipAmbiencePath = null;
      this.ambientManager.stop("ship");
      this.ambientManager.stop("ship-hold");
      return;
    }

    if (this.state.sea.inProgress) {
      await this.ambientManager.playLoop("ship", "sounds/ship/on deck.wav", 0.12);
      this.ambientManager.stop("ship-hold");
      return;
    }

    const holdProgress = this.getCargoHoldProgress();
    const deckGain = holdProgress > 0 ? this.clamp(0.2 - holdProgress * 0.15, 0.04, 0.2) : 0.2;
    const holdGain = holdProgress > 0 ? this.clamp(holdProgress * 0.24, 0, 0.24) : 0;

    await this.ambientManager.playLoop("ship", "sounds/ship/on deck.wav", deckGain);

    if (holdGain <= 0) {
      this.ambientManager.stop("ship-hold");
      return;
    }

    await this.ambientManager.playLoop("ship-hold", "sounds/ship/creaking_ship.wav", holdGain);
  }

  async playFootstep(surfaceOverride = null) {
    if (!this.footstepManager) {
      return;
    }

    const surface = surfaceOverride || this.resolveStepSurface();

    const pick = (min, max) => Math.floor(this.rand(min, max));
    let path;
    let minIntervalMs = 170;

    if (surface === "deck") {
      path = `sounds/steps/main deck/main deck${pick(1, 5)}.wav`;
    } else if (surface === "plank") {
      path = `sounds/steps/plank/plankstep${pick(1, 6)}.ogg`;
      minIntervalMs = 180;
    } else if (surface === "sand") {
      path = `sounds/steps/sand/sand${pick(1, 6)}.wav`;
      minIntervalMs = 220;
    } else if (surface === "grass") {
      // Grass files are not in the workspace yet; attempt grass path first, then fallback below.
      path = `sounds/steps/grass/grass${pick(1, 6)}.ogg`;
      minIntervalMs = 210;
    } else {
      path = `sounds/steps/concrete3/concretestep${pick(1, 9)}.ogg`;
      minIntervalMs = 185;
    }

    let played = await this.footstepManager.playSample(path, 0.14, minIntervalMs);
    if (!played && surface === "grass") {
      path = `sounds/steps/concrete3/concretestep${pick(1, 9)}.ogg`;
      played = await this.footstepManager.playSample(path, 0.14, 185);
    }
    if (!played) {
      if (!this.hasAudioLoadWarning) {
        this.hasAudioLoadWarning = true;
        this.log(`Audio file could not be loaded: ${path}. Use http://localhost serving to allow sound loading.`);
      }
      return;
    }
  }

  resolveStepSurface() {
    if (this.state.location.scene === "ship") {
      return this.state.location.shipLevel === "hold" ? "plank" : "deck";
    }

    // Harbor rule: only the designated town zone is concrete; all other harbor tiles are sand.
    if (this.state.location.zone === "town") {
      return "concrete";
    }

    return "sand";
  }

  getCargoHoldProgress() {
    if (this.state.location.scene !== "ship" || this.state.location.shipLevel !== "hold") {
      return 0;
    }

    return this.clamp((this.state.location.y - 8) / 3, 0, 1);
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
  }

  allowArrowStep(key, isRepeat = false) {
    const now = performance.now();
    const inMenu = this.state.mode === "menu";
    const inPanel = this.state.mode === "playing" && (this.state.inPanel === "trade" || this.state.inPanel === "sail" || this.state.inPanel === "save");
    const intervalMs = (inMenu || inPanel) ? 105 : 120;

    if (!isRepeat) {
      this.arrowKeyTimes[key] = now;
      return true;
    }

    if (!this.arrowKeyTimes[key] || now - this.arrowKeyTimes[key] >= intervalMs) {
      this.arrowKeyTimes[key] = now;
      return true;
    }
    return false;
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

  maxPurchasableQuantity(good, price) {
    const cargoSpace = Math.max(0, this.totalCargoCapacity() - this.currentCargoLoad());
    const goldLimit = Math.floor(this.state.player.gold / price);
    return Math.max(0, Math.min(cargoSpace, goldLimit));
  }

  currentCargoLoad() {
    return GOODS.reduce((sum, good) => sum + this.state.player.cargo[good], 0);
  }

  routeDistance(from, to) {
    const a = HARBORS[from].world;
    const b = HARBORS[to].world;
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  computeVoyageSpeed() {
    const baseTilesPerSecond = 2;
    const cargoWeightFactor = 1 - (this.currentCargoLoad() / Math.max(1, this.totalCargoCapacity())) * 0.25;
    const sailConditionFactor = this.state.player.ship.sails / 100;
    return Math.max(0.5, baseTilesPerSecond * cargoWeightFactor * sailConditionFactor);
  }

  getAvailableDestinations(from) {
    return Object.keys(HARBORS)
      .filter((harbor) => harbor !== from)
      .sort((left, right) => {
        const leftHour = this.routeClockHour(from, left);
        const rightHour = this.routeClockHour(from, right);
        if (leftHour !== rightHour) {
          return leftHour - rightHour;
        }
        return this.routeDistance(from, left) - this.routeDistance(from, right);
      });
  }

  routeClockHour(from, to) {
    const a = HARBORS[from].world;
    const b = HARBORS[to].world;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const angle = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
    const hour = Math.round(angle / 30) % 12;
    return hour === 0 ? 12 : hour;
  }

  routeClockDirection(from, to) {
    return `${this.routeClockHour(from, to)} o'clock`;
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
