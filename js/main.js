/* ==========================================================================
   Mr. Tasty — site behaviour
   Vanilla ES2020, no dependencies. Every feature degrades gracefully:
   if this file fails to load the page is still readable and navigable.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------------------------------------------------------------- utils */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const SERVICE_RATE = 0.1;
  const money = (n) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const prefersReducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Focus trapping keeps keyboard users inside an open dialog */
  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function trapFocus(container, event) {
    const items = $$(FOCUSABLE, container).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* Several overlays can request a scroll lock; only release on the last one */
  let scrollLocks = 0;
  function lockScroll() {
    if (scrollLocks === 0) document.body.classList.add("no-scroll");
    scrollLocks += 1;
  }
  function unlockScroll() {
    scrollLocks = Math.max(0, scrollLocks - 1);
    if (scrollLocks === 0) document.body.classList.remove("no-scroll");
  }

  /* --------------------------------------------------------------- toasts */
  const toaster = $("#toaster");

  function toast(message, variant) {
    if (!toaster) return;
    const el = document.createElement("div");
    el.className = "toast" + (variant ? " toast--" + variant : "");
    el.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">' +
      (variant === "success"
        ? '<path d="m5 12.5 4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round"/>'
        : '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.2v.1" stroke-linecap="round"/>') +
      "</svg><span></span>";
    el.querySelector("span").textContent = message;
    toaster.appendChild(el);

    window.setTimeout(() => {
      el.classList.add("is-leaving");
      el.addEventListener("animationend", () => el.remove(), { once: true });
    }, 3200);

    /* Never let a burst of toasts fill the screen */
    while (toaster.children.length > 3) toaster.firstElementChild.remove();
  }

  /* ------------------------------------------------------ header & nav */
  function initHeader() {
    const header = $("#site-header");
    const toggle = $("#nav-toggle");
    const menu = $("#mobile-menu");
    if (!header) return;

    /* Solidify the header once the hero starts scrolling away */
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        header.classList.toggle("is-scrolled", window.scrollY > 40);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (!toggle || !menu) return;

    let menuOpen = false;

    const setMenu = (open) => {
      if (open === menuOpen) return;
      menuOpen = open;
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
      if (open) {
        menu.hidden = false;
        /* Next frame, so the transition has a start state to animate from */
        window.requestAnimationFrame(() => menu.classList.add("is-open"));
        lockScroll();
        const firstLink = $("a", menu);
        if (firstLink) window.setTimeout(() => firstLink.focus(), 120);
      } else {
        menu.classList.remove("is-open");
        unlockScroll();
        window.setTimeout(() => {
          if (!menu.classList.contains("is-open")) menu.hidden = true;
        }, 380);
      }
    };

    toggle.addEventListener("click", () =>
      setMenu(toggle.getAttribute("aria-expanded") !== "true")
    );

    menu.addEventListener("click", (e) => {
      if (e.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", (e) => {
      if (toggle.getAttribute("aria-expanded") !== "true") return;
      if (e.key === "Escape") {
        setMenu(false);
        toggle.focus();
      } else if (e.key === "Tab") {
        trapFocus(menu, e);
      }
    });

    /* A resize into desktop layout should not leave the overlay stranded */
    window.matchMedia("(min-width: 861px)").addEventListener("change", (e) => {
      if (e.matches && toggle.getAttribute("aria-expanded") === "true") setMenu(false);
    });
  }

  /* ------------------------------------------------------------ scrollspy */
  function initScrollSpy() {
    const links = $$("#nav-links .nav__link");
    if (!links.length || !("IntersectionObserver" in window)) return;

    const map = new Map();
    links.forEach((link) => {
      const section = document.querySelector(link.getAttribute("href"));
      if (section) map.set(section, link);
    });
    if (!map.size) return;

    const visible = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        });

        /* Highlight the topmost section currently in the reading band */
        const current = Array.from(map.keys())
          .filter((s) => visible.has(s))
          .sort((a, b) => a.offsetTop - b.offsetTop)[0];

        links.forEach((l) => l.removeAttribute("aria-current"));
        if (current) map.get(current).setAttribute("aria-current", "true");
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    map.forEach((_, section) => observer.observe(section));
  }

  /* -------------------------------------------------------- scroll reveal */
  function initReveal() {
    const items = $$(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window) || prefersReducedMotion()) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          obs.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    items.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------- count-up stats */
  function initCounters() {
    const nums = $$("[data-count-to]");
    if (!nums.length) return;

    const render = (el, value) => {
      el.textContent = value + (el.dataset.suffix || "");
    };

    if (!("IntersectionObserver" in window) || prefersReducedMotion()) {
      nums.forEach((el) => render(el, Number(el.dataset.countTo)));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = Number(el.dataset.countTo) || 0;
          const started = performance.now();
          const duration = 1400;

          const step = (now) => {
            const t = Math.min(1, (now - started) / duration);
            /* ease-out cubic so the number settles rather than stops dead */
            render(el, Math.round(target * (1 - Math.pow(1 - t, 3))));
            if (t < 1) window.requestAnimationFrame(step);
          };
          window.requestAnimationFrame(step);
          obs.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );

    nums.forEach((el) => observer.observe(el));
  }

  /* ---------------------------------------------------------- menu filter */
  function initMenuFilter() {
    const buttons = $$(".filter");
    const items = $$("#menu-grid .menu-item");
    const courses = $$("#menu-grid .menu-course");
    if (!buttons.length || !items.length) return;

    const apply = (key) => {
      items.forEach((item) => {
        item.classList.toggle("is-hidden", key !== "all" && item.dataset.category !== key);
      });
      /* Course headings only make sense while the whole menu is on show */
      courses.forEach((course) => course.classList.toggle("is-hidden", key !== "all"));
    };

    const panel = document.getElementById("menu-grid");

    const select = (btn) => {
      buttons.forEach((b) => {
        const on = b === btn;
        b.setAttribute("aria-selected", String(on));
        /* Roving tabindex: only the selected tab sits in the Tab order */
        b.setAttribute("tabindex", on ? "0" : "-1");
      });
      if (panel && btn.id) panel.setAttribute("aria-labelledby", btn.id);
      apply(btn.dataset.filter);
    };

    buttons.forEach((btn, index) => {
      btn.addEventListener("click", () => select(btn));

      /* Roving arrow-key navigation, as expected of a tablist */
      btn.addEventListener("keydown", (e) => {
        const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        const next = buttons[(index + dir + buttons.length) % buttons.length];
        next.focus();
        next.click();
      });
    });
  }

  /* ----------------------------------------------------------- order cart */
  const STORAGE_KEY = "mrtasty.order.v1";

  function initCart() {
    const drawer = $("#cart-drawer");
    const backdrop = $("#drawer-backdrop");
    const openBtn = $("#cart-open");
    const closeBtn = $("#cart-close");
    const linesEl = $("#cart-lines");
    const emptyEl = $("#cart-empty");
    const countEl = $("#cart-count");
    const checkoutBtn = $("#cart-checkout");
    if (!drawer || !linesEl) return;

    let items = load();
    let lastFocused = null;
    /* Explicit state: `hidden` is only applied after the close transition,
       so it cannot tell us whether the drawer is currently open */
    let isOpen = false;

    function load() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed)
          ? parsed.filter((i) => i && i.name && Number.isFinite(i.price) && i.qty > 0)
          : [];
      } catch (err) {
        /* Private mode, blocked storage or corrupt JSON — start clean */
        return [];
      }
    }

    function save() {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (err) {
        /* Storage is a convenience here, never a requirement */
      }
    }

    function add(name, price) {
      const existing = items.find((i) => i.name === name);
      if (existing) existing.qty += 1;
      else items.push({ name, price, qty: 1 });
      save();
      render();
      bump();
      toast(name + " added to your order", "success");
    }

    function setQty(name, delta) {
      const item = items.find((i) => i.name === name);
      if (!item) return;
      item.qty += delta;
      if (item.qty <= 0) items = items.filter((i) => i !== item);
      save();
      render();
    }

    function bump() {
      if (!openBtn || prefersReducedMotion()) return;
      openBtn.classList.remove("is-bumped");
      void openBtn.offsetWidth; /* restart the animation */
      openBtn.classList.add("is-bumped");
    }

    function render() {
      const count = items.reduce((sum, i) => sum + i.qty, 0);
      const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
      const service = subtotal * SERVICE_RATE;

      if (countEl) {
        countEl.textContent = String(count);
        countEl.classList.toggle("is-visible", count > 0);
      }
      if (openBtn) {
        openBtn.setAttribute(
          "aria-label",
          count ? "Open your order (" + count + " items)" : "Open your order"
        );
      }
      if (emptyEl) emptyEl.style.display = items.length ? "none" : "";
      if (checkoutBtn) checkoutBtn.disabled = items.length === 0;

      $("#cart-subtotal").textContent = money(subtotal);
      $("#cart-service").textContent = money(service);
      $("#cart-total").textContent = money(subtotal + service);

      linesEl.textContent = "";
      items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "cart-line";

        const name = document.createElement("p");
        name.className = "cart-line__name";
        name.textContent = item.name;

        const total = document.createElement("p");
        total.className = "cart-line__total";
        total.textContent = money(item.qty * item.price);

        const unit = document.createElement("p");
        unit.className = "cart-line__unit";
        unit.textContent = money(item.price) + " each";

        const stepper = document.createElement("div");
        stepper.className = "stepper";

        const minus = document.createElement("button");
        minus.type = "button";
        minus.textContent = "\u2212";
        minus.setAttribute("aria-label", "Remove one " + item.name);
        minus.addEventListener("click", () => setQty(item.name, -1));

        const output = document.createElement("output");
        output.textContent = String(item.qty);

        const plus = document.createElement("button");
        plus.type = "button";
        plus.textContent = "+";
        plus.setAttribute("aria-label", "Add one " + item.name);
        plus.addEventListener("click", () => setQty(item.name, 1));

        stepper.append(minus, output, plus);
        row.append(name, total, unit, stepper);
        linesEl.appendChild(row);
      });
    }

    function open() {
      if (isOpen) return;
      isOpen = true;
      lastFocused = document.activeElement;
      drawer.hidden = false;
      if (backdrop) backdrop.hidden = false;
      window.requestAnimationFrame(() => {
        drawer.classList.add("is-open");
        if (backdrop) backdrop.classList.add("is-open");
      });
      lockScroll();
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      /* Guard: close() must not release a scroll lock it does not hold */
      if (!isOpen) return;
      isOpen = false;
      drawer.classList.remove("is-open");
      if (backdrop) backdrop.classList.remove("is-open");
      unlockScroll();
      window.setTimeout(() => {
        if (drawer.classList.contains("is-open")) return;
        drawer.hidden = true;
        if (backdrop) backdrop.hidden = true;
      }, 420);
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    /* One delegated listener covers every Add button on the page */
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-add]");
      if (!btn) return;
      const price = Number(btn.dataset.price);
      if (!btn.dataset.name || !Number.isFinite(price)) return;
      add(btn.dataset.name, price);
    });

    if (openBtn) openBtn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (backdrop) backdrop.addEventListener("click", close);

    document.addEventListener("keydown", (e) => {
      if (drawer.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "Tab") trapFocus(drawer, e);
    });

    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", () => {
        if (!items.length) return;
        const count = items.reduce((sum, i) => sum + i.qty, 0);
        items = [];
        save();
        render();
        close();
        toast("Order for " + count + " item(s) sent to the pass. Ready in ~25 min.", "success");
      });
    }

    render();
  }

  /* -------------------------------------------------------- reservations */
  function initReservation() {
    const form = $("#reservation-form");
    const done = $("#reserve-done");
    const summary = $("#booking-summary");
    const again = $("#reserve-again");
    if (!form) return;

    const dateInput = $("#res-date");
    if (dateInput) {
      /* Bookings are today-or-later, and no further out than three months */
      const today = new Date();
      const iso = (d) => d.toISOString().slice(0, 10);
      const max = new Date(today);
      max.setMonth(max.getMonth() + 3);
      dateInput.min = iso(today);
      dateInput.max = iso(max);
    }

    const setError = (field, message) => {
      const box = document.getElementById("err-" + field.name);
      field.setAttribute("aria-invalid", message ? "true" : "false");
      if (box) {
        box.textContent = message || "";
        field.setAttribute("aria-describedby", box.id);
      }
      return !message;
    };

    const rules = {
      name: (v) => (v.trim().length >= 2 ? "" : "Please tell us who the table is for."),
      email: (v) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Enter a valid email address.",
      phone: (v) =>
        !v.trim() || /^[+()\-\s\d]{7,20}$/.test(v.trim()) ? "" : "Enter a valid phone number.",
      guests: (v) => {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1) return "At least one guest, please.";
        if (n > 12) return "For 13 or more, please call us directly.";
        return "";
      },
      date: (v) => {
        if (!v) return "Pick a date for your visit.";
        const chosen = new Date(v + "T00:00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return chosen < today ? "That date has already passed." : "";
      },
      time: (v) => (v ? "" : "Choose a sitting."),
      consent: (v, field) => (field.checked ? "" : "Please accept the booking terms."),
    };

    const validate = (field) => {
      const rule = rules[field.name];
      if (!rule) return true;
      return setError(field, rule(field.value, field));
    };

    /* Validate on blur, then live-correct once a field has been touched */
    $$("input, select, textarea", form).forEach((field) => {
      if (!rules[field.name]) return;
      field.addEventListener("blur", () => validate(field));
      field.addEventListener("input", () => {
        if (field.getAttribute("aria-invalid") === "true") validate(field);
      });
      field.addEventListener("change", () => {
        if (field.type === "checkbox" || field.tagName === "SELECT") validate(field);
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const fields = $$("input, select, textarea", form).filter((f) => rules[f.name]);
      const invalid = fields.filter((f) => !validate(f));

      if (invalid.length) {
        invalid[0].focus();
        toast("Please check the highlighted fields.");
        return;
      }

      const data = new FormData(form);
      const guests = Number(data.get("guests"));
      const when = new Date(data.get("date") + "T00:00:00");

      if (summary) {
        summary.textContent = "";
        const rows = [
          ["Name", String(data.get("name")).trim()],
          [
            "When",
            when.toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }) + " at " + data.get("time"),
          ],
          ["Party", guests + (guests === 1 ? " guest" : " guests")],
          ["Occasion", String(data.get("occasion") || "Just dinner")],
          ["Reference", "MT-" + Math.random().toString(36).slice(2, 7).toUpperCase()],
        ];
        rows.forEach(([label, value]) => {
          const row = document.createElement("div");
          const dt = document.createElement("dt");
          dt.textContent = label;
          const dd = document.createElement("dd");
          dd.textContent = value;
          row.append(dt, dd);
          summary.appendChild(row);
        });
      }

      form.hidden = true;
      if (done) {
        done.classList.add("is-visible");
        done.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          block: "center",
        });
      }
      toast("Reservation confirmed. Check your inbox!", "success");
    });

    if (again) {
      again.addEventListener("click", () => {
        form.reset();
        $$("[aria-invalid]", form).forEach((f) => f.setAttribute("aria-invalid", "false"));
        $$(".error", form).forEach((el) => (el.textContent = ""));
        if (done) done.classList.remove("is-visible");
        form.hidden = false;
        const first = $("#res-name");
        if (first) first.focus();
      });
    }
  }

  /* -------------------------------------------------------- testimonials */
  function initQuotes() {
    const wrap = $("#quotes");
    const dots = $("#quotes-dots");
    if (!wrap || !dots) return;

    const slides = $$(".quote", wrap);
    if (slides.length < 2) return;

    let index = 0;
    let timer = null;

    const go = (next) => {
      index = (next + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle("is-active", i === index));
      $$("button", dots).forEach((d, i) =>
        d.setAttribute("aria-selected", String(i === index))
      );
    };

    slides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-selected", String(i === 0));
      dot.setAttribute("aria-label", "Review " + (i + 1) + " of " + slides.length);
      dot.addEventListener("click", () => {
        go(i);
        restart();
      });
      dots.appendChild(dot);
    });

    const start = () => {
      /* Idempotent: mouseleave and focusout can both fire with no stop()
         in between, which used to leave orphaned intervals running */
      if (timer || prefersReducedMotion()) return;
      timer = window.setInterval(() => go(index + 1), 7000);
    };
    const stop = () => {
      window.clearInterval(timer);
      timer = null;
    };
    const restart = () => {
      stop();
      start();
    };

    /* Pause while a guest is reading or tabbing through */
    [wrap, dots].forEach((el) => {
      el.addEventListener("mouseenter", stop);
      el.addEventListener("mouseleave", start);
      el.addEventListener("focusin", stop);
      el.addEventListener("focusout", start);
    });
    document.addEventListener("visibilitychange", () =>
      document.hidden ? stop() : start()
    );

    go(0);
    start();
  }

  /* ------------------------------------------------------------ lightbox */
  function initLightbox() {
    const box = $("#lightbox");
    const img = $("#lightbox-img");
    const caption = $("#lightbox-caption");
    const triggers = $$("#gallery-grid .gallery__item");
    if (!box || !img || !triggers.length) return;

    let index = 0;
    let lastFocused = null;
    let isOpen = false;

    const show = (i) => {
      index = (i + triggers.length) % triggers.length;
      const source = $("img", triggers[index]);
      img.src = source.src;
      img.alt = source.alt;
      if (caption) caption.textContent = triggers[index].dataset.caption || source.alt;
    };

    const open = (i) => {
      if (isOpen) { show(i); return; }
      isOpen = true;
      lastFocused = document.activeElement;
      show(i);
      box.hidden = false;
      window.requestAnimationFrame(() => box.classList.add("is-open"));
      lockScroll();
      $("#lightbox-close").focus();
    };

    const close = () => {
      if (!isOpen) return;
      isOpen = false;
      box.classList.remove("is-open");
      unlockScroll();
      window.setTimeout(() => {
        if (!box.classList.contains("is-open")) box.hidden = true;
      }, 320);
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    };

    triggers.forEach((btn, i) => btn.addEventListener("click", () => open(i)));
    $("#lightbox-close").addEventListener("click", close);
    $("#lightbox-prev").addEventListener("click", () => show(index - 1));
    $("#lightbox-next").addEventListener("click", () => show(index + 1));

    box.addEventListener("click", (e) => {
      if (e.target === box) close();
    });

    document.addEventListener("keydown", (e) => {
      if (box.hidden) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(index - 1);
      else if (e.key === "ArrowRight") show(index + 1);
      else if (e.key === "Tab") trapFocus(box, e);
    });
  }

  /* -------------------------------------------- opening hours indicator */
  const HOURS = {
    0: [12 * 60, 21 * 60],
    1: [11 * 60, 22 * 60],
    2: [11 * 60, 22 * 60],
    3: [11 * 60, 22 * 60],
    4: [11 * 60, 22 * 60],
    5: [11 * 60, 23 * 60 + 30],
    6: [11 * 60, 23 * 60 + 30],
  };

  function initHours() {
    const status = $("#open-status");
    const list = $("#hours-list");
    const day = new Date().getDay();

    if (list) {
      $$("li", list).forEach((li) =>
        li.classList.toggle("is-today", Number(li.dataset.day) === day)
      );
    }
    if (!status) return;

    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const [opens, closes] = HOURS[day];
    const isOpen = minutes >= opens && minutes < closes;

    const label = (mins) =>
      String(Math.floor(mins / 60)).padStart(2, "0") + ":" + String(mins % 60).padStart(2, "0");

    status.classList.toggle("is-open", isOpen);
    status.classList.toggle("is-closed", !isOpen);

    const text = isOpen
      ? "Open now \u00b7 last orders at " + label(closes - 30)
      : minutes < opens
        ? "Closed \u00b7 opens today at " + label(opens)
        : "Closed \u00b7 opens tomorrow at " + label(HOURS[(day + 1) % 7][0]);

    status.lastElementChild.textContent = text;
  }

  /* ------------------------------------------------ newsletter & back-to-top */
  function initNewsletter() {
    const form = $("#newsletter-form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("#news-email");
      const value = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        input.setAttribute("aria-invalid", "true");
        input.focus();
        toast("That email does not look right.");
        return;
      }
      input.setAttribute("aria-invalid", "false");
      form.reset();
      toast("You are on the list. Specials land every Thursday.", "success");
    });
  }

  function initBackToTop() {
    const btn = $("#to-top");
    if (!btn) return;

    let ticking = false;
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
          btn.classList.toggle("is-visible", window.scrollY > 700);
          ticking = false;
        });
      },
      { passive: true }
    );

    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
      const brand = $(".site-header .brand");
      if (brand) brand.focus({ preventScroll: true });
    });
  }

  function initYear() {
    const el = $("#year");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ------------------------------------------------------------- bootstrap */
  function init() {
    /* Tells the inline watchdog in <head> that reveal animations are safe */
    window.__mrTastyReady = true;
    initHeader();
    initScrollSpy();
    initReveal();
    initCounters();
    initMenuFilter();
    initCart();
    initReservation();
    initQuotes();
    initLightbox();
    initHours();
    initNewsletter();
    initBackToTop();
    initYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
