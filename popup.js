const urlInput = document.getElementById("pdf-url");
const btnOpenUrl = document.getElementById("btn-open-url");
const statusEl = document.getElementById("status");
const recentUrls = document.getElementById("recent-urls");

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.className = isError ? "status status-error" : "status";
}

function openViewerWithUrl(url) {
  const viewerUrl =
    chrome.runtime.getURL("viewer.html") + "?url=" + encodeURIComponent(url);
  return chrome.tabs.create({ url: viewerUrl });
}

async function openPdfFromUrl(urlText) {
  let parsed;
  try {
    parsed = new URL(urlText.trim());
  } catch {
    throw new Error("Invalid URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Use an http or https link.");
  }

  await openViewerWithUrl(parsed.href);
}

btnOpenUrl.addEventListener("click", async () => {
  const url = urlInput.value.trim();
  if (!url) {
    setStatus("Paste a PDF link.", true);
    urlInput.focus();
    return;
  }

  setStatus("Opening viewer…");

  try {
    await openPdfFromUrl(url);
    window.close();
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Could not open the link.", true);
  }
});

urlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    btnOpenUrl.click();
  }
});

populateUrlDatalist(recentUrls);
