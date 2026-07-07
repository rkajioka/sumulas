/** Service worker (Manifest V3). Intercepts CBF sumulas and loads in viewer. */

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  // Only intercept main frame navigations (not iframes)
  if (details.frameId === 0 && details.url.includes("conteudo.cbf.com.br/sumulas/")) {
    const extensionUrl = chrome.runtime.getURL("viewer.html") + "?url=" + encodeURIComponent(details.url);
    chrome.tabs.update(details.tabId, { url: extensionUrl });
  }
}, { url: [{ hostContains: "conteudo.cbf.com.br", pathContains: "/sumulas/" }] });
