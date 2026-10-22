const toast = document.querySelector(".toast");
const isHomePage = location.pathname.endsWith("/index.html") || location.pathname.endsWith("/");
let toastTimer;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

function readSessionList(key) {
  const value = sessionStorage.getItem(key);
  if (!value) return [];
  const parsed = JSON.parse(value);
  return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
}

function writeSessionList(key, items) {
  sessionStorage.setItem(key, JSON.stringify([...new Set(items)]));
}

function updateInquiryCount() {
  const count = readSessionList("looploom-inquiries").length;
  const cta = document.querySelector(".primary-nav .nav-cta");
  if (!cta) return;
  let badge = cta.querySelector(".nav-quote-count");
  if (count && !badge) {
    badge = document.createElement("span");
    badge.className = "nav-quote-count";
    badge.setAttribute("aria-label", `${count} service${count === 1 ? "" : "s"} added to inquiry`);
    cta.insertBefore(badge, cta.lastElementChild);
  }
  if (badge) {
    badge.textContent = String(count);
    badge.hidden = count === 0;
    badge.setAttribute("aria-label", `${count} service${count === 1 ? "" : "s"} added to inquiry`);
  }
}

function updateSavedCount() {
  const saved = readSessionList("looploom-saved");
  document.querySelectorAll("[data-save]").forEach((button) => {
    const isSaved = saved.includes(button.dataset.save);
    button.setAttribute("aria-pressed", String(isSaved));
    button.textContent = isSaved ? "♥" : "♡";
  });
  const label = document.querySelector(".saved-count-label");
  if (label) label.textContent = saved.length ? `${saved.length} saved this session` : "";
}

function updateSelectedInquiries() {
  const container = document.querySelector("[data-selected-inquiries]");
  if (!container) return;
  const items = readSessionList("looploom-inquiries");
  container.hidden = items.length === 0;
  container.replaceChildren();
  if (!items.length) return;
  const heading = document.createElement("strong");
  heading.textContent = "Added from the studio menu";
  const list = document.createElement("ul");
  items.forEach((item) => {
    const row = document.createElement("li");
    row.textContent = item;
    list.append(row);
  });
  container.append(heading, list);
}

document.querySelectorAll(".menu-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const nav = document.getElementById(button.getAttribute("aria-controls"));
    const isOpen = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!isOpen));
    button.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
    nav?.classList.toggle("is-open", !isOpen);
  });
});

document.querySelectorAll(".primary-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    const nav = link.closest(".primary-nav");
    const toggle = document.querySelector(".menu-toggle");
    nav?.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
    toggle?.setAttribute("aria-label", "Open navigation");
  });
});

if (isHomePage) {
  function scrollToHomeSection(hash, behavior = "instant") {
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target) return false;
    target.scrollIntoView({ behavior, block: "start" });
    updateScrollControls();
    saveSessionScroll();
    return true;
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    if (!document.getElementById(decodeURIComponent(link.hash.slice(1)))) return;
    event.preventDefault();
    if (location.hash !== link.hash) history.pushState({ section: link.hash }, "", link.hash);
    scrollToHomeSection(link.hash, "instant");
  });

  window.addEventListener("popstate", () => {
    if (location.hash) scrollToHomeSection(location.hash, "instant");
    else window.scrollTo({ top: 0, behavior: "instant" });
  });

  if (location.hash) {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      scrollToHomeSection(location.hash, "instant");
      updateScrollControls();
    }));
  }
}

document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    document.querySelectorAll(".filter-button").forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    let visible = 0;
    document.querySelectorAll(".gallery-card").forEach((card) => {
      const show = filter === "all" || card.dataset.category === filter;
      card.hidden = !show;
      if (show) visible += 1;
    });
    const empty = document.querySelector(".gallery-empty");
    if (empty) empty.hidden = visible > 0;
  });
});

document.querySelectorAll("[data-save]").forEach((button) => {
  button.addEventListener("click", () => {
    const saved = readSessionList("looploom-saved");
    const name = button.dataset.save;
    const updated = saved.includes(name) ? saved.filter((item) => item !== name) : [...saved, name];
    writeSessionList("looploom-saved", updated);
    updateSavedCount();
    showToast(updated.includes(name) ? `${name} saved for this session.` : `${name} removed from your saved pieces.`);
  });
});

document.querySelector(".clear-saved")?.addEventListener("click", () => {
  writeSessionList("looploom-saved", []);
  updateSavedCount();
  showToast("Your saved pieces have been cleared.");
});

document.querySelectorAll(".inquiry-add").forEach((button) => {
  button.addEventListener("click", () => {
    const inquiries = readSessionList("looploom-inquiries");
    if (inquiries.includes(button.dataset.inquiry)) {
      showToast("That idea is already on your inquiry list.");
      return;
    }
    writeSessionList("looploom-inquiries", [...inquiries, button.dataset.inquiry]);
    updateInquiryCount();
    showToast(`${button.dataset.inquiry} added to your inquiry.`);
  });
});

