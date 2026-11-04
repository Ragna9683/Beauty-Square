"use strict";
const D = window.SALON,
  $ = (s) => document.querySelector(s),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const all = D.categories.flatMap((c) =>
  c.services.map((s) => ({ ...s, category: c.name, categoryId: c.id })),
);
let category = "all",
  query = "",
  sort = "default";
const normalize = (s) =>
  s
    .toLocaleLowerCase("pl")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l");
const time = (n) =>
  n >= 60
    ? `${Math.floor(n / 60)} godz.${n % 60 ? " " + (n % 60) + " min" : ""}`
    : `${n} min`;
const duration = (s) => {
  const v = s.variants.map((v) => v.duration),
    min = Math.min(...v),
    max = Math.max(...v);
  return min === max ? time(min) : `${time(min)} – ${time(max)}`;
};
const plain = (s) =>
  String(s || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*/g, "")
    .replace(/\\_/g, "_");
document.querySelectorAll(".booksy").forEach((a) => {
  a.href = D.source;
  a.target = "_blank";
  a.rel = "noopener";
});
$("#rating").textContent = D.rating.toFixed(1).replace(".", ",");
$("#review-count").textContent = D.count;
$("#categories").innerHTML = [
  { id: "all", name: "Wszystkie usługi", services: all },
  ...D.categories,
]
  .map(
    (c) =>
      `<button data-category="${c.id}" aria-pressed="${c.id === "all"}">${esc(c.name.split(" / ")[0])}<span>${c.services.length}</span></button>`,
  )
  .join("");
function render() {
  let list = all.filter(
    (s) =>
      (category === "all" || String(s.categoryId) === category) &&
      normalize(
        s.name +
          " " +
          s.category +
          " " +
          s.variants.map((v) => v.name).join(" "),
      ).includes(normalize(query)),
  );
  if (sort === "price")
    list.sort(
      (a, b) =>
        Math.min(...a.variants.map((v) => v.amount ?? 0)) -
        Math.min(...b.variants.map((v) => v.amount ?? 0)),
    );
  if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "pl"));
  $("#category-title").textContent =
    category === "all"
      ? "Wszystkie usługi"
      : D.categories
          .find((c) => String(c.id) === category)
          .name.split(" / ")[0];
  $("#result-count").textContent = `Wyniki: ${list.length}`;
  $("#service-list").innerHTML = list.length
    ? list
        .map(
          (s) =>
            `<article class="service-card"><div><span class="service-category">${esc(s.category.split(" / ")[0])}</span><button class="service-name" data-service="${s.id}">${esc(s.name)}</button><div class="service-meta"><span>◷ ${duration(s)}</span>${s.variants.length > 1 ? `<span>${s.variants.length} warianty</span>` : ""}${s.addons ? "<span>Dostępne dodatki</span>" : ""}</div></div><div class="service-aside"><span class="service-price">${esc(s.price)}</span><button data-service="${s.id}" aria-label="Szczegóły: ${esc(s.name)}">Szczegóły ↗</button></div></article>`,
        )
        .join("")
    : '<div class="empty"><h3>Nie znaleziono usługi</h3><p>Spróbuj innej nazwy lub zobacz wszystkie kategorie.</p><button class="button" id="reset-filters">Wyczyść filtry</button></div>';
  $("#clear-search").hidden = !query;
  document
    .querySelectorAll("[data-category]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.category === category)),
    );
}
$("#categories").addEventListener("click", (e) => {
  const b = e.target.closest("[data-category]");
  if (b) {
    category = b.dataset.category;
    render();
  }
});
$("#search").addEventListener("input", (e) => {
  query = e.target.value;
  render();
});
$("#sort").addEventListener("change", (e) => {
  sort = e.target.value;
  render();
});
$("#clear-search").addEventListener("click", () => {
  query = "";
  $("#search").value = "";
  render();
  $("#search").focus();
});
const dialog = $("#detail-dialog");
let restoreFocus;
function showDialog(html) {
  restoreFocus = document.activeElement;
  $("#dialog-content").innerHTML = html;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
    dialog.animate(
      [
        { opacity: 0, transform: "translateY(16px) scale(.98)" },
        { opacity: 1, transform: "translateY(0) scale(1)" },
      ],
      { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" },
    );
}
function openService(id) {
  const s = all.find((s) => s.id === Number(id));
  if (!s) return;
  showDialog(
    `<span class="dialog-category">${esc(s.category)}</span><h2 id="dialog-title">${esc(s.name)}</h2><div class="variants">${s.variants.map((v) => `<div class="variant"><div>${esc(v.name || s.name)}<p>${time(v.duration)}</p></div><strong>${esc(v.price)}</strong></div>`).join("")}</div>${s.addons ? '<p class="small-note">Dostępne dodatki. Ich ceny i wybór sprawdzisz w Booksy.</p>' : ""}${s.description ? `<details><summary>Pełny opis z Booksy <span>+</span></summary><div class="dialog-description">${esc(plain(s.description))}</div></details>` : ""}${s.photos.length ? `<div class="dialog-photos">${s.photos.map((p) => `<button data-photo="${p}" data-alt="${esc(s.name)}" aria-label="Powiększ zdjęcie usługi"><img src="${p}" alt="${esc(s.name)}" loading="lazy"></button>`).join("")}</div>` : ""}<div class="dialog-book"><p>Termin, specjalistkę i ostateczną cenę wybierzesz w Booksy.</p><a class="button" href="${D.source}" target="_blank" rel="noopener">Przejdź do rezerwacji ↗</a></div>`,
  );
}
document.addEventListener("click", (e) => {
  const s = e.target.closest("[data-service]");
  if (s) openService(s.dataset.service);
  const p = e.target.closest("[data-photo]");
  if (p) {
    $("#large-photo").src = p.dataset.photo;
    $("#large-photo").alt = p.dataset.alt || "Zdjęcie salonu";
    $("#photo-caption").textContent =
      p.dataset.alt || "Beauty Square 19 · Booksy";
    $("#photo-dialog").showModal();
  }
  const staff = e.target.closest("[data-staff]");
  if (staff) {
    const p = D.staff.find((p) => p.id === Number(staff.dataset.staff));
    showDialog(
      `<img class="staff-portrait" src="${p.photo}" alt="${esc(p.name)}"><span class="dialog-category">ZESPÓŁ BEAUTY SQUARE 19</span><h2 id="dialog-title">${esc(p.name)}</h2><p class="dialog-description">${esc(plain(p.bio) || "Profil specjalistki i dostępność terminów znajdziesz w Booksy.")}</p><div style="clear:both"></div><a class="button" href="${D.source}" target="_blank" rel="noopener">Sprawdź dostępność w Booksy ↗</a>`,
    );
  }
  if (e.target.closest("#reset-filters")) {
    category = "all";
    query = "";
    $("#search").value = "";
    render();
  }
  if (e.target.closest(".close-dialog")) e.target.closest("dialog").close();
});
document.querySelectorAll("dialog").forEach((d) => {
  d.addEventListener("click", (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        d.close();
    }
  });
});
dialog.addEventListener("close", () => restoreFocus?.focus());
$("#consultation").addEventListener("click", () =>
  openService(all.find((s) => /Konsultacja/.test(s.name)).id),
);
$("#gallery-strip").innerHTML = [...D.gallery, ...D.interiors]
  .map(
    (p, i) =>
      `<button class="gallery-item" data-photo="${p.src}" data-alt="${esc(p.alt)}" aria-label="Powiększ zdjęcie ${i + 1}"><img src="${p.src}" alt="${esc(p.alt)}" loading="lazy"><span>↗</span></button>`,
  )
  .join("");
