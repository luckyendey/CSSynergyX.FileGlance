(function (window, document) {
    // --- Configuration & state ---
    var CFG = {
        ids: {
            overlay: 'csfg-overlay',
            modal: 'csfg-modal',
            header: 'csfg-header',
            title: 'csfg-title',
            close: 'csfg-close',
            body: 'csfg-body',
            styles: 'csfg-styles'
        },
        z: {
            overlay: 2147483000,
            modal: 2147483001,
            toolbar: 2147483002
        },
        cdn: {
            jszip: 'https://unpkg.com/jszip/dist/jszip.min.js',
            docxjs: 'https://unpkg.com/docx-preview@0.3.6/dist/docx-preview.min.js',
            xlsx: 'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'
        }
    };

    var currentViewer = null; // { kind: 'image'|'docx'|'xlsx'|'pdf', onKey?, dispose? }
    var lastFocused = null;

    // --- Helpers to create the modal viewer ---
    function ensureStyles() {
        if (document.getElementById(CFG.ids.styles)) return;
        var style = document.createElement('style');
        style.id = CFG.ids.styles;
        style.type = 'text/css';
        style.textContent = [
            '#' + CFG.ids.overlay + '{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:' + CFG.z.overlay + ';display:none;}',
            '#' + CFG.ids.modal + '{position:fixed;top:5%;left:50%;transform:translateX(-50%);width:88vw;max-width:1200px;height:90vh;background:#fff;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.3);z-index:' + CFG.z.modal + ';display:none;overflow:hidden;}',
            '#' + CFG.ids.header + '{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e5e7eb;background:#f8fafc;}',
            '#' + CFG.ids.title + '{font:600 14px/1.4 system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '#' + CFG.ids.close + '{background:#ef4444;color:#fff;border:none;border-radius:4px;padding:6px 10px;font:600 12px/1 system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;cursor:pointer;}',
            '#' + CFG.ids.body + '{position:absolute;top:44px;bottom:0;left:0;right:0;background:#fff;overflow:auto;padding:0;}',
            '#' + CFG.ids.body + ' .csfg-center{display:flex;align-items:center;justify-content:center;height:100%;color:#6b7280;font:14px system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;}',
            '#' + CFG.ids.body + ' iframe{border:0;width:100%;height:100%;}',
            '#' + CFG.ids.body + ' img{max-width:100%;height:auto;display:block;margin:0 auto;}',
            /* Image viewer specific */
            '#' + CFG.ids.body + ' .csfg-imgwrap{position:relative;width:100%;height:100%;overflow:auto;background:#fff;display:flex;align-items:center;justify-content:center;}',
            '#' + CFG.ids.body + ' .csfg-imgwrap img{max-width:none;display:block;margin:0;}',
            '#' + CFG.ids.body + ' .csfg-zoom-toolbar{position:absolute;top:8px;right:8px;background:rgba(248,250,252,.95);border:1px solid #e5e7eb;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,.08);padding:4px;display:flex;gap:6px;z-index:' + CFG.z.toolbar + ';align-items:center;}',
            '#' + CFG.ids.body + ' .csfg-zoom-toolbar button{background:#fff;border:1px solid #d1d5db;border-radius:4px;padding:4px 8px;font:600 12px system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;cursor:pointer;color:#111827;}',
            '#' + CFG.ids.body + ' .csfg-zoom-toolbar button:hover{background:#f3f4f6;}',
            '#' + CFG.ids.body + ' .csfg-zoom-label{min-width:48px;text-align:center;font:600 12px system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;}',
            '#' + CFG.ids.body + ' .csfg-imgwrap.grab{cursor:grab;}',
            '#' + CFG.ids.body + ' .csfg-imgwrap.grabbing{cursor:grabbing;}'
        ].join('\n');
        document.head.appendChild(style);
    }

    function ensureModal() {
        ensureStyles();
        var overlay = document.getElementById(CFG.ids.overlay);
        var modal = document.getElementById(CFG.ids.modal);
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = CFG.ids.overlay;
            overlay.onclick = hideModal;
            document.body.appendChild(overlay);
        }
        if (!modal) {
            modal = document.createElement('div');
            modal.id = CFG.ids.modal;
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            var header = document.createElement('div'); header.id = CFG.ids.header;
            var title = document.createElement('div'); title.id = CFG.ids.title; title.textContent = '';
            var close = document.createElement('button'); close.id = CFG.ids.close; close.textContent = 'Close'; close.onclick = hideModal;
            header.appendChild(title); header.appendChild(close);
            var body = document.createElement('div'); body.id = CFG.ids.body; body.innerHTML = '<div class="csfg-center">Loading...</div>';
            modal.appendChild(header); modal.appendChild(body);
            document.body.appendChild(modal);
        }
        return modal;
    }

    function onGlobalKey(e) {
        if (e.key === 'Escape') { hideModal(); return; }
        if (!currentViewer || !currentViewer.onKey) return;
        currentViewer.onKey(e);
    }

    function showModal(titleText) {
        var modal = ensureModal();
        lastFocused = document.activeElement;
        document.getElementById(CFG.ids.title).textContent = titleText || '';
        document.getElementById(CFG.ids.body).innerHTML = '<div class="csfg-center">Loading...</div>';
        document.getElementById(CFG.ids.overlay).style.display = 'block';
        document.getElementById(CFG.ids.modal).style.display = 'block';
        var closeBtn = document.getElementById(CFG.ids.close);
        if (closeBtn && closeBtn.focus) closeBtn.focus();
        document.addEventListener('keydown', onGlobalKey);
    }

    function hideModal() {
        var o = document.getElementById(CFG.ids.overlay);
        var m = document.getElementById(CFG.ids.modal);
        if (o) o.style.display = 'none';
        if (m) m.style.display = 'none';
        document.removeEventListener('keydown', onGlobalKey);
        if (currentViewer && currentViewer.dispose) try { currentViewer.dispose(); } catch (_) { }
        currentViewer = null;
        if (lastFocused && lastFocused.focus) { try { lastFocused.focus(); } catch (_) { } }
        lastFocused = null;
    }

    function setModalContent(nodeOrHtml) {
        var body = document.getElementById(CFG.ids.body);
        if (!body) return;
        if (typeof nodeOrHtml === 'string') body.innerHTML = nodeOrHtml; else { body.innerHTML = ''; body.appendChild(nodeOrHtml); }
    }

    function showError(message) {
        setModalContent('<div class="csfg-center">' + (message || 'Unable to preview this file.') + '</div>');
    }

    // --- Dynamic resource loading ---
    var loadedScripts = {};
    function loadScriptOnce(url) {
        return new Promise(function (resolve, reject) {
            if (loadedScripts[url] === true) return resolve();
            if (loadedScripts[url] && loadedScripts[url].then) return loadedScripts[url].then(resolve, reject);
            var p = new Promise(function (res, rej) {
                var s = document.createElement('script');
                s.src = url; s.async = true; s.onload = function () { loadedScripts[url] = true; res(); };
                s.onerror = function () { delete loadedScripts[url]; rej(new Error('Failed to load ' + url)); };
                document.head.appendChild(s);
            });
            loadedScripts[url] = p;
            p.then(resolve, reject);
        });
    }

    function loadStyleOnce(url) {
        return new Promise(function (resolve, reject) {
            var link = document.querySelector('link[href="' + url.replace(/([.*+?^${}()|[\]\\])/g, '\\$1') + '"]');
            if (link) return resolve();
            var l = document.createElement('link');
            l.rel = 'stylesheet'; l.href = url; l.onload = function () { resolve(); }; l.onerror = function () { resolve(); };
            document.head.appendChild(l);
        });
    }

    function loadScriptWithFallback(urls) {
        var i = 0;
        function next() { if (i >= urls.length) return Promise.reject(new Error('All script sources failed')); var url = urls[i++]; return loadScriptOnce(url).catch(function () { return next(); }); }
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
        return '/docs/';
    }

    // --- Utilities ---
    function getExtFromName(name) {
        if (!name) return '';
        var q = name.split('?')[0];
        var f = q.split('#')[0];
        var i = f.lastIndexOf('.');
        return i >= 0 ? f.substring(i + 1).toLowerCase() : '';
    }

    function filenameFromLink(link) {
        if (!link) return '';
        var text = (link.textContent || link.innerText || '').trim();
        return text || '';
    }

    function buildViewUrl(href) {
        if (!href) return href;
        try {
            var u = new URL(href, window.location.href);
            u.searchParams.set('Download', '0');
            return u.toString();
        } catch (_) {
            var replaced = false;
            var out = href.replace(/([?&])Download=1/i, function (m, p1) { replaced = true; return p1 + 'Download=0'; });
            if (!replaced) out += (out.indexOf('?') >= 0 ? '&' : '?') + 'Download=0';
            return out;
        }
    }

    function fetchArrayBuffer(url) {
        return fetch(url, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); });
    }

    // --- Viewers ---
    function viewWithDocx(url) {
        var base = getScriptBase('CSSynergyX.FileGlance.js');
        var DOCX_LOCAL = base + 'docx-preview.js';
        var JSZIP_LOCAL = base + 'jszip.min.js';
        return loadScriptWithFallback([JSZIP_LOCAL, CFG.cdn.jszip])
            .then(function () { return loadScriptWithFallback([DOCX_LOCAL, CFG.cdn.docxjs]); })
            .then(function () {
                return fetchArrayBuffer(url).then(function (buf) {
                    var container = document.createElement('div');
                    container.style.padding = '12px';
                    setModalContent(container);
                    return window.docx && window.docx.renderAsync(buf, container, null, { inWrapper: true })
                        .catch(function () { showError('Failed to render DOCX'); });
                });
            });
    }

    function viewWithXlsx(url) {
        var base = getScriptBase('CSSynergyX.FileGlance.js');
        var XLSX_LOCAL = base + 'xlsx.full.min.js';
        return loadScriptWithFallback([XLSX_LOCAL, CFG.cdn.xlsx]).then(function () {
            return fetchArrayBuffer(url).then(function (buf) {
                var data = new Uint8Array(buf);
                var wb = window.XLSX.read(data, { type: 'array' });
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
        wrap.className = 'csfg-imgwrap grab';

        var toolbar = document.createElement('div');
        toolbar.className = 'csfg-zoom-toolbar';

        function makeBtn(text, title, onclick) { var b = document.createElement('button'); b.type = 'button'; b.textContent = text; if (title) b.title = title; b.onclick = onclick; return b; }

        var img = document.createElement('img');
        img.src = url; img.alt = '';

        var scale = 1, natW = 0, natH = 0, fitScale = 1;
        var zoomLabel = document.createElement('span'); zoomLabel.className = 'csfg-zoom-label';

        function updateLabel() { zoomLabel.textContent = Math.round(scale * 100) + '%'; }

        function applyScale(s) {
            scale = Math.max(0.05, Math.min(20, s));
            img.style.width = (natW * scale) + 'px';
            img.style.height = (natH * scale) + 'px';
            updateLabel();
        }

        function computeFit() {
            var w = wrap.clientWidth || 1; var h = wrap.clientHeight || 1;
            fitScale = Math.min(w / Math.max(1, natW), h / Math.max(1, natH));
            if (!isFinite(fitScale) || fitScale <= 0) fitScale = 1;
            return fitScale;
        }

        function centerScroll() {
            var cw = wrap.clientWidth, ch = wrap.clientHeight;
            var iw = natW * scale, ih = natH * scale;
            wrap.scrollLeft = Math.max(0, (iw - cw) / 2);
            wrap.scrollTop = Math.max(0, (ih - ch) / 2);
        }

        function zoomIn() { applyScale(scale * 1.25); }
        function zoomOut() { applyScale(scale / 1.25); }
        function zoomFit() { applyScale(computeFit()); centerScroll(); }
        function zoomActual() { applyScale(1); centerScroll(); }

        toolbar.appendChild(makeBtn('-', 'Zoom out', zoomOut));
        toolbar.appendChild(makeBtn('+', 'Zoom in', zoomIn));
        toolbar.appendChild(zoomLabel);
        toolbar.appendChild(makeBtn('100%', 'Actual size', zoomActual));
        toolbar.appendChild(makeBtn('Fit', 'Fit to window', zoomFit));

        // Drag to pan
        var dragging = false, startX = 0, startY = 0, startSL = 0, startST = 0;
        wrap.addEventListener('mousedown', function (e) {
            if (toolbar.contains(e.target)) return;
            dragging = true; wrap.classList.add('grabbing'); wrap.classList.remove('grab');
            startX = e.clientX; startY = e.clientY; startSL = wrap.scrollLeft; startST = wrap.scrollTop;
            e.preventDefault();
        });
        window.addEventListener('mousemove', function (e) { if (!dragging) return; wrap.scrollLeft = startSL - (e.clientX - startX); wrap.scrollTop = startST - (e.clientY - startY); });
        window.addEventListener('mouseup', function () { if (!dragging) return; dragging = false; wrap.classList.remove('grabbing'); wrap.classList.add('grab'); });

        // Keyboard shortcuts for image viewer
        currentViewer = {
            kind: 'image',
            onKey: function (e) {
                if (e.key === '+' || e.key === '=') { zoomIn(); e.preventDefault(); }
                else if (e.key === '-' || e.key === '_') { zoomOut(); e.preventDefault(); }
                else if (e.key === '0') { zoomActual(); e.preventDefault(); }
                else if (e.key === 'f' || e.key === 'F') { zoomFit(); e.preventDefault(); }
            },
            dispose: function () { dragging = false; }
        };

        var onResize = debounce(function () { if (natW && natH) centerScroll(); }, 100);
        window.addEventListener('resize', onResize);

        img.onload = function () { natW = img.naturalWidth || img.width; natH = img.naturalHeight || img.height; computeFit(); applyScale(fitScale); setTimeout(centerScroll, 0); };

        // Ctrl+wheel to zoom
        wrap.addEventListener('wheel', function (e) { if (!e.ctrlKey) return; e.preventDefault(); var d = e.deltaY || 0; if (d > 0) zoomOut(); else zoomIn(); }, { passive: false });

        var observer = new MutationObserver(function () { var body = document.getElementById(CFG.ids.body); if (!body || !body.contains(wrap)) { window.removeEventListener('resize', onResize); observer.disconnect(); } });
        observer.observe(document.body, { childList: true, subtree: true });

        wrap.appendChild(toolbar);
        wrap.appendChild(img);
        setModalContent(wrap);
        updateLabel();
        return Promise.resolve();
    }

    function debounce(fn, ms) { var t; return function () { clearTimeout(t); var a = arguments, c = this; t = setTimeout(function () { fn.apply(c, a); }, ms); } }

    // --- Public viewer dispatch ---
    var viewers = {
        docx: viewWithDocx,
        xlsx: viewWithXlsx,
        xls: viewWithXlsx,
        pdf: viewInIframe
    };
    var imageExts = { png: 1, jpg: 1, jpeg: 1, gif: 1, bmp: 1, webp: 1, svg: 1 };

    function viewFile(url, displayName) {
        showModal(displayName || '');
        var ext = getExtFromName(displayName || url);
        if (viewers[ext]) { return viewers[ext](url).catch(function () { showError('Failed to preview ' + ext.toUpperCase() + '.'); }); }
        if (imageExts[ext]) { return viewAsImage(url).catch(function () { showError('Failed to preview image.'); }); }
        if (ext === 'pdf') { return viewInIframe(url).catch(function () { showError('Failed to preview PDF.'); }); }
        hideModal(); window.open(url, '_blank'); return Promise.resolve();
    }

    // --- Table enhancement ---
    function closestTd(el) { while (el && el.nodeType === 1 && el.tagName !== 'TD') el = el.parentNode; return (el && el.tagName === 'TD') ? el : null; }
    function findSiblingLinkCell(td) { if (!td) return null; var link = null; var prev = td.previousElementSibling; while (prev) { link = prev.querySelector ? prev.querySelector('a') : null; if (link) return link; prev = prev.previousElementSibling; } var next = td.nextElementSibling; while (next) { link = next.querySelector ? next.querySelector('a') : null; if (link) return link; next = next.nextElementSibling; } return null; }

    function addViewButtons(clientId) {
        function run() {
            var tbl = document.getElementById(clientId); if (!tbl) return;
            var deleteButtons = tbl.querySelectorAll('button.liButton[onclick^="DeleteAttachment"]');
            for (var i = 0; i < deleteButtons.length; i++) {
                var delBtn = deleteButtons[i];
                if (delBtn.parentNode && delBtn.parentNode.querySelector('button[data-fg-view="1"]')) continue;
                var td = closestTd(delBtn);
                var link = findSiblingLinkCell(td); if (!link) continue;
                var href = link.href || link.getAttribute('href'); if (!href) continue;
                var viewUrl = buildViewUrl(href);
                var name = filenameFromLink(link);
                var viewBtn = document.createElement('button');
                viewBtn.type = 'button'; viewBtn.className = delBtn.className; viewBtn.setAttribute('data-fg-view', '1'); viewBtn.textContent = 'View'; viewBtn.style.marginRight = '6px';
                viewBtn.onclick = (function (u, n) { return function () { viewFile(u, n); return false; }; })(viewUrl, name);
                delBtn.parentNode.insertBefore(viewBtn, delBtn);
            }
        }
        if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', run); } else { run(); }
    }

    // --- Exports ---
    window.CSFileGlance = window.CSFileGlance || {};
    window.CSFileGlance.addViewButtons = addViewButtons;
    window.CSFileGlance.viewFile = viewFile;
})(window, document);
