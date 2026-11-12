/* Aboiz GitHub Pages: interfaz pública. Ningún resultado o secreto se almacena aquí. */
(() => {
  "use strict";

  const app = document.getElementById("app");
  const categories = [
    ["moda", "Ropa y complementos", "Tallas, colores o estilos favoritos"],
    ["belleza", "Belleza y cuidado", "Perfumes, cosmética o autocuidado"],
    ["hogar", "Hogar y cocina", "Decoración, utensilios o pequeños caprichos"],
    ["ocio", "Libros y entretenimiento", "Lecturas, música, cine o juegos"],
    ["tecnologia", "Tecnología", "Accesorios y pequeños dispositivos"],
    ["gastronomia", "Gastronomía", "Sabores, productos o experiencias"],
    ["aficiones", "Aficiones", "Deporte, naturaleza y tiempo libre"]
  ];
  const config = window.ABOIZ_CONFIG || {};
  const apiUrl = String(config.apiUrl || "/api/aboiz26").trim();
  const eventYear = String(config.year || 2026);
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
  const initials = name => String(name || "?").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
  const avatarHue = name => [...String(name || "")].reduce((total, char) => (total * 31 + char.charCodeAt(0)) % 360, 34);

  const state = {
    view: "home",
    section: "overview",
    loginMode: "",
    token: sessionStorage.getItem("aboiz_auth") || "",
    role: sessionStorage.getItem("aboiz_role") || "",
    info: null,
    opened: false,
    opening: false,
    wishDecisionMade: false,
    wishOnboarding: false,
    notice: "",
    error: "",
    busy: false,
    lastIssued: null,
    peopleFilter: "active",
    peopleSearch: "",
    modal: null,
    celebrating: false
  };

  const button = (action, label, className = "btn", extra = "") =>
    `<button type="button" class="${className}" data-action="${action}" ${extra}>${label}</button>`;
  const card = (content, className = "") => `<section class="card ${className}">${content}</section>`;
  const statusMessages = () =>
    `${state.error ? `<div class="error" role="alert">${escapeHtml(state.error)}</div>` : ""}${state.notice ? `<div class="success" role="status">${escapeHtml(state.notice)}</div>` : ""}`;
  const roleName = () => state.role === "admin" ? "Joseba · Administración" : state.role === "manager" ? "David · Participantes" : "Mi amigo invisible";

  function setMessage(error = "", notice = "") {
    state.error = error;
    state.notice = notice;
  }

  function celebrate() {
    state.celebrating = true;
    window.setTimeout(() => { state.celebrating = false; if (state.view === "panel") render(); }, 2400);
  }

  function celebrationLayer() {
    if (!state.celebrating) return "";
    return `<div class="celebration" aria-hidden="true">${Array.from({length:24},(_,i)=>`<i style="--i:${i};--x:${(i*43)%100}%;--d:${(i%7)*.08}s;--r:${(i*71)%360}deg"></i>`).join("")}<span>✦</span></div>`;
  }

  function setContent(html) {
    app.innerHTML = html;
    document.body.classList.toggle("has-panel-nav", state.view === "panel");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  async function request(action, params = {}) {
    if (!( /^https:\/\/[^\s]+\/_functions\/aboiz26\/?$/.test(apiUrl) || apiUrl === "/api/aboiz26" )) {
      throw new Error("La URL del backend no es válida. Revisa config.js.");
    }
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      referrerPolicy: "no-referrer",
      body: JSON.stringify({ action, token: state.token, ...params })
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("Wix no devolvió una respuesta válida.");
    }
    if (!response.ok) throw new Error(data.error || "Error de conexión");
    return data;
  }

  async function task(work) {
    if (state.busy) return;
    state.busy = true;
    setMessage();
    render();
    try {
      await work();
    } catch (error) {
      setMessage(error.message || "Error inesperado");
    } finally {
      state.busy = false;
      render();
    }
  }

  function renderHome() {
    return card(`
      <div class="eyebrow">Edición ${escapeHtml(eventYear)}</div>
      <h2>Elige tu acceso</h2>
      <p class="lead">Cada persona entra únicamente en la parte que necesita.</p>
      ${statusMessages()}
      <div class="access-grid">
        <button class="access-card admin" type="button" data-action="choose-admin">
          <span class="access-icon" aria-hidden="true">✦</span>
          <span><b>Joseba</b><small>Organización, sorteo, códigos y resultados</small></span><i>›</i>
        </button>
        <button class="access-card manager" type="button" data-action="choose-manager">
          <span class="access-icon" aria-hidden="true">◎</span>
          <span><b>David</b><small>Altas, cambios y seguimiento de participantes</small></span><i>›</i>
        </button>
        <button class="access-card guest" type="button" data-action="choose-guest">
          <span class="access-icon" aria-hidden="true">◈</span>
          <span><b>Tengo un código</b><small>Descubrir a quién regalo y guardar mis deseos</small></span><i>›</i>
        </button>
      </div>
      <div class="privacy-note"><span aria-hidden="true">⌁</span><p><b>Acceso privado.</b> No compartas contraseñas, códigos ni capturas del resultado.</p></div>
    `, "home-card");
  }

  function renderLogin() {
    const isAdmin = state.loginMode === "admin";
    return card(`
      <button type="button" class="back-link" data-action="home">← Volver</button>
      <div class="login-mark ${isAdmin ? "admin" : "manager"}">${isAdmin ? "✦" : "◎"}</div>
      <div class="eyebrow">${isAdmin ? "Acceso de organización" : "Gestión de participantes"}</div>
      <h2>${isAdmin ? "Hola, Joseba" : "Hola, David"}</h2>
      <p class="lead">${isAdmin ? "Desde aquí controlas el sorteo y los códigos personales." : "Desde aquí mantienes la lista de participantes, sin ver emparejamientos."}</p>
      ${statusMessages()}
      <form id="login-form" class="stack-form">
        <label class="f">Contraseña
          <input class="in" name="password" type="password" minlength="16" autocomplete="current-password" required autofocus>
        </label>
        <button class="btn primary big" type="submit">Entrar de forma segura</button>
      </form>
    `, "compact login-card");
  }

  function renderCodeLogin() {
    return card(`
      <button type="button" class="back-link" data-action="home">← Volver</button>
      <div class="login-mark guest">◈</div>
      <div class="eyebrow">Acceso personal</div>
      <h2>Abre tu invitación</h2>
      <p class="lead">Introduce el código que te ha enviado Joseba. Es personal y se puede revocar.</p>
      ${statusMessages()}
      <form id="code-form" class="stack-form">
        <label class="f">Código personal
          <input class="in code-input" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" required placeholder="AB26-…">
        </label>
        <button class="btn primary big" type="submit">Entrar</button>
      </form>
      <p class="small center-copy">Si tu código no funciona, pide uno nuevo a Joseba.</p>
    `, "compact login-card");
  }

  function sectionButton(section, label, icon) {
    return `<button type="button" data-action="section:${section}" ${state.section === section ? 'aria-current="page"' : ""}><span aria-hidden="true">${icon}</span><small>${label}</small></button>`;
  }

  function panelNavigation() {
    let items;
    if (state.role === "admin") {
      items = [
        ["overview", "Inicio", "⌂"], ["event", "Evento", "◷"], ["people", "Gente", "♙"], ["draw", "Sorteo", "✦"],
        ["delivery", "Entrega", "⌁"], ["wishes", "Deseos", "♡"]
      ];
    } else if (state.role === "manager") {
      items = [["overview", "Inicio", "⌂"], ["people", "Personas", "♙"], ["wishes", "Deseos", "♡"]];
    } else {
      items = [["reveal", "Mi regalo", "◈"], ["wishes", "Mis deseos", "♡"], ["help", "Ayuda", "?"]];
    }
    return `<nav aria-label="Secciones de ${escapeHtml(roleName())}"><div class="bar">${items.map(item => sectionButton(...item)).join("")}</div></nav>`;
  }

  function panelHeader() {
    return card(`
      <div class="panel-head">
        <div>
          <div class="eyebrow">${state.role === "guest" ? "Invitación personal" : "Panel privado"}</div>
          <h2>${escapeHtml(roleName())}</h2>
        </div>
        ${button("logout", "Salir", "btn quiet")}
      </div>
      ${statusMessages()}
    `, "panel-heading");
  }

  function metric(value, label, tone = "") {
    return `<article class="metric ${tone}"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></article>`;
  }

  function staffOverview() {
    const data = state.info;
    const active = data.people.filter(person => person.active);
    const codes = active.filter(person => person.hasCode).length;
    const wishes = active.filter(person => person.hasWish).length;
    const minimumReady = active.length >= 3;
    return `
      ${card(`
        <div class="section-title"><div><div class="eyebrow">Resumen</div><h2>Todo de un vistazo</h2></div><span class="status-pill ${data.drawReady ? "live" : "pending"}">${data.drawReady ? "Sorteo realizado" : "Preparación"}</span></div>
        <div class="metrics">
          ${metric(active.length, "participantes activos", "green")}
          ${metric(wishes, "listas con deseos", "gold")}
          ${state.role === "admin" ? metric(codes, "códigos emitidos", "rose") : metric(data.people.length - active.length, "retirados", "muted")}
        </div>
      `)}
      ${card(`
        <h3>${data.drawReady ? "El sorteo está protegido" : "Siguiente paso"}</h3>
        <div class="journey">
          <div class="journey-step done"><b>1</b><span><strong>Preparar la lista</strong><small>${active.length} personas activas</small></span></div>
          <div class="journey-step ${minimumReady ? "done" : ""}"><b>2</b><span><strong>Mínimo de tres</strong><small>${minimumReady ? "Ya se puede sortear" : "Faltan " + (3 - active.length)}</small></span></div>
          <div class="journey-step ${data.drawReady ? "done" : ""}"><b>3</b><span><strong>Realizar el sorteo</strong><small>${data.drawReady ? "Resultados guardados en Wix" : "Solo Joseba puede hacerlo"}</small></span></div>
          <div class="journey-step ${codes ? "done" : ""}"><b>4</b><span><strong>Entregar códigos</strong><small>${codes} de ${active.length} generados</small></span></div>
        </div>
        <div class="btns">
          ${button("section:people", "Gestionar participantes", "btn primary")}
          ${state.role === "admin" ? button("section:" + (data.drawReady ? "delivery" : "draw"), data.drawReady ? "Preparar entregas" : "Ir al sorteo") : button("section:wishes", "Ver seguimiento")}
        </div>
      `)}
      ${state.role === "manager" ? card(`<h3>Qué puede hacer David</h3><ul class="plain-list"><li>Añadir, corregir o retirar personas antes del sorteo.</li><li>Comprobar quién ha preparado su lista de deseos.</li><li>No puede ver parejas, generar códigos ni anular el sorteo.</li></ul>`, "role-explainer") : ""}
    `;
  }

  function personActions(person, drawReady) {
    if (drawReady || !person.active) return "";
    return `<div class="person-actions">${button("edit:" + person._id, "Editar", "btn mini")}${button("remove:" + person._id, "Retirar", "btn mini danger")}</div>`;
  }

  function adminEvent() {
    const event = state.info.event || {};
    return card(`<div class="eyebrow">Evento</div><h2>Datos de la celebración</h2><p class="lead">Estos datos aparecen en las invitaciones y en el acceso personal.</p>
      <form id="event-form" class="stack-form">
        <label class="f">Nombre del evento<input class="in" name="name" maxlength="100" required value="${escapeHtml(event.name || "Amigo invisible Aboiz")}"></label>
        <div class="grid2"><label class="f">Fecha<input class="in" type="date" name="date" value="${escapeHtml(event.date || "")}"></label><label class="f">Lugar<input class="in" name="place" maxlength="160" value="${escapeHtml(event.place || "")}"></label></div>
        <div class="grid2"><label class="f">Presupuesto mínimo (€)<input class="in" type="number" min="0" max="10000" name="min" value="${escapeHtml(event.min ?? 40)}"></label><label class="f">Presupuesto máximo (€)<input class="in" type="number" min="0" max="10000" name="max" value="${escapeHtml(event.max ?? 50)}"></label></div>
        <label class="f">Mensaje común<textarea name="message" maxlength="650" placeholder="Indicaciones para todo el grupo…">${escapeHtml(event.message || "")}</textarea></label>
        <label class="f">Enlace de la app<input class="in" type="url" name="appUrl" maxlength="300" value="${escapeHtml(event.appUrl || location.href)}"></label>
        <button class="btn primary" type="submit">Guardar datos del evento</button>
      </form>`);
  }

  function filteredPeople() {
    const query = state.peopleSearch.trim().toLocaleLowerCase("es");
    return state.info.people.filter(person => {
      const matchesFilter = state.peopleFilter === "all" || (state.peopleFilter === "active" ? person.active : !person.active);
      const matchesQuery = !query || person.name.toLocaleLowerCase("es").includes(query) || String(person.email || "").toLocaleLowerCase("es").includes(query);
      return matchesFilter && matchesQuery;
    });
  }

  function staffPeople() {
    const data = state.info;
    const people = filteredPeople();
    return `
      ${card(`
        <div class="section-title"><div><div class="eyebrow">Participantes</div><h2>Lista de la edición</h2></div><span class="count-badge">${data.people.filter(person => person.active).length} activos</span></div>
        ${data.drawReady ? `<div class="warn"><b>Lista bloqueada.</b> Para modificar personas, Joseba debe anular primero el sorteo.</div>` : `
          <form id="add-form" class="add-person-form">
            <label class="f">Nombre<input class="in" name="name" required minlength="2" maxlength="100" placeholder="Nombre y apellidos"></label>
            <label class="f">Correo opcional<input type="email" class="in" name="email" maxlength="160" placeholder="nombre@correo.com"></label>
            <button class="btn primary" type="submit">Añadir participante</button>
          </form>
        `}
      `)}
      ${card(`
        <div class="people-toolbar">
          <div class="segmented" aria-label="Filtrar participantes">
            ${["active", "all", "inactive"].map(filter => button("filter:" + filter, filter === "active" ? "Activos" : filter === "all" ? "Todos" : "Retirados", "segment " + (state.peopleFilter === filter ? "selected" : ""))).join("")}
          </div>
          <label class="search-field"><span class="sr-only">Buscar</span><input id="people-search" class="in" type="search" value="${escapeHtml(state.peopleSearch)}" placeholder="Buscar persona…"></label>
        </div>
        <div class="people-list">
          ${people.length ? people.map((person, index) => `
            <article class="person-row ${person.active ? "" : "inactive"}">
              <span class="person-avatar" style="--avatar-hue: ${(index * 47 + 24) % 360}">${escapeHtml(initials(person.name))}</span>
              <div class="person-main"><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(person.email || "Sin correo")}</small></div>
              <div class="person-flags">
                <span class="mini-pill ${person.hasWish ? "yes" : ""}">${person.hasWish ? "♡ Deseos" : "Sin deseos"}</span>
                ${state.role === "admin" && data.drawReady && person.active ? `<span class="mini-pill ${person.hasCode ? "yes" : ""}">${person.hasCode ? "⌁ Código" : "Sin código"}</span>` : ""}
                <span class="mini-pill ${person.active ? "active" : "off"}">${person.active ? "Activo" : "Retirado"}</span>
              </div>
              ${personActions(person, data.drawReady)}
            </article>
          `).join("") : `<div class="empty-state"><b>No hay resultados</b><span>Prueba con otro filtro o búsqueda.</span></div>`}
        </div>
      `)}
    `;
  }

  function drawRing(people) {
    const active = people.filter(person => person.active);
    const points = active.slice(0, 16).map((person, index, list) => {
      const angle = (Math.PI * 2 * index / list.length) - Math.PI / 2;
      const left = 50 + Math.cos(angle) * 40;
      const top = 50 + Math.sin(angle) * 40;
      return `<span class="av" style="left:${left}%;top:${top}%;--i:${index};--avatar-hue:${avatarHue(person.name)}" title="${escapeHtml(person.name)}">${escapeHtml(initials(person.name))}</span>`;
    }).join("");
    return `<div class="ringwrap">${points}<div class="center"><span class="draw-star">✦</span><b>${active.length} personas</b><small>sin autoasignaciones</small></div></div>`;
  }

  function adminDraw() {
    const data = state.info;
    const active = data.people.filter(person => person.active);
    if (!data.drawReady) {
      return `
        ${card(`<div class="eyebrow">Sorteo</div><h2>Preparar el momento</h2><p class="lead">El sorteo crea una asignación secreta para cada participante y bloquea la lista.</p>${drawRing(active)}
          <form id="draw-options-form" class="stack-form draw-options"><label class="toggle"><input type="checkbox" name="noMutual" ${data.options?.noMutual !== false ? "checked" : ""}> Evitar parejas recíprocas (A regala a B y B a A)</label><button class="btn" type="submit">Guardar regla</button></form>
          <div class="check-list"><p class="${active.length >= 3 ? "checked" : ""}">Hay al menos tres participantes activos</p><p class="checked">Nadie puede regalarse a sí mismo</p><p class="checked">Se respetan las exclusiones personales</p><p class="checked">Los resultados solo serán visibles para Joseba</p></div><div class="btns"><button class="btn" type="button" data-action="testDraw" ${active.length < 3 ? "disabled" : ""}>Probar reglas sin guardar</button><button class="btn primary" type="button" data-action="draw" ${active.length < 3 ? "disabled" : ""}>Realizar sorteo definitivo</button></div><p class="small">La prueba no guarda parejas, no genera códigos y no envía nada.</p>`, "draw-card")}
        ${card(`<h3>Antes de continuar</h3><p class="lead">Revisa nombres y correos. Después del sorteo solo podrás hacer cambios anulándolo, lo que invalidará todos los códigos enviados.</p>`)}
      `;
    }
    return `
      ${card(`<div class="section-title"><div><div class="eyebrow">Sorteo</div><h2>Resultado protegido</h2></div><span class="status-pill live">Realizado</span></div><p class="lead">Solo este acceso administrativo puede consultar las parejas.</p><div class="pair-list">${(data.pairs || []).map(pair => `<article><span>${escapeHtml(pair.from)}</span><i aria-hidden="true">→</i><strong>${escapeHtml(pair.to)}</strong></article>`).join("")}</div>`)}
      ${card(`<h3>Zona de riesgo</h3><p class="lead">Anular el sorteo borra la asignación activa e invalida todos los códigos personales. Las listas de deseos se conservan.</p>${button("resetDraw", "Anular sorteo y códigos", "btn danger")}`, "danger-zone")}
    `;
  }

  function deliveryMessage(issued) {
    const event=state.info.event||{},date=event.date?new Date(event.date+"T12:00:00").toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"}):"fecha por confirmar";
    return `Hola ${issued.name}. Ya está listo el ${event.name||"Amigo invisible Aboiz"}.\n\nEntra en ${event.appUrl||location.href} con tu código personal:\n${issued.code}\n\nPresupuesto: ${event.min??40}–${event.max??50} € · ${date} · ${event.place||"lugar por confirmar"}${event.message?"\n\n"+event.message:""}\n\nNo compartas este código.`;
  }

  function emailMessageUrl(issued) {
    const subject=state.info.event?.name||"Amigo invisible Aboiz";
    return `mailto:${String(issued.email||"").trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(deliveryMessage(issued))}`;
  }

  function adminCodes() {
    const data = state.info;
    const active = data.people.filter(person => person.active);
    if (!data.drawReady) return card(`<div class="eyebrow">Códigos</div><h2>Primero realiza el sorteo</h2><p class="lead">Los códigos se vinculan al resultado activo. Ve a la sección Sorteo cuando la lista esté preparada.</p>${button("section:draw", "Ir al sorteo", "btn primary")}`);
    const sent=active.filter(person=>person.sent).length,message=state.lastIssued?deliveryMessage(state.lastIssued):"";
    const emailAction=state.lastIssued?.email?`<a class="btn" data-email-link href="${escapeHtml(emailMessageUrl(state.lastIssued))}">Abrir correo</a>`:`<span class="mail">Sin correo guardado</span>`;
    return `
      ${card(`<div class="section-title"><div><div class="eyebrow">Entrega privada</div><h2>Invitaciones personales</h2></div><span class="count-badge">${sent}/${active.length} enviados</span></div><div class="progress-track"><span style="width:${active.length?sent*100/active.length:0}%"></span></div><p class="lead">Genera el código, envía el mensaje y marca la entrega. Al regenerarlo, el anterior deja de funcionar.</p>${state.lastIssued ? `<div class="issued-code"><div><small>Invitación nueva para</small><strong>${escapeHtml(state.lastIssued.name)}</strong></div><code id="generated-code">${escapeHtml(state.lastIssued.code)}</code><textarea id="delivery-message" readonly>${escapeHtml(message)}</textarea><div class="btns">${button("copyMessage", "Copiar mensaje", "btn gold")}${button("whatsappMessage", "WhatsApp", "btn primary")}${emailAction}</div><p>Correo y WhatsApp se abren con el texto completo preparado. El envío final siempre lo confirmas tú.</p></div>` : ""}`)}
      ${card(`<div class="code-list">${active.map(person => `<article><span class="person-avatar" style="--avatar-hue:${avatarHue(person.name)}">${escapeHtml(initials(person.name))}</span><div><strong>${escapeHtml(person.name)}</strong><small>${person.sent?"Invitación entregada":person.hasCode?"Código activo, pendiente de envío":"Pendiente de generar"}</small></div><span class="mini-pill ${person.sent ? "yes" : ""}">${person.sent?"Enviado":person.hasCode?"Emitido":"Pendiente"}</span>${button("issue:" + person._id, person.hasCode ? "Regenerar" : "Generar", "btn mini " + (person.hasCode ? "" : "primary"))}${person.hasCode?button("delivered:"+person._id,person.sent?"Desmarcar":"Marcar enviado","btn mini"):""}</article>`).join("")}</div>`)}
    `;
  }

  function staffWishes() {
    const data = state.info;
    const active = data.people.filter(person => person.active);
    const completed = active.filter(person => person.hasWish);
    const percent = active.length ? Math.round(completed.length * 100 / active.length) : 0;
    return `
      ${card(`<div class="section-title"><div><div class="eyebrow">Preferencias</div><h2>Seguimiento de deseos</h2></div><span class="count-badge">${percent}%</span></div><p class="lead">Puedes comprobar quién ha guardado preferencias, pero su contenido solo se muestra a la persona que le regala.</p><div class="progress-track" aria-label="${percent}% completado"><span style="width:${percent}%"></span></div><p><b>${completed.length}</b> de <b>${active.length}</b> participantes han añadido algo. La lista es opcional.</p>`)}
      ${card(`<div class="wish-status-list">${active.map(person => `<article><span class="person-avatar" style="--avatar-hue:${avatarHue(person.name)}">${escapeHtml(initials(person.name))}</span><strong>${escapeHtml(person.name)}</strong><span class="mini-pill ${person.hasWish ? "yes" : ""}">${person.hasWish ? "Lista preparada" : "Sin preferencias"}</span></article>`).join("")}</div>`)}
    `;
  }

  function wishSummary(wish) {
    if (!wish?.selected?.length && !wish?.other) return `<div class="empty-wishes"><b>Sin preferencias todavía</b><p>Un regalo pensado con cariño siempre cuenta.</p></div>`;
    return `<div class="wish-summary">${(wish.selected || []).map(key => {
      const category = categories.find(item => item[0] === key);
      return category ? `<article><span>♡</span><div><b>${escapeHtml(category[1])}</b><small>${escapeHtml(category[2])}</small></div></article>` : "";
    }).join("")}${wish.other ? `<article class="wish-note"><span>✎</span><div><b>Nota personal</b><p>${escapeHtml(wish.other)}</p></div></article>` : ""}</div>`;
  }

  function guestReveal() {
    const data = state.info;
    if (!data.drawReady) return card(`<div class="eyebrow">Mi regalo</div><h2>El sorteo todavía no está listo</h2><p class="lead">Vuelve cuando Joseba haya terminado de preparar la edición.</p>`);
    if (!state.wishDecisionMade) {
      const hasWishes = Boolean(data.myWishes?.selected?.length || data.myWishes?.other);
      return card(`
        <div class="wish-invitation" aria-hidden="true"><span>♡</span><i>✦</i></div>
        <div class="eyebrow">Antes de descubrir el nombre</div>
        <h2>${hasWishes ? "¿Quieres revisar tus deseos?" : "¿Quieres preparar tu lista de deseos?"}</h2>
        <p class="lead">${hasWishes ? "Ya tienes preferencias guardadas. Puedes actualizarlas ahora o continuar directamente." : "Es opcional, pero ayudará a la persona que te regala a elegir algo que te haga ilusión."}</p>
        <div class="wish-choice-actions">
          ${button("startWishes", hasWishes ? "Revisar mi lista" : "Sí, preparar mi lista", "btn gold big")}
          ${button("skipWishes", "Ahora no, abrir mi regalo", "btn quiet")}
        </div>
        <p class="small center-copy">Podrás cambiarla más adelante desde «Mis deseos».</p>
      `, "wish-gate");
    }
    if (!state.opened) {
      return card(`
        <div class="eyebrow">Solo para tus ojos</div>
        <h2>Hay un nombre dentro</h2>
        <p class="lead">Asegúrate de que nadie mire la pantalla y toca la caja.</p>
        <div class="unveil-stage ${state.opening ? "is-opening" : ""}">
          <div class="glow-halo" aria-hidden="true"></div>
          <div class="gift-ambient" aria-hidden="true">${Array.from({ length: 10 }, (_, index) => `<i style="--spark:${index}"></i>`).join("")}</div>
          <div class="magic-sparks" aria-hidden="true"><i>✦</i><i>✧</i><i>✦</i><i>✶</i><i>✧</i></div>
          <button type="button" class="giftbox premium ${state.opening ? "opening" : ""}" data-action="openGift" aria-label="Abrir la caja de regalo" ${state.opening ? 'disabled aria-busy="true"' : ""}>
            <span class="gift-light" aria-hidden="true"></span>
            <span class="gift-shadow" aria-hidden="true"></span>
            <span class="gift-body" aria-hidden="true"><i class="paper-grain"></i><i class="ribbon-v"></i><i class="ribbon-h"></i><i class="gift-seal">A</i></span>
            <span class="gift-lid" aria-hidden="true"><i class="lid-ribbon"></i></span>
            <span class="gift-bow" aria-hidden="true"><i class="loop left"></i><i class="loop right"></i><i class="tail left"></i><i class="tail right"></i><i class="knot"></i></span>
            <span class="gift-tag" aria-hidden="true">ABOIZ</span>
          </button>
          <div class="stage-label" aria-live="polite">${state.opening ? "ABRIENDO…" : "TOCA LA CAJA"}</div>
        </div>
      `, "reveal");
    }
    return card(`
      <div class="eyebrow">Te toca regalar a</div>
      <div class="giftee pop">${escapeHtml(data.gift?.name || "Pendiente")}</div>
      <div class="facts"><span>${escapeHtml(data.event?.min ?? 40)}–${escapeHtml(data.event?.max ?? 50)} €</span>${data.event?.date?`<span>${escapeHtml(new Date(data.event.date+"T12:00:00").toLocaleDateString("es-ES"))}</span>`:""}${data.event?.place?`<span>${escapeHtml(data.event.place)}</span>`:""}</div>
      ${data.gift?.note?`<div class="gift-note"><b>Pista personal</b><p>${escapeHtml(data.gift.note)}</p></div>`:""}<div class="gift-wishes"><h3>Sus deseos</h3>${wishSummary(data.gift?.wishes)}</div>${data.event?.message?`<p class="event-message">${escapeHtml(data.event.message)}</p>`:""}
      <div class="btns centered">${button("refreshGift", "Actualizar deseos")}${button("hideGift", "Ocultar el nombre", "btn quiet")}</div>
      <div class="privacy-note"><span aria-hidden="true">⌁</span><p>No compartas este nombre. Puedes volver a consultarlo mientras tu código siga activo.</p></div>
    `, "reveal");
  }

  function guestWishes() {
    const wish = state.info.myWishes || { selected: [], other: "" };
    return card(`
      <div class="eyebrow">Mi lista</div><h2>Ayuda a acertar</h2>
      <p class="lead">Es completamente opcional. Marca lo que te guste y añade una nota si quieres.</p>
      <form id="wish-form" class="wish-wrap">
        <div class="wish-grid">${categories.map(([key, title, detail]) => `<label class="wish-tile"><input type="checkbox" name="cat" value="${key}" ${wish.selected?.includes(key) ? "checked" : ""}><span><b>${escapeHtml(title)}</b><small>${escapeHtml(detail)}</small></span></label>`).join("")}</div>
        <label class="f">Preferencias o cosas que evitar
          <textarea name="other" maxlength="650" placeholder="Colores, tallas, alergias, gustos o algo que prefieres evitar…">${escapeHtml(wish.other || "")}</textarea>
        </label>
        <div class="wish-actions"><button class="btn gold" type="submit">Guardar mi lista</button>${button("clearWishes", "Dejarla en blanco", "btn quiet")}</div>
      </form>
      <p class="small">Tu lista puede cambiarse más adelante con el mismo código.</p>
    `);
  }

  function guestHelp() {
    return `
      ${card(`<div class="eyebrow">Ayuda</div><h2>Cómo funciona</h2><div class="help-steps"><article><b>1</b><p>Guarda tus deseos si quieres. Son orientativos y opcionales.</p></article><article><b>2</b><p>Abre la caja para descubrir únicamente a quién te toca regalar.</p></article><article><b>3</b><p>Elige el regalo en secreto y disfruta del encuentro en Aboiz.</p></article></div>`)}
      ${card(`<h3>Privacidad y códigos</h3><ul class="plain-list"><li>Tu código es personal: no lo reenvíes.</li><li>Joseba puede regenerarlo; el anterior quedará invalidado.</li><li>David no puede ver los emparejamientos.</li><li>Cierra la sesión si utilizas un dispositivo compartido.</li></ul>`)}
    `;
  }

  function renderPanel() {
    if (!state.info) return card(`<h2>Conectando…</h2>${statusMessages()}`);
    let content;
    if (state.role === "guest") {
      if (!["reveal", "wishes", "help"].includes(state.section)) state.section = "reveal";
      content = state.section === "reveal" ? guestReveal() : state.section === "wishes" ? guestWishes() : guestHelp();
    } else {
      const allowed = state.role === "admin" ? ["overview", "event", "people", "draw", "delivery", "wishes"] : ["overview", "people", "wishes"];
      if (!allowed.includes(state.section)) state.section = "overview";
      content = state.section === "overview" ? staffOverview() : state.section === "event" ? adminEvent() :
        state.section === "people" ? staffPeople() :
        state.section === "draw" ? adminDraw() :
        state.section === "delivery" ? adminCodes() : staffWishes();
    }
    return `<div class="panel-shell ${state.busy ? "overlay-wait" : ""}">${panelHeader()}<div class="enter">${content}</div></div>${panelNavigation()}${celebrationLayer()}${renderModal()}`;
  }

  function renderModal() {
    if (!state.modal) return "";
    if (state.modal.type === "edit") {
      const person = state.modal.person;
      const choices=state.info.people.filter(x=>x.active&&x._id!==person._id).map(x=>`<label class="chip"><input type="checkbox" name="exclusion" value="${escapeHtml(x._id)}" ${person.exclusions?.includes(x._id)?"checked":""}> ${escapeHtml(x.name)}</label>`).join("");
      return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><form id="edit-form" class="card modal-card"><div class="section-title"><h2 id="modal-title">Editar participante</h2><button type="button" class="close-button" data-action="closeModal" aria-label="Cerrar">×</button></div><input type="hidden" name="id" value="${escapeHtml(person._id)}"><label class="f">Nombre<input class="in" name="name" required minlength="2" maxlength="100" value="${escapeHtml(person.name)}"></label><label class="f">Correo opcional<input class="in" type="email" name="email" maxlength="160" value="${escapeHtml(person.email || "")}"></label><label class="f">Pistas para quien le regale<textarea name="note" maxlength="400">${escapeHtml(person.note||"")}</textarea></label><fieldset class="exclusions"><legend>Evitar emparejar con</legend><div class="chips">${choices||"No hay otras personas activas"}</div></fieldset><div class="btns"><button class="btn primary" type="button" data-action="saveEdit">Guardar cambios</button>${button("closeModal", "Cancelar", "btn quiet")}</div></form></div>`;
    }
    return `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="card modal-card"><div class="modal-symbol">${state.modal.danger ? "!" : "✦"}</div><h2 id="modal-title">${escapeHtml(state.modal.title)}</h2><p class="lead">${escapeHtml(state.modal.text)}</p><div class="btns"><button class="btn ${state.modal.danger ? "danger" : "primary"}" type="button" data-action="modalConfirm">${escapeHtml(state.modal.confirmLabel || "Confirmar")}</button>${button("closeModal", "Cancelar", "btn quiet")}</div></section></div>`;
  }

  function render() {
    let html;
    if (state.view === "home") html = renderHome();
    else if (state.view === "login") html = renderLogin();
    else if (state.view === "code") html = renderCodeLogin();
    else html = renderPanel();
    setContent(html);
  }

  function setLogin(role, token) {
    state.role = role;
    state.token = token;
    state.section = role === "guest" ? "reveal" : "overview";
    state.opened = false;
    state.opening = false;
    state.wishDecisionMade = role !== "guest";
    state.wishOnboarding = false;
    state.view = "panel";
    sessionStorage.setItem("aboiz_auth", token);
    sessionStorage.setItem("aboiz_role", role);
  }

  function logout() {
    Object.assign(state, { token: "", role: "", info: null, lastIssued: null, view: "home", section: "overview", opened: false, opening: false, wishDecisionMade: false, wishOnboarding: false, modal: null });
    sessionStorage.removeItem("aboiz_auth");
    sessionStorage.removeItem("aboiz_role");
  }

  async function refresh() {
    state.info = await request("me");
  }

  function confirmAction(title, text, action, confirmLabel = "Confirmar", danger = false) {
    state.modal = { type: "confirm", title, text, action, confirmLabel, danger };
    render();
  }

  function saveEditedPerson(form) {
    if (!form || !form.reportValidity()) return;
    const values=new FormData(form);
    const payload={id:values.get("id"),name:values.get("name"),email:values.get("email"),note:values.get("note"),exclusions:values.getAll("exclusion")};
    state.modal=null;
    task(async()=>{const result=await request("updatePerson",payload);await refresh();setMessage("",result.metaSaved===false?"Nombre y correo actualizados. Las pistas no pudieron guardarse; inténtalo de nuevo.":"Participante actualizado correctamente.");});
  }

  async function performConfirmed(action) {
    state.modal = null;
    if (action === "draw") {
      await task(async () => { await request("draw"); await refresh(); state.section = "draw"; celebrate(); setMessage("", "Sorteo realizado y participantes bloqueados."); });
    } else if (action === "resetDraw") {
      await task(async () => { await request("invalidateDraw"); state.lastIssued = null; await refresh(); state.section = "overview"; setMessage("", "Sorteo anulado y códigos invalidados."); });
    } else if (action.startsWith("remove:")) {
      await task(async () => { await request("removePerson", { id: action.slice(7) }); await refresh(); setMessage("", "Participante retirado."); });
    } else if (action.startsWith("issue:")) {
      await task(async () => { state.lastIssued = await request("issueCode", { id: action.slice(6) }); state.lastIssued.id=action.slice(6); await refresh(); state.section = "delivery"; setMessage("", "Invitación generada. Envíala antes de continuar."); });
    } else if (action === "clearWishes") {
      await task(async () => {
        await request("saveWish", { selected: [], other: "" });
        await refresh();
        const returnToGift = state.wishOnboarding;
        state.wishDecisionMade = true;
        state.wishOnboarding = false;
        state.section = returnToGift ? "reveal" : "wishes";
        setMessage("", returnToGift ? "Has dejado la lista en blanco. Ya puedes abrir tu regalo." : "Tu lista se ha dejado en blanco.");
      });
    }
  }

  app.addEventListener("submit", event => {
    event.preventDefault();
    const form = event.target;
    const values = new FormData(form);
    if (form.id === "login-form") {
      task(async () => {
        const response = await request("login", { mode: state.loginMode, password: String(values.get("password")) });
        setLogin(response.role, response.token);
        await refresh();
      });
    } else if (form.id === "code-form") {
      task(async () => {
        const response = await request("codeLogin", { code: String(values.get("code")).trim() });
        setLogin(response.role, response.token);
        await refresh();
      });
    } else if (form.id === "add-form") {
      task(async () => {
        await request("addPerson", { name: values.get("name"), email: values.get("email") });
        await refresh();
        setMessage("", "Participante añadido.");
      });
    } else if (form.id === "edit-form") {
      saveEditedPerson(form);
    } else if (form.id === "event-form") {
      task(async () => { await request("saveEvent", {event:{name:values.get("name"),date:values.get("date"),place:values.get("place"),min:Number(values.get("min")),max:Number(values.get("max")),message:values.get("message"),appUrl:values.get("appUrl")}});await refresh();setMessage("","Datos del evento guardados."); });
    } else if (form.id === "draw-options-form") {
      task(async () => { await request("saveDrawOptions",{noMutual:values.has("noMutual")});await refresh();setMessage("","Regla del sorteo guardada."); });
    } else if (form.id === "wish-form") {
      task(async () => {
        await request("saveWish", { selected: values.getAll("cat"), other: String(values.get("other")) });
        await refresh();
        const returnToGift = state.wishOnboarding;
        state.wishDecisionMade = true;
        state.wishOnboarding = false;
        state.section = returnToGift ? "reveal" : "wishes";
        setMessage("", returnToGift ? "Tu lista está guardada. Ya puedes abrir tu regalo." : "Tus preferencias se han guardado.");
      });
    }
  });

  app.addEventListener("input", event => {
    if (event.target.id === "people-search") {
      state.peopleSearch = event.target.value;
      const selectionStart = event.target.selectionStart;
      render();
      const replacement = document.getElementById("people-search");
      if (replacement) {
        replacement.focus();
        replacement.setSelectionRange(selectionStart, selectionStart);
      }
    }
  });

  app.addEventListener("click", event => {
    const control = event.target.closest("[data-action]");
    if (!control) return;
    const action = control.dataset.action;
    if (action === "home") { state.view = "home"; setMessage(); render(); return; }
    if (action === "choose-admin" || action === "choose-manager") {
      state.view = "login"; state.loginMode = action === "choose-admin" ? "admin" : "manager"; setMessage(); render(); return;
    }
    if (action === "choose-guest") { state.view = "code"; setMessage(); render(); return; }
    if (action === "logout") { logout(); render(); return; }
    if (action === "saveEdit") { saveEditedPerson(document.getElementById("edit-form")); return; }
    if (action.startsWith("section:")) {
      const nextSection = action.slice(8);
      if (state.role === "guest" && nextSection === "wishes" && !state.wishDecisionMade) {
        state.wishDecisionMade = true;
        state.wishOnboarding = true;
      }
      state.section = nextSection; setMessage(); render(); return;
    }
    if (action.startsWith("filter:")) { state.peopleFilter = action.slice(7); render(); return; }
    if (action === "startWishes") { state.wishDecisionMade = true; state.wishOnboarding = true; state.section = "wishes"; render(); return; }
    if (action === "skipWishes") { state.wishDecisionMade = true; state.wishOnboarding = false; render(); return; }
    if (action === "openGift") {
      if (state.opening) return;
      state.opening = true;
      document.body.classList.add("revealing");
      render();
      window.setTimeout(() => {
        state.opening = false;
        state.opened = true;
        document.body.classList.remove("revealing");
        render();
      }, 1250);
      return;
    }
    if (action === "hideGift") { state.opened = false; state.opening = false; render(); return; }
    if (action === "refreshGift") { task(async () => { await refresh(); setMessage("", "Deseos actualizados."); }); return; }
    if (action === "copyMessage") {
      const message = state.lastIssued ? deliveryMessage(state.lastIssued) : "";
      if (message) navigator.clipboard.writeText(message).then(() => { setMessage("", "Mensaje copiado."); render(); }).catch(() => { setMessage("No se pudo copiar. Selecciona el mensaje manualmente."); render(); });
      return;
    }
    if(action==="whatsappMessage"&&state.lastIssued){window.open("https://wa.me/?text="+encodeURIComponent(deliveryMessage(state.lastIssued)),"_blank","noopener,noreferrer");return;}
    if(action.startsWith("delivered:")){const id=action.slice(10),person=state.info.people.find(x=>x._id===id);task(async()=>{await request("markDelivered",{id,sent:!person.sent});await refresh();setMessage("",person.sent?"Entrega desmarcada.":"Entrega marcada como enviada.");});return;}
    if (action === "draw") { confirmAction("Realizar el sorteo", "La lista quedará bloqueada y se creará una asignación secreta para cada participante.", "draw", "Realizar sorteo"); return; }
    if (action === "testDraw") { task(async () => { const result=await request("testDraw"); celebrate(); setMessage("", `Prueba correcta: ${result.count} participantes, sin guardar resultados ni enviar nada.`); }); return; }
    if (action === "resetDraw") { confirmAction("Anular el sorteo", "Se invalidarán todos los códigos personales enviados. Esta acción no se puede deshacer.", "resetDraw", "Anular definitivamente", true); return; }
    if (action.startsWith("issue:")) {
      const person = state.info.people.find(item => item._id === action.slice(6));
      confirmAction(person?.hasCode ? "Regenerar código" : "Generar código", person?.hasCode ? "El código anterior de " + person.name + " dejará de funcionar." : "Se creará un código personal para " + (person?.name || "esta persona") + ".", action, person?.hasCode ? "Regenerar" : "Generar");
      return;
    }
    if (action.startsWith("remove:")) {
      const person = state.info.people.find(item => item._id === action.slice(7));
      confirmAction("Retirar participante", (person?.name || "Esta persona") + " dejará de participar y cualquier código anterior quedará revocado.", action, "Retirar", true);
      return;
    }
    if (action.startsWith("edit:")) {
      const person = state.info.people.find(item => item._id === action.slice(5));
      if (person) { state.modal = { type: "edit", person }; render(); }
      return;
    }
    if (action === "clearWishes") { confirmAction("Dejar la lista en blanco", "Se eliminarán tus preferencias guardadas. Podrás volver a añadirlas más adelante.", "clearWishes", "Dejar en blanco", true); return; }
    if (action === "closeModal") { state.modal = null; render(); return; }
    if (action === "modalConfirm") { const pending = state.modal?.action; if (pending) performConfirmed(pending); }
  });

  (async () => {
    if (state.token && state.role) {
      state.view = "panel";
      state.section = state.role === "guest" ? "reveal" : "overview";
      try {
        await refresh();
      } catch {
        logout();
        setMessage("La sesión ha caducado. Accede de nuevo.");
      }
    }
    render();
  })();
})();
