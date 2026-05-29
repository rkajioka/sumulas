const STORAGE_KEY = "recentPdfUrls";
const MAX_LINKS = 5;

function getRecentLinks() {
  return new Promise((resolve) => {
    if (!chrome?.storage?.local) {
      resolve([]);
      return;
    }
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const list = result[STORAGE_KEY];
      resolve(Array.isArray(list) ? list : []);
    });
  });
}

function addRecentLink(url) {
  return new Promise((resolve) => {
    if (!chrome?.storage?.local || !url) {
      resolve();
      return;
    }
    getRecentLinks().then((list) => {
      const next = [url, ...list.filter((u) => u !== url)].slice(0, MAX_LINKS);
      chrome.storage.local.set({ [STORAGE_KEY]: next }, resolve);
    });
  });
}

function clearRecentLinks() {
  return new Promise((resolve) => {
    if (!chrome?.storage?.local) {
      resolve();
      return;
    }
    chrome.storage.local.remove(STORAGE_KEY, resolve);
  });
}

async function populateUrlDatalist(datalistEl) {
  if (!datalistEl) return;
  const links = await getRecentLinks();
  datalistEl.innerHTML = "";
  for (const url of links) {
    const opt = document.createElement("option");
    opt.value = url;
    datalistEl.appendChild(opt);
  }
}

if (typeof globalThis !== "undefined") {
  Object.assign(globalThis, {
    getRecentLinks,
    addRecentLink,
    clearRecentLinks,
    populateUrlDatalist,
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getRecentLinks,
    addRecentLink,
    clearRecentLinks,
    populateUrlDatalist,
  };
}
