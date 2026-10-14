// Carousel2 - the cabinet and a large image of the selected table over a row of wheels.
//
// This file does four things, in this order: read the options, draw the list, draw the
// selection, and hand every message to core. The list is the row of wheels. Input, audio,
// preloading, the loading indicator, attract mode, turning the page for a sideways screen
// and the backglass and score view pages are core's.

const vpin = new VPinFECore();
window.vpin = vpin;                  // core and its overlays look for this name
window.receiveEvent = receiveEvent;  // core delivers every message through this one

start();

async function start() {
  vpin.init();
  await vpin.ready;                  // the tables, the options and the layout are in

  // Input. Core moves the wheel, pages it and opens the menu and the collection picker.
  // The one action it leaves to a theme is select, because launching is the theme's call.
  vpin.registerInputHandler((action) => {
    if (action === "select") vpin.launchTable(vpin.getCurrentTableIndex());
  });

  window.addEventListener("resize", () => draw());
  draw();
  document.body.dataset.ready = "true";
}

// --- 1. Options ---------------------------------------------------------------------
// options.json declares them and carries their defaults; core merges in what the person
// chose. Read them where they are used so the value always matches what the person set.

function option(key, fallback) {
  const value = vpin.themeConfig ? vpin.themeConfig[key] : undefined;
  return value === undefined ? fallback : value;
}

// maingfx keeps its 2.x values, so a choice made before 3.0 still means the same thing.
const MAIN_KINDS = {
  bg: "backglass",
  fss: "playfield_fss",
  table: "playfield",
  wheel: "wheel",
  cab: "cab",
  dmd: "scoreview",
};

// --- 2. The list --------------------------------------------------------------------
// activeList() is the list core is moving: the tables, or the collections while the picker
// is open. indexAfter(n) is core's wrap-around: it is the reason this file has no modulo.

const wheelsEl = document.getElementById("wheels");

// One wheel takes its width plus the gap; the selected one is centered, with as many on
// each side as fit. An odd count keeps the selected wheel in the middle.
function wheelsAcross(list) {
  const cell = window.innerWidth * 0.07 + 30;
  let count = Math.max(1, Math.floor(wheelsEl.clientWidth / cell));
  if (count % 2 === 0) count -= 1;
  return Math.min(Math.max(count, 1), list.length);
}

function drawList(list) {
  const shown = wheelsAcross(list);
  const before = Math.floor((shown - 1) / 2);

  wheelsEl.replaceChildren();
  for (let offset = -before; offset < shown - before; offset++) {
    const index = list.indexAfter(offset);
    const item = list.items[index];
    const picking = list.kind === "collection";
    const label = picking ? item.label : item.game.name;
    const url = picking
      ? item.image_url || (item.game_wheel_urls || [])[0]
      : item.media.includes("wheel") && vpin.getImageURL(index, "wheel");
    const cell = document.createElement("li");
    if (offset === 0) cell.setAttribute("aria-current", "true");

    if (url) {
      const img = document.createElement("img");
      img.src = url;
      img.alt = label;
      cell.appendChild(img);
    } else {
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = label;
      cell.appendChild(name);
    }
    wheelsEl.appendChild(cell);
  }
}

// --- 3. The selection ---------------------------------------------------------------
// Everything about the selected table is on its entry: entry.game is the game and
// entry.media lists the kinds of art that have a file. Both panes show a still: the art
// is drawn here instead of by a data-vpin-media element because core's choice for that
// element is the video whenever there is one, and this theme shows pictures.

const cabEl = document.getElementById("cab");
const mainEl = document.getElementById("main");
const emptyEl = document.getElementById("empty");

function drawPane(pane, url, label) {
  pane.replaceChildren();
  if (url) {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    pane.appendChild(img);
  } else {
    const name = document.createElement("p");
    name.className = "missing";
    name.textContent = label;
    pane.appendChild(name);
  }
}

// A table has a picture of each kind it has a file for. A collection in the picker has one
// picture, in the big pane only.
function paneURL(list, kind) {
  const have = list.current.media;
  // getImageURL has no FSS fallback, so a table with only an FSS picture is asked for it.
  const found = have.includes(kind) ? kind
    : kind === "playfield" && have.includes("playfield_fss") ? "playfield_fss" : "";
  return found ? vpin.getImageURL(list.cursor, found) : "";
}

function drawCollection(row) {
  drawPane(cabEl, "", "");
  drawPane(mainEl, row.image_url || (row.game_wheel_urls || [])[0] || "", row.label);
}

function drawSelection(list) {
  const empty = list.length === 0;
  emptyEl.hidden = !empty;
  emptyEl.textContent = vpin.t("frontend.theme.no_tables_found", "No tables found");
  if (empty) {
    cabEl.replaceChildren();
    mainEl.replaceChildren();
    wheelsEl.replaceChildren();
    return;
  }

  if (list.kind === "collection") {
    drawCollection(list.current);
    return;
  }

  const name = list.current.game.name;
  drawPane(cabEl, paneURL(list, "cab"), name);
  drawPane(mainEl, paneURL(list, MAIN_KINDS[option("maingfx", "bg")] || "backglass"), name);
}

// --- 4. Messages --------------------------------------------------------------------
// Core needs to see every message first: it keeps the selection, the audio and the
// loading indicator in step with them. After that the theme draws.
//
// TableIndexUpdate is the wheel moving. TableDataChange is a new list, and core has
// already filled in message.index by the time handleEvent returns.

async function receiveEvent(message) {
  await vpin.handleEvent(message);

  if (message.type === "TableIndexUpdate" || message.type === "TableDataChange") {
    draw();
  }
}

function draw() {
  const list = vpin.activeList();
  drawSelection(list);
  if (list.length > 0) drawList(list);
}
