// Namespace
const asciidoctor = {};
asciidoctor.chrome = {};

let autoReloadInterval;

const AUTO_RELOAD_INTERVAL_TIME = 2000;
const ENABLE_RENDER_KEY = 'ENABLE_RENDER';
const ALLOW_TXT_EXTENSION_KEY = 'ALLOW_TXT_EXTENSION';

asciidoctor.chrome.asciidocify = function () {
  txtExtensionRegex = /\.txt[.|\?]?.*?$/;
  if (location.href.match(txtExtensionRegex)) {
    chrome.storage.local.get(ALLOW_TXT_EXTENSION_KEY, function (items) {
      const allowed = items[ALLOW_TXT_EXTENSION_KEY] === 'true';
      // Extension allows txt extension
      if (allowed) {
        loadContent();
      }
    });
  } else {
    loadContent();
  }
};

function loadContent() {
  $.ajax({
    beforeSend: function (xhr) {
      if (xhr.overrideMimeType) {
        xhr.overrideMimeType("text/plain;charset=utf-8");
      }
    },
    url: location.href,
    cache: false,
    complete: function (data) {
      if (isHtmlContentType(data)) {
        return;
      }
      asciidoctor.chrome.loadContent(data);
    }
  });
}

asciidoctor.chrome.loadContent = function (data) {
  chrome.storage.local.get(ENABLE_RENDER_KEY, function (items) {
    const enabled = items[ENABLE_RENDER_KEY];
    // Extension is enabled
    if (enabled) {
      appendStyles();
      appendMathJax();
      appendHighlightJsScript();
      asciidoctor.chrome.convert(data.responseText);
    }
    startAutoReload();
  });
};

function reloadContent(data) {
  chrome.storage.local.get(LIVERELOADJS_DETECTED_KEY, function (items) {
    const liveReloadJsDetected = items[LIVERELOADJS_DETECTED_KEY];
    // LiveReload.js has been detected
    if (!liveReloadJsDetected) {
      const key = 'md5' + location.href;
      chrome.storage.local.get(key, function (items) {
        const md5sum = items[key];
        if (md5sum && md5sum === md5(data)) {
          return;
        }
        // Content has changed...
        chrome.storage.local.get(ENABLE_RENDER_KEY, function (items) {
          const enabled = items[ENABLE_RENDER_KEY];
          // Extension is enabled
          if (enabled) {
            // Convert AsciiDoc to HTML
            asciidoctor.chrome.convert(data);
          } else {
            // Display plain content
            $(document.body).html(`<pre style="word-wrap: break-word; white-space: pre-wrap;">${$(document.body).text(data).html()}</pre>`);
          }
          // Update md5sum
          const value = {};
          value[key] = md5(data);
          chrome.storage.local.set(value);
        });
      });
    }
  });
}

function startAutoReload() {
  clearInterval(autoReloadInterval);
  autoReloadInterval = setInterval(function () {
    $.ajax({
      beforeSend: function (xhr) {
        if (xhr.overrideMimeType) {
          xhr.overrideMimeType("text/plain;charset=utf-8");
        }
      },
      url: location.href,
      cache: false,
      success: function (data) {
        reloadContent(data);
      }
    });
  }, AUTO_RELOAD_INTERVAL_TIME);
}

/**
 * Is the content type html ?
 * @param data The data
 * @return true if the content type is html, false otherwise
 */
function isHtmlContentType(data) {
  const contentType = data.getResponseHeader('Content-Type');
  return contentType && (contentType.indexOf('html') > -1);
}

(function () {
  asciidoctor.chrome.asciidocify();
}(document));