for (const [id, sign] of [
  ["gallery-next", 1],
  ["gallery-prev", -1],
])
  $("#" + id).addEventListener("click", () =>
    $("#gallery-strip").scrollBy({
      left: sign * 330,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    }),
  );
$("#team").innerHTML = D.staff
  .map(
    (p) =>
      `<button class="team-card" data-staff="${p.id}"><img src="${p.photo}" alt="${esc(p.name)}" loading="lazy"><h3>${esc(p.name.split(" ")[0].replace(/[^\p{L}]/gu, ""))}<span>↗</span></h3><p>${p.name.includes("freelancer") ? "Freelancer · " : ""}Poznaj profil w Booksy</p></button>`,
  )
  .join("");
const days = [
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
  "Niedziela",
];
$("#hours").innerHTML = days
  .map((day, i) => {
    const h = D.hours.find((h) => h.dayOfWeek === i + 1);
    return `<div class="hours-row"><span>${day}</span><span>${h ? h.openFrom + " – " + h.openTill : "Zamknięte"}</span></div>`;
  })
  .join("");
$("#hours-note").textContent = D.hoursNote;
$("#amenities").innerHTML =
  "<ul>" +
  D.amenities.map((a) => `<li>${esc(a.label)}</li>`).join("") +
  "</ul>";
$("#policy-button").addEventListener("click", () =>
  showDialog(
    `<span class="dialog-category">ŹRÓDŁO: BOOKSY · 04.11.2026</span><h2 id="dialog-title">Zasady wizyty</h2><div class="dialog-description">${esc(D.policy)}</div><p class="small-note">Przed rezerwacją potwierdź aktualne zasady w Booksy.</p>`,
  ),
);
$("#source-button").addEventListener("click", () =>
  showDialog(
    `<h2 id="dialog-title">O tej prezentacji</h2><p>To niezależna koncepcja strony przygotowana przez Yaroslav do prezentacji właścicielom Beauty Square 19. Nie jest oficjalną witryną salonu.</p><p>Katalog obejmuje wszystkie ${all.length} usług i ${all.reduce((n, s) => n + s.variants.length, 0)} wariantów w ${D.categories.length} kategoriach dostępnych w danych profilu Booksy w dniu 04.11.2026. Opisy, ceny, czas trwania, zdjęcia, godziny i profile zespołu pochodzą z tego profilu.</p><p>Dane nie aktualizują się automatycznie. Nie przyjmujemy rezerwacji ani płatności. Wszystkie zapisy odbywają się bezpośrednio w Booksy.</p><p>Zdjęcia wykorzystano do prywatnej prezentacji. Publikacja komercyjna wymaga uzgodnienia praw z salonem.</p><a class="text-link" href="${D.source}" target="_blank" rel="noopener">Profil źródłowy Booksy ↗</a>`,
  ),
);
const menu = $(".menu-toggle");
menu.addEventListener("click", () => {
  const expanded = menu.getAttribute("aria-expanded") !== "true";
  menu.setAttribute("aria-expanded", expanded);
  menu.setAttribute("aria-label", expanded ? "Zamknij menu" : "Otwórz menu");
  $("#nav-links").classList.toggle("open", expanded);
});
$("#nav-links").addEventListener("click", (e) => {
  if (e.target.closest("a")) {
    menu.setAttribute("aria-expanded", "false");
    $("#nav-links").classList.remove("open");
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    $("#nav-links").classList.remove("open");
    menu.setAttribute("aria-expanded", "false");
  }
});
render();
