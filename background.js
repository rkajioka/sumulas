/** Service worker (Manifest V3). Intercepts CBF sumulas and loads in viewer. */

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  // Only intercept main frame navigations (not iframes)
  if (details.frameId === 0) {
    const urlObj = new URL(details.url);
    if ((urlObj.hostname.includes("conteudo.cbf.com.br") && urlObj.pathname.includes("/sumulas/")) ||
        (urlObj.hostname.includes("conteudo.fpf.org.br") && urlObj.pathname.includes("/sumulas/")) ||
        (urlObj.hostname.includes("sge.fmf.com.br") && urlObj.pathname.includes("/sumulas/")) ||
        (urlObj.hostname.includes("fafamapa.com.br") && urlObj.pathname.toLowerCase().endsWith(".pdf")) ||
        (urlObj.hostname.includes("fafamazonas.com.br") && urlObj.pathname.includes("/sumula")) ||
        (urlObj.hostname.includes("futebolcapixaba.com") && (urlObj.pathname.includes("/sumula") || urlObj.pathname.toLowerCase().endsWith(".pdf"))) ||
        (urlObj.hostname.includes("ferj360.com.br") && urlObj.pathname.includes("/carioca/uploads/")) ||
        (urlObj.hostname.includes("fgf.com.br") && urlObj.pathname.includes("/sumulas/")) ||
        (urlObj.hostname.includes("fnf.org.br") && urlObj.pathname.includes("/files"))) {
      const extensionUrl = chrome.runtime.getURL("viewer.html") + "?url=" + encodeURIComponent(details.url);
      chrome.tabs.update(details.tabId, { url: extensionUrl });
    }
  }
}, { 
  url: [
    { hostContains: "conteudo.cbf.com.br", pathContains: "/sumulas/" },
    { hostContains: "conteudo.fpf.org.br", pathContains: "/sumulas/" },
    { hostContains: "sge.fmf.com.br", pathContains: "/sumulas/" },
    { hostContains: "fafamapa.com.br", urlMatches: ".*\\.pdf" },
    { hostContains: "fafamazonas.com.br", pathContains: "/sumula" },
    { hostContains: "futebolcapixaba.com" },
    { hostContains: "ferj360.com.br", pathContains: "/carioca/uploads/" },
    { hostContains: "fgf.com.br", pathContains: "/sumulas/" },
    { hostContains: "fnf.org.br", pathContains: "/files" }
  ] 
});
