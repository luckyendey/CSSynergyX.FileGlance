(function (window, document) {
  // --- Helpers to create a simple modal viewer ---
  var modalIds = {
    overlay: 'csfg-overlay',
    modal: 'csfg-modal',
    header: 'csfg-header',
    title: 'csfg-title',
    close: 'csfg-close',
    body: 'csfg-body'
  };

  function ensureStyles() {
    if (document.getElementById('csfg-styles')) return;
    var style = document.createElement('style');
    style.id = 'csfg-styles';
    style.type = 'text/css';
    style.textContent = [
      '#' + modalIds.overlay + '{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483000;display:none;}',
      '#' + modalIds.modal + '{position:fixed;top:5%;left:50%;transform:translateX(-50%);width:88vw;max-width:1200px;height:90vh;background:#fff;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.3);z-index:2147483001;display:none;overflow:hidden;}',
      '#' + modalIds.header + '{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e5e7eb;background:#f8fafc;}',
      '#' + modalIds.title + '{font:600 14px/1.4 system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '#' + modalIds.close + '{background:#ef4444;color:#fff;border:none;border-radius:4px;padding:6px 10px;font:600 12px/1 system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;cursor:pointer;}',
      '#' + modalIds.body + '{position:absolute;top:44px;bottom:0;left:0;right:0;background:#fff;overflow:auto;padding:0;}',
      '#' + modalIds.body + ' .csfg-center{display:flex;align-items:center;justify-content:center;height:100%;color:#6b7280;font:14px system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}',
      '#' + modalIds.body + ' iframe{border:0;width:100%;height:100%;}',
      '#' + modalIds.body + ' img{max-width:100%;height:auto;display:block;margin:0 auto;}',
      /* Image viewer specific */
      '#' + modalIds.body + ' .csfg-imgwrap{position:relative;width:100%;height:100%;overflow:auto;background:#fff;display:flex;align-items:center;justify-content:center;}',
      '#' + modalIds.body + ' .csfg-imgwrap img{max-width:none;display:block;margin:0;}',
      '#' + modalIds.body + ' .csfg-zoom-toolbar{position:absolute;top:8px;right:8px;background:rgba(248,250,252,.95);border:1px solid #e5e7eb;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.08);padding:4px;display:flex;gap:6px;z-index:2;}',
      '#' + modalIds.body + ' .csfg-zoom-toolbar button{background:#fff;border:1px solid #d1d5db;border-radius:4px;padding:4px 8px;font:600 12px system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;cursor:pointer;color:#111827;}',
      '#' + modalIds.body + ' .csfg-zoom-toolbar button:hover{background:#f3f4f6;}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function ensureModal() {
    ensureStyles();
    var overlay = document.getElementById(modalIds.overlay);
    var modal = document.getElementById(modalIds.modal);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = modalIds.overlay;
      overlay.onclick = hideModal;
      document.body.appendChild(overlay);
    }
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalIds.modal;
      var header = document.createElement('div'); header.id = modalIds.header;
      var title = document.createElement('div'); title.id = modalIds.title; title.textContent = '';
      var close = document.createElement('button'); close.id = modalIds.close; close.textContent = 'Close'; close.onclick = hideModal;
      header.appendChild(title); header.appendChild(close);
      var body = document.createElement('div'); body.id = modalIds.body; body.innerHTML = '<div class="csfg-center">Loading…</div>';
      modal.appendChild(header); modal.appendChild(body);
      document.body.appendChild(modal);
    }
    return modal;
  }

  function showModal(titleText) {
    var modal = ensureModal();
    document.getElementById(modalIds.title).textContent = titleText || '';
    document.getElementById(modalIds.body).innerHTML = '<div class="csfg-center">Loading…</div>';
    document.getElementById(modalIds.overlay).style.display = 'block';
    document.getElementById(modalIds.modal).style.display = 'block';
  }

  function hideModal() {
    var o = document.getElementById(modalIds.overlay);
    var m = document.getElementById(modalIds.modal);
    if (o) o.style.display = 'none';
    if (m) m.style.display = 'none';
  }

  function setModalContent(nodeOrHtml) {
    var body = document.getElementById(modalIds.body);
    if (!body) return;
    if (typeof nodeOrHtml === 'string') body.innerHTML = nodeOrHtml; else { body.innerHTML = ''; body.appendChild(nodeOrHtml); }
  }

  function showError(message) {
    setModalContent('<div class="csfg-center">' + (message || 'Unable to preview this file.') + '</div>');
  }

  // --- Dynamic script loading ---
  var loadedScripts = {};
  function loadScriptOnce(url) {
    return new Promise(function(resolve, reject){
      if (loadedScripts[url] === true) return resolve();
      if (loadedScripts[url] && loadedScripts[url].then) return loadedScripts[url].then(resolve, reject);
      var p = new Promise(function(res, rej){
        var s = document.createElement('script');
        s.src = url; s.async = true; s.onload = function(){ loadedScripts[url] = true; res(); };
        s.onerror = function(){ delete loadedScripts[url]; rej(new Error('Failed to load ' + url)); };
        document.head.appendChild(s);
      });
      loadedScripts[url] = p;
      p.then(resolve, reject);
    });
  }

  function loadScriptWithFallback(urls) {
    var i = 0;
    function next() {
      if (i >= urls.length) return Promise.reject(new Error('All script sources failed'));
      var url = urls[i++];
      return loadScriptOnce(url).catch(function(){ return next(); });
    }
    return next();
  }

  function getScriptBase(fileName) {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      if (src.toLowerCase().indexOf(fileName.toLowerCase()) >= 0) {
        var idx = src.lastIndexOf('/');
        if (idx > -1) return src.substring(0, idx + 1);
      }
    }
    // fallback to /docs/
    return '/docs/';
  }

  // --- File viewing logic ---
  function getExtFromName(name) {
    if (!name) return '';
    var q = name.split('?')[0];
    var f = q.split('#')[0];
    var i = f.lastIndexOf('.');
    return i >= 0 ? f.substring(i + 1).toLowerCase() : '';
  }

  function filenameFromLink(link) { // link: <a>
    if (!link) return '';
    var text = (link.textContent || link.innerText || '').trim();
    return text || '';
  }

  function buildViewUrl(href) {
    if (!href) return href;
    var replaced = false;
    var out = href.replace(/([?&])Download=1/i, function (m, p1) { replaced = true; return p1 + 'Download=0'; });
    if (!replaced) out += (out.indexOf('?') >= 0 ? '&' : '?') + 'Download=0';
    return out;
  }

  function fetchArrayBuffer(url) {
    return fetch(url, { credentials: 'same-origin' }).then(function(r){
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.arrayBuffer();
    });
  }

  function viewWithDocx(url) {
    var base = getScriptBase('CSSynergyX.FileGlance.js');
    var DOCX_LOCAL = base + 'docx-preview.js';
    var DOCX_CDN = 'https://unpkg.com/docx-preview@0.4.0/dist/docx-preview.min.js';
    var JSZIP_CDN = 'https://unpkg.com/jszip/dist/jszip.min.js';

    // Ensure JSZip is loaded first, then docx-preview
    return loadScriptOnce(JSZIP_CDN)
      .then(function(){ return loadScriptWithFallback([DOCX_LOCAL, DOCX_CDN]); })
      .then(function(){
        return fetchArrayBuffer(url).then(function(buf){
          var container = document.createElement('div');
          container.style.padding = '12px';
          setModalContent(container);
          // global `docx` is provided by docx-preview
          return window.docx && window.docx.renderAsync(buf, container, null, { inWrapper: true })
            .catch(function(){ showError('Failed to render DOCX'); });
        });
      });
  }

  function viewWithXlsx(url) {
    var XLSX_CDN = 'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js';
    return loadScriptOnce(XLSX_CDN).then(function(){
      return fetchArrayBuffer(url).then(function(buf){
        var data = new Uint8Array(buf);
        var wb = window.XLSX.read(data, { type: 'array' });
        // Render all sheets to HTML
        var html = '';
        for (var i = 0; i < wb.SheetNames.length; i++) {
          var name = wb.SheetNames[i];
          var ws = wb.Sheets[name];
          html += '<h3 style="font:600 13px system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:12px">' + name + '</h3>';
          html += window.XLSX.utils.sheet_to_html(ws, { editable: false });
        }
        var wrap = document.createElement('div');
        wrap.style.cssText = 'padding:0 12px 12px 12px;';
        wrap.innerHTML = html;
        setModalContent(wrap);
      });
    });
  }

  function viewInIframe(url) {
    var iframe = document.createElement('iframe');
    iframe.src = url;
    setModalContent(iframe);
    return Promise.resolve();
  }

  function viewAsImage(url) {
    var wrap = document.createElement('div');
    wrap.className = 'csfg-imgwrap';

    var toolbar = document.createElement('div');
    toolbar.className = 'csfg-zoom-toolbar';

    function makeBtn(text, title, onclick){
      var b = document.createElement('button'); b.type = 'button'; b.textContent = text; if (title) b.title = title; b.onclick = onclick; return b;
    }

    var img = document.createElement('img');
    img.src = url; img.alt = '';

    var scale = 1, natW = 0, natH = 0, fitScale = 1;

    function applyScale(s){
      scale = Math.max(0.05, Math.min(20, s));
      img.style.width = (natW * scale) + 'px';
      img.style.height = (natH * scale) + 'px';
    }

    function computeFit(){
      var w = wrap.clientWidth || 1; var h = wrap.clientHeight || 1;
      fitScale = Math.min(w / Math.max(1, natW), h / Math.max(1, natH));
      if (!isFinite(fitScale) || fitScale <= 0) fitScale = 1;
      return fitScale;
    }

    function centerScroll(){
      var cw = wrap.clientWidth, ch = wrap.clientHeight;
      var iw = natW * scale, ih = natH * scale;
      wrap.scrollLeft = Math.max(0, (iw - cw) / 2);
      wrap.scrollTop  = Math.max(0, (ih - ch) / 2);
    }

    function zoomIn(){ applyScale(scale * 1.25); }
    function zoomOut(){ applyScale(scale / 1.25); }
    function zoomFit(){ applyScale(computeFit()); centerScroll(); }
    function zoomActual(){ applyScale(1); centerScroll(); }

    toolbar.appendChild(makeBtn('-', 'Zoom out', zoomOut));
    toolbar.appendChild(makeBtn('+', 'Zoom in', zoomIn));
    toolbar.appendChild(makeBtn('100%', 'Actual size', zoomActual));
    toolbar.appendChild(makeBtn('Fit', 'Fit to window', zoomFit));

    var onResize = function(){ if (natW && natH) centerScroll(); };
    window.addEventListener('resize', onResize);

    img.onload = function(){
      natW = img.naturalWidth || img.width; natH = img.naturalHeight || img.height;
      computeFit();
      applyScale(fitScale);
      setTimeout(centerScroll, 0);
    };

    wrap.addEventListener('wheel', function(e){
      if (!e.ctrlKey) return; e.preventDefault();
      var delta = e.deltaY || 0; if (delta > 0) zoomOut(); else zoomIn();
    }, { passive: false });

    var observer = new MutationObserver(function(){
      var body = document.getElementById(modalIds.body);
      if (!body || !body.contains(wrap)) { window.removeEventListener('resize', onResize); observer.disconnect(); }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    wrap.appendChild(toolbar);
    wrap.appendChild(img);
    setModalContent(wrap);
    return Promise.resolve();
  }

  function viewFile(url, displayName) {
    showModal(displayName || '');
    var ext = getExtFromName(displayName || url);
    if (ext === 'docx') {
      return viewWithDocx(url).catch(function(){ showError('Failed to preview DOCX.'); });
    }
    if (ext === 'xlsx' || ext === 'xls') {
      return viewWithXlsx(url).catch(function(){ showError('Failed to preview XLSX.'); });
    }
    if (['png','jpg','jpeg','gif','bmp','webp','svg'].indexOf(ext) >= 0) {
      return viewAsImage(url).catch(function(){ showError('Failed to preview image.'); });
    }
    if (ext === 'pdf') {
      return viewInIframe(url).catch(function(){ showError('Failed to preview PDF.'); });
    }
    // default fallback
    hideModal();
    window.open(url, '_blank');
    return Promise.resolve();
  }

  function closestTd(el){
    while (el && el.nodeType === 1 && el.tagName !== 'TD') el = el.parentNode;
    return (el && el.tagName === 'TD') ? el : null;
  }

  function findSiblingLinkCell(td){
    if (!td) return null;
    var link = null;
    var prev = td.previousElementSibling;
    while (prev) {
      link = prev.querySelector ? prev.querySelector('a') : null;
      if (link) return link;
      prev = prev.previousElementSibling;
    }
    var next = td.nextElementSibling;
    while (next) {
      link = next.querySelector ? next.querySelector('a') : null;
      if (link) return link;
      next = next.nextElementSibling;
    }
    return null;
  }

  function addViewButtons(clientId) {
    function run() {
      var tbl = document.getElementById(clientId);
      if (!tbl) return;

      var deleteButtons = tbl.querySelectorAll('button.liButton[onclick^="DeleteAttachment"]');
      for (var i = 0; i < deleteButtons.length; i++) {
        var delBtn = deleteButtons[i];

        // Avoid duplicates if script runs multiple times
        if (delBtn.parentNode && delBtn.parentNode.querySelector('button[data-fg-view="1"]')) continue;

        // Get the <a> in the sibling cell corresponding to this Delete button
        var td = closestTd(delBtn);
        var link = findSiblingLinkCell(td);
        if (!link) continue;

        var href = link.getAttribute('href');
        if (!href) continue;

        var viewUrl = buildViewUrl(href);
        var name = filenameFromLink(link);

        // Create the View button next to Delete
        var viewBtn = document.createElement('button');
        viewBtn.type = 'button';
        viewBtn.className = delBtn.className;
        viewBtn.setAttribute('data-fg-view', '1');
        viewBtn.textContent = 'View';
        viewBtn.style.marginRight = '6px';
        viewBtn.onclick = (function (u, n) {
          return function () { viewFile(u, n); return false; };
        })(viewUrl, name);

        delBtn.parentNode.insertBefore(viewBtn, delBtn);
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  }

  window.CSFileGlance = window.CSFileGlance || {};
  window.CSFileGlance.addViewButtons = addViewButtons;
})(window, document);
