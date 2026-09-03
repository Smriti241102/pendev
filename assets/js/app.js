/**
 * HR Acquisition Administration - shared front-end behaviour.
 * UI-only prototype: no network calls, no persistence, no business logic.
 * Everything below is generic + delegated so this single file can be
 * dropped into a Django "static/js/app.js" without changes.
 */
(function () {
  "use strict";

  /* ---------------------------------------------------------------- */
  /* Init                                                              */
  /* ---------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    initIcons();
    initSidebar();
    initTheme();
    initTabs();
    initSortableTables();
    initTableFilters();
    initSelectAll();
    initDropzones();
    initToastTriggers();
    initDrawerPanels();
  });

  function initIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /* ---------------------------------------------------------------- */
  /* Sidebar collapse                                                  */
  /* ---------------------------------------------------------------- */
  function initSidebar() {
    var sidebar = document.getElementById("sidebar");
    var toggle = document.getElementById("sidebarToggle");
    if (!sidebar || !toggle) return;

    var collapsed = localStorage.getItem("hra_sidebar_collapsed") === "1";
    setSidebarState(collapsed);

    toggle.addEventListener("click", function () {
      collapsed = !sidebar.classList.contains("collapsed");
      setSidebarState(collapsed);
      localStorage.setItem("hra_sidebar_collapsed", collapsed ? "1" : "0");
    });

    function setSidebarState(isCollapsed) {
      sidebar.classList.toggle("collapsed", isCollapsed);
      var icon = document.getElementById("sidebarToggleIcon");
      if (icon) {
        icon.setAttribute("data-lucide", isCollapsed ? "chevron-right" : "chevron-left");
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* Theme toggle (light / dark) - the actual switch is CSS-only via   */
  /* daisyUI's theme-controller checkbox; this only persists the pick. */
  /* ---------------------------------------------------------------- */
  function initTheme() {
    var checkbox = document.getElementById("themeToggle");
    if (!checkbox) return;

    var saved = localStorage.getItem("hra_theme") || "ctk-light";
    checkbox.checked = saved === "ctk-dark";

    checkbox.addEventListener("change", function () {
      localStorage.setItem("hra_theme", checkbox.checked ? "ctk-dark" : "ctk-light");
    });
  }

  /* ---------------------------------------------------------------- */
  /* Tabs (generic, grouped via data-tabs-group)                      */
  /* ---------------------------------------------------------------- */
  function initTabs() {
    document.querySelectorAll("[data-tab-target]").forEach(function (tabEl) {
      tabEl.addEventListener("click", function (e) {
        e.preventDefault();
        var group = tabEl.closest("[data-tabs-group]");
        var targetId = tabEl.getAttribute("data-tab-target");
        if (!group) return;

        group.querySelectorAll("[data-tab-target]").forEach(function (t) {
          t.classList.remove("tab-active");
        });
        tabEl.classList.add("tab-active");

        var panelsRoot = document.querySelector(
          '[data-tabs-panels="' + group.getAttribute("data-tabs-group") + '"]'
        );
        if (!panelsRoot) return;
        panelsRoot.querySelectorAll(".tab-content-panel").forEach(function (panel) {
          panel.classList.add("hidden");
        });
        var target = document.getElementById(targetId);
        if (target) target.classList.remove("hidden");
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Sortable tables (client-side visual sort only)                   */
  /* ---------------------------------------------------------------- */
  function initSortableTables() {
    document.querySelectorAll("th[data-sort-key]").forEach(function (th) {
      th.addEventListener("click", function () {
        var table = th.closest("table");
        if (!table) return;
        var tbody = table.querySelector("tbody");
        var index = Array.prototype.indexOf.call(th.parentElement.children, th);
        var asc = !th.classList.contains("sort-asc");

        table.querySelectorAll("th[data-sort-key]").forEach(function (h) {
          h.classList.remove("sort-asc", "sort-desc");
        });
        th.classList.add(asc ? "sort-asc" : "sort-desc");

        var rows = Array.prototype.slice.call(tbody.querySelectorAll("tr"));
        rows.sort(function (a, b) {
          var av = (a.children[index] && a.children[index].innerText.trim()) || "";
          var bv = (b.children[index] && b.children[index].innerText.trim()) || "";
          var an = parseFloat(av.replace(/[^0-9.-]/g, ""));
          var bn = parseFloat(bv.replace(/[^0-9.-]/g, ""));
          var cmp;
          if (!isNaN(an) && !isNaN(bn) && av !== "" && bv !== "") {
            cmp = an - bn;
          } else {
            cmp = av.localeCompare(bv);
          }
          return asc ? cmp : -cmp;
        });
        rows.forEach(function (r) {
          tbody.appendChild(r);
        });
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Search / filter inputs (data-filter-target -> table id)          */
  /* ---------------------------------------------------------------- */
  function initTableFilters() {
    document.querySelectorAll("[data-filter-target]").forEach(function (input) {
      input.addEventListener("input", function () {
        var table = document.getElementById(input.getAttribute("data-filter-target"));
        if (!table) return;
        var query = input.value.trim().toLowerCase();
        table.querySelectorAll("tbody tr").forEach(function (row) {
          var text = row.innerText.toLowerCase();
          row.classList.toggle("hidden", query.length > 0 && text.indexOf(query) === -1);
        });
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Select all / row checkboxes                                      */
  /* ---------------------------------------------------------------- */
  function initSelectAll() {
    document.querySelectorAll("[data-select-all]").forEach(function (master) {
      master.addEventListener("change", function () {
        var scope = document.getElementById(master.getAttribute("data-select-all"));
        if (!scope) return;
        scope.querySelectorAll("[data-row-checkbox]").forEach(function (cb) {
          cb.checked = master.checked;
        });
        updateSelectionCount(scope);
      });
    });

    document.querySelectorAll("[data-row-checkbox]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var scope = cb.closest("table");
        if (scope) updateSelectionCount(scope);
      });
    });

    function updateSelectionCount(scope) {
      var badge = document.querySelector(
        '[data-selection-count-for="' + (scope.id || "") + '"]'
      );
      if (!badge) return;
      var count = scope.querySelectorAll("[data-row-checkbox]:checked").length;
      badge.textContent = count;
    }
  }

  /* ---------------------------------------------------------------- */
  /* Drag & drop upload zones (visual only)                            */
  /* ---------------------------------------------------------------- */
  function initDropzones() {
    document.querySelectorAll("[data-dropzone]").forEach(function (zone) {
      var input = zone.querySelector('input[type="file"]');

      ["dragenter", "dragover"].forEach(function (evt) {
        zone.addEventListener(evt, function (e) {
          e.preventDefault();
          zone.classList.add("drag-active");
        });
      });
      ["dragleave", "drop"].forEach(function (evt) {
        zone.addEventListener(evt, function (e) {
          e.preventDefault();
          zone.classList.remove("drag-active");
        });
      });
      zone.addEventListener("drop", function (e) {
        var files = e.dataTransfer ? e.dataTransfer.files : [];
        renderFileList(zone, files);
      });
      if (input) {
        input.addEventListener("change", function () {
          renderFileList(zone, input.files);
        });
      }
    });

    function renderFileList(zone, files) {
      var listId = zone.getAttribute("data-filelist");
      var list = listId ? document.getElementById(listId) : null;
      if (!list || !files || !files.length) return;
      Array.prototype.forEach.call(files, function (file) {
        var li = document.createElement("li");
        li.className = "flex items-center justify-between gap-3 rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm";
        li.innerHTML =
          '<span class="flex items-center gap-2 truncate"><i data-lucide="file-text" class="w-4 h-4 text-primary shrink-0"></i><span class="truncate">' +
          file.name +
          '</span></span><span class="badge badge-ghost badge-sm">' +
          Math.max(1, Math.round(file.size / 1024)) +
          " KB</span>";
        list.appendChild(li);
      });
      if (window.lucide) window.lucide.createIcons();
      showToast(files.length + " file(s) staged for upload (UI only)", "info");
    }
  }

  /* ---------------------------------------------------------------- */
  /* Shared record drawer - New/Edit buttons (and clicking a table row) */
  /* open one drawer and swap in the matching form panel.               */
  /* ---------------------------------------------------------------- */
  function initDrawerPanels() {
    document.querySelectorAll("[data-open-drawer]").forEach(function (trigger) {
      trigger.addEventListener("click", function (e) {
        // Rows also wrap action buttons/labels; let those handle themselves.
        if (trigger.tagName === "TR") {
          var interactive = e.target.closest("button, a, label, input, select, textarea");
          if (interactive && interactive !== trigger) return;
        }

        var drawer = document.getElementById(trigger.getAttribute("data-open-drawer"));
        if (drawer) drawer.checked = true;

        var panelId = trigger.getAttribute("data-panel-target");
        var panel = panelId ? document.getElementById(panelId) : null;
        if (!panel) return;

        var group = panel.closest("[data-drawer-panels]");
        if (group) {
          group.querySelectorAll(".drawer-form-panel").forEach(function (p) {
            p.classList.add("hidden");
          });
        }
        panel.classList.remove("hidden");
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* Toast helper - used for Save / Delete / etc. visual feedback      */
  /* ---------------------------------------------------------------- */
  function initToastTriggers() {
    document.querySelectorAll("[data-toast]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showToast(btn.getAttribute("data-toast"), btn.getAttribute("data-toast-type") || "success");
      });
    });
  }

  function showToast(message, type) {
    var container = document.getElementById("toastContainer");
    if (!container) return;
    type = type || "success";
    var iconMap = { success: "check-circle", info: "info", warning: "alert-triangle", error: "x-circle" };
    var alert = document.createElement("div");
    alert.className = "alert alert-" + type + " shadow-lg text-sm py-2 min-w-[260px]";
    alert.innerHTML =
      '<i data-lucide="' + (iconMap[type] || "check-circle") + '" class="w-4 h-4"></i><span>' + message + "</span>";
    container.appendChild(alert);
    if (window.lucide) window.lucide.createIcons();
    setTimeout(function () {
      alert.style.transition = "opacity .3s ease";
      alert.style.opacity = "0";
      setTimeout(function () {
        alert.remove();
      }, 300);
    }, 2800);
  }

  window.HRA = { showToast: showToast };
})();