const inquiryForm = document.querySelector("[data-inquiry-form]");
if (inquiryForm) {
  const draftKey = "looploom-inquiry-draft";
  const status = document.querySelector("[data-draft-status]");
  const message = document.querySelector("[data-form-message]");

  function saveDraft() {
    const values = Object.fromEntries(new FormData(inquiryForm).entries());
    values.updates = inquiryForm.elements.updates.checked;
    sessionStorage.setItem(draftKey, JSON.stringify(values));
    if (status) status.textContent = "Draft saved for this session";
  }

  const savedDraft = sessionStorage.getItem(draftKey);
  if (savedDraft) {
    const values = JSON.parse(savedDraft);
    Object.entries(values).forEach(([name, value]) => {
      const field = inquiryForm.elements.namedItem(name);
      if (!field) return;
      if (field.type === "checkbox") field.checked = value === true;
      else field.value = String(value);
    });
    if (status) status.textContent = "Your session draft has been restored";
  }

  inquiryForm.addEventListener("input", saveDraft);
  inquiryForm.addEventListener("change", saveDraft);
  inquiryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!inquiryForm.reportValidity()) return;
    saveDraft();
    const data = new FormData(inquiryForm);
    const services = readSessionList("looploom-inquiries");
    const lines = [
      `Name: ${data.get("name")}`,
      `Email: ${data.get("email")}`,
      `Project: ${data.get("project")}`,
      ...(services.length ? [`Also interested in: ${services.join(", ")}`] : []),
      `Studio updates requested: ${data.get("updates") ? "Yes" : "No"}`,
      "",
      data.get("message") || "I'd love to talk about a custom piece."
    ];
    const subject = encodeURIComponent(`A little idea from ${data.get("name")}`);
    const body = encodeURIComponent(lines.join("\n"));
    if (message) message.textContent = "Your email draft is ready. It has not been sent yet.";
    window.location.href = `mailto:hello@twist&tangle.studio?subject=${subject}&body=${body}`;
  });
}

document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

const backToTop = document.createElement("button");
backToTop.className = "back-to-top";
backToTop.type = "button";
backToTop.setAttribute("aria-label", "Back to top");
backToTop.textContent = "↑";
document.body.append(backToTop);

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "instant" });
});

const sectionLinks = isHomePage
  ? Array.from(document.querySelectorAll('.primary-nav a[href^="#"]'))
  : [];

let scrollUpdatePending = false;
let scrollSaveTimer;
const scrollStorageKey = `looploom-scroll:${location.pathname}`;

function saveSessionScroll() {
  sessionStorage.setItem(scrollStorageKey, JSON.stringify({
    x: window.scrollX,
    y: window.scrollY
  }));
}

function updateScrollControls() {
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0;
  document.documentElement.style.setProperty("--scroll-progress", `${progress}%`);
  backToTop.classList.toggle("is-visible", window.scrollY > 450);
  if (sectionLinks.length) {
    const headerOffset = document.querySelector(".site-header")?.offsetHeight || 0;
    const activePosition = window.scrollY + headerOffset + 120;
    let activeId = sectionLinks[0].hash.slice(1);
    sectionLinks.forEach((link) => {
      const section = document.getElementById(link.hash.slice(1));
      if (section && section.getBoundingClientRect().top + window.scrollY <= activePosition) {
        activeId = section.id;
      }
      if (link.hash === `#${activeId}`) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }
  scrollUpdatePending = false;
}

window.addEventListener("scroll", () => {
  window.clearTimeout(scrollSaveTimer);
  scrollSaveTimer = window.setTimeout(saveSessionScroll, 120);
  if (scrollUpdatePending) return;
  scrollUpdatePending = true;
  window.requestAnimationFrame(updateScrollControls);
}, { passive: true });
window.addEventListener("pagehide", saveSessionScroll);
window.addEventListener("resize", updateScrollControls);
window.addEventListener("pageshow", (event) => {
  const navigation = performance.getEntriesByType("navigation")[0];
  if (!event.persisted && !location.hash && navigation?.type === "reload") {
    const savedPosition = JSON.parse(sessionStorage.getItem(scrollStorageKey) || "null");
    if (savedPosition && Number.isFinite(savedPosition.y)) {
      window.requestAnimationFrame(() => window.scrollTo({
        left: Number.isFinite(savedPosition.x) ? savedPosition.x : 0,
        top: savedPosition.y,
        behavior: "instant"
      }));
    }
  }
  updateScrollControls();
});
updateScrollControls();

updateInquiryCount();
updateSavedCount();
updateSelectedInquiries();
