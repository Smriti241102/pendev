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
    initDefaultCompany();
    initTabs();
    initEmployeeTableEditors();
    initSortableTables();
    initTableFilters();
    initUserManager();
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
  /* Employee detail tables                                            */
  /* ---------------------------------------------------------------- */
  function initEmployeeTableEditors() {
    document.querySelectorAll("[data-table-editor]").forEach(function (panel) {
      var table = panel.querySelector("table");
      var body = table && table.querySelector("tbody");
      if (!table || !body) return;

      panel.addEventListener("click", function (event) {
        var button = event.target.closest("button");
        if (!button || !panel.contains(button)) return;

        var message = button.getAttribute("data-toast") || "";
        var row = button.closest("tr");
        if (/^Edit /.test(message) && row) {
          event.stopImmediatePropagation();
          editRow(row);
        } else if (/ removed$/.test(message) && row) {
          event.stopImmediatePropagation();
          row.remove();
          showToast(message);
        } else if (/ (added|uploaded)$/.test(message)) {
          event.stopImmediatePropagation();
          addRow(button, body);
        }
      }, true);

      function editRow(row) {
        if (row.getAttribute("data-editing") === "true") return;
        row.setAttribute("data-editing", "true");
        var cells = Array.prototype.slice.call(row.querySelectorAll("td"));
        var values = cells.slice(0, -1).map(function (cell) {
          return cell.textContent.trim();
        });

        values.forEach(function (value, index) {
          var input = document.createElement("input");
          input.className = "input input-bordered input-xs w-full";
          input.value = value;
          if (/^\d{4}-\d{2}-\d{2}$/.test(value)) input.type = "date";
          cells[index].replaceChildren(input);
        });

        var actions = cells[cells.length - 1];
        actions.replaceChildren();
        actions.className = "text-right space-x-1";
        var save = document.createElement("button");
        save.className = "btn btn-primary btn-xs";
        save.textContent = "Save";
        var cancel = document.createElement("button");
        cancel.className = "btn btn-ghost btn-xs";
        cancel.textContent = "Cancel";
        actions.append(save, cancel);

        save.addEventListener("click", function () {
          cells.slice(0, -1).forEach(function (cell) {
            cell.textContent = cell.querySelector("input").value;
          });
          row.removeAttribute("data-editing");
          restoreActions(actions);
          showToast("Item updated");
        });
        cancel.addEventListener("click", function () {
          cells.slice(0, -1).forEach(function (cell, index) {
            cell.textContent = values[index];
          });
          row.removeAttribute("data-editing");
          restoreActions(actions);
        });
      }

      function restoreActions(actions) {
        actions.innerHTML =
          '<button class="btn btn-ghost btn-xs" data-toast="Edit item">Edit</button>' +
          '<button class="btn btn-ghost btn-xs text-error" data-toast="Item removed">Remove</button>';
      }

      function addRow(button, tableBody) {
        var form = button.parentElement;
        var inputs = Array.prototype.slice.call(form.querySelectorAll("input"));
        var values = inputs.map(function (input) { return input.value.trim(); });
        if (values.some(function (value) { return !value; })) {
          showToast("Complete all fields before adding an item", "warning");
          return;
        }

        var row = document.createElement("tr");
        values.forEach(function (value) {
          var cell = document.createElement("td");
          cell.textContent = value;
          row.appendChild(cell);
        });
        var actions = document.createElement("td");
        actions.className = "text-right space-x-1";
        actions.innerHTML =
          '<button class="btn btn-ghost btn-xs" data-toast="Edit item">Edit</button>' +
          '<button class="btn btn-ghost btn-xs text-error" data-toast="Item removed">Remove</button>';
        row.appendChild(actions);
        tableBody.appendChild(row);
        inputs.forEach(function (input) { input.value = ""; });
        showToast("Item added");
      }
    });
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
  /* Default company                                                   */
  /* ---------------------------------------------------------------- */
  function initDefaultCompany() {
    var saved = localStorage.getItem("hra_default_company");
    if (!saved) return;

    try {
      var company = JSON.parse(saved);
      var name = document.getElementById("activeCompanyName");
      var menuName = document.getElementById("activeCompanyMenuName");
      var menuCode = document.getElementById("activeCompanyMenuCode");

      if (company.name && name) name.textContent = company.name;
      if (company.name && menuName) menuName.textContent = company.name;
      if (company.code && menuCode) menuCode.textContent = company.code;
    } catch (error) {
      localStorage.removeItem("hra_default_company");
    }
  }

  /* ---------------------------------------------------------------- */
  /* Tabs & Subnavigation (generic, grouped via data-tabs-group)      */
  /* ---------------------------------------------------------------- */
  function initTabs() {
    function activateTab(tabEl) {
      var targetId = tabEl.getAttribute("data-tab-target");
      if (!targetId) return;

      var groupName =
        tabEl.getAttribute("data-tabs-group") ||
        (tabEl.closest("[data-tabs-group]") && tabEl.closest("[data-tabs-group]").getAttribute("data-tabs-group"));
      if (!groupName) return;

      var allTriggers = document.querySelectorAll(
        '[data-tabs-group="' + groupName + '"] [data-tab-target], [data-tab-target][data-tabs-group="' + groupName + '"]'
      );

      allTriggers.forEach(function (t) {
        t.classList.remove("tab-active", "active");
        if (t.classList.contains("sidebar-sublink")) {
          t.classList.remove("bg-primary/15", "text-primary", "font-semibold");
          t.classList.add("text-base-content/70");
        }
      });

      tabEl.classList.add("tab-active", "active");
      if (tabEl.classList.contains("sidebar-sublink")) {
        tabEl.classList.remove("text-base-content/70");
        tabEl.classList.add("bg-primary/15", "text-primary", "font-semibold");
      }

      var panelsRoot = document.querySelector('[data-tabs-panels="' + groupName + '"]');
      if (!panelsRoot) return;
      panelsRoot.querySelectorAll(".tab-content-panel").forEach(function (panel) {
        panel.classList.add("hidden");
      });
      var target = document.getElementById(targetId);
      if (target) target.classList.remove("hidden");

      var sectionTitle = tabEl.getAttribute("data-section-title");
      var subtitleEl = document.getElementById("companyPageSubtitle");
      if (subtitleEl && sectionTitle) {
        subtitleEl.textContent = "Company Information - " + sectionTitle;
      }
    }

    document.querySelectorAll("[data-tab-target]").forEach(function (tabEl) {
      tabEl.addEventListener("click", function (e) {
        e.preventDefault();
        activateTab(tabEl);
        var targetId = tabEl.getAttribute("data-tab-target");
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, null, "#" + targetId);
        }
      });
    });

    if (window.location.hash) {
      var hashTarget = window.location.hash.substring(1);
      var matchingTab = document.querySelector('[data-tab-target="' + hashTarget + '"]');
      if (matchingTab) {
        activateTab(matchingTab);
      }
    }
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

  function initUserManager() {
    var table = document.getElementById("table-users");
    var details = document.getElementById("user-details");
    var drawer = document.getElementById("userDrawer");
    var rolesBody = document.getElementById("user-roles-body");
    if (!table || !details || !rolesBody || !drawer) return;

    var selectedRow = null;
    var editingRoleRow = null;
    var nameEl = document.getElementById("user-details-name");
    var loginEl = document.getElementById("user-details-login");
    var statusEl = document.getElementById("user-details-status");
    var disabledToggle = document.getElementById("user-disabled");
    var roleForm = document.getElementById("role-form");
    var roleInput = document.getElementById("role-name-input");
    var addRoleButton = document.getElementById("add-role-button");
    var saveRoleButton = document.getElementById("save-role-button");
    var cancelRoleButton = document.getElementById("cancel-role-button");

    table.querySelector("tbody").addEventListener("click", function (event) {
      var row = event.target.closest("tr[data-user-id]");
      if (row) selectUser(row);
    });

    disabledToggle.addEventListener("change", function () {
      if (!selectedRow) return;
      var disabled = disabledToggle.checked;
      selectedRow.dataset.disabled = disabled ? "true" : "false";
      selectedRow.dataset.status = disabled ? "Disabled" : "Active";
      var badge = selectedRow.children[2].querySelector(".badge");
      badge.textContent = disabled ? "Disabled" : "Active";
      badge.className = "badge badge-sm " + (disabled ? "badge-ghost" : "badge-success");
      statusEl.textContent = selectedRow.dataset.status;
      showToast("User status updated");
    });

    addRoleButton.addEventListener("click", function () {
      editingRoleRow = null;
      roleInput.value = "";
      roleForm.classList.remove("hidden");
      roleInput.focus();
    });

    cancelRoleButton.addEventListener("click", resetRoleForm);

    saveRoleButton.addEventListener("click", function () {
      var roleName = roleInput.value.trim();
      if (!roleName) {
        showToast("Enter a role name", "warning");
        roleInput.focus();
        return;
      }

      if (editingRoleRow) {
        editingRoleRow.querySelector(".role-name").textContent = roleName;
        syncSelectedRoles();
        showToast("Role updated");
      } else {
        rolesBody.appendChild(createRoleRow(roleName));
        syncSelectedRoles();
        showToast("Role added");
      }
      resetRoleForm();
    });

    rolesBody.addEventListener("click", function (event) {
      var button = event.target.closest("button");
      var row = event.target.closest("tr");
      if (!button || !row) return;

      if (button.dataset.roleAction === "edit") {
        editingRoleRow = row;
        roleInput.value = row.querySelector(".role-name").textContent;
        roleForm.classList.remove("hidden");
        roleInput.focus();
      } else if (button.dataset.roleAction === "delete") {
        row.remove();
        syncSelectedRoles();
        showToast("Role deleted", "warning");
      }
    });

    rolesBody.addEventListener("change", function (event) {
      if (!event.target.matches("[data-role-disabled]")) return;
      var row = event.target.closest("tr");
      row.dataset.disabled = event.target.checked ? "true" : "false";
      syncSelectedRoles();
      showToast("Role status updated");
    });

    function selectUser(row) {
      selectedRow = row;
      table.querySelectorAll("tbody tr").forEach(function (userRow) {
        userRow.classList.toggle("bg-primary/10", userRow === row);
      });
      nameEl.textContent = row.dataset.fullName;
      loginEl.textContent = row.dataset.loginName;
      statusEl.textContent = row.dataset.status;
      disabledToggle.checked = row.dataset.disabled === "true";
      rolesBody.replaceChildren();
      (row.dataset.roles || "").split("|").filter(Boolean).forEach(function (roleEntry) {
        var parts = roleEntry.split("::");
        rolesBody.appendChild(createRoleRow(parts[0], parts[1] === "disabled"));
      });
      resetRoleForm();
      details.classList.remove("hidden");
      drawer.checked = true;
    }

    function createRoleRow(roleName, disabled) {
      var row = document.createElement("tr");
      row.dataset.disabled = disabled ? "true" : "false";
      var roleCell = document.createElement("td");
      roleCell.className = "role-name font-medium";
      roleCell.textContent = roleName;
      var disabledCell = document.createElement("td");
      var disabledToggle = document.createElement("input");
      disabledToggle.type = "checkbox";
      disabledToggle.className = "toggle toggle-xs toggle-warning";
      disabledToggle.checked = !!disabled;
      disabledToggle.setAttribute("aria-label", "Disable " + roleName + " role");
      disabledToggle.dataset.roleDisabled = "";
      disabledCell.appendChild(disabledToggle);
      var actionsCell = document.createElement("td");
      actionsCell.className = "text-right space-x-1";
      actionsCell.appendChild(createRoleButton("edit", "Edit", "pencil"));
      actionsCell.appendChild(createRoleButton("delete", "Delete", "trash-2"));
      row.append(roleCell, disabledCell, actionsCell);
      return row;
    }

    function syncSelectedRoles() {
      if (!selectedRow) return;
      selectedRow.dataset.roles = Array.prototype.map.call(
        rolesBody.querySelectorAll("tr"),
        function (roleRow) {
          return roleRow.querySelector(".role-name").textContent.trim() +
            (roleRow.dataset.disabled === "true" ? "::disabled" : "");
        }
      ).join("|");
    }

    function createRoleButton(action, label, icon) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "btn btn-ghost btn-xs" + (action === "delete" ? " text-error" : "");
      button.dataset.roleAction = action;
      button.setAttribute("aria-label", label + " role");
      button.innerHTML = '<i data-lucide="' + icon + '" class="w-3.5 h-3.5"></i><span class="sr-only">' + label + "</span>";
      if (window.lucide) window.lucide.createIcons({ nodes: [button] });
      return button;
    }

    function resetRoleForm() {
      editingRoleRow = null;
      roleInput.value = "";
      roleForm.classList.add("hidden");
    }
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
          updateEmployeeDrawerHeader(trigger);
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
    document.querySelectorAll("label[for='employeeDrawer']").forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        updateEmployeeDrawerHeader(trigger.closest("tr"));
      });
    });

    function updateEmployeeDrawerHeader(row) {
      if (!row) return;
      var cells = row.querySelectorAll("td");
      var id = document.getElementById("employeeDrawerId");
      var title = document.getElementById("employeeDrawerTitle");
      if (cells.length >= 3 && id && title) {
        id.textContent = "Employee ID: " + cells[0].textContent.trim();
        title.textContent = cells[1].textContent.trim() + " " + cells[2].textContent.trim();
      }
    }
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
