(function () {
  const LS_TEAM_USERS = "pdd_team_users_v1";
  const LS_CHAT_PREFIX = "pdd_team_chat_v1_";

  // Lokāls seed (varēsi labot/dzēst/papildināt UI).
  // Pirmā rinda ir "pašam lietotājam" mūsu localSession (LOCAL_USER_ID = "local-user-1").
  const seedUsers = [
    { id: "local-user-1", role: "admin", "Amats": "Vadītājs", "Vārds uzvārds": "Irina Kupcova", email: "irina.kupcova@vid.gov.lv" },
    { id: "u-2", role: "admin", "Amats": "Pakalpojumu pārvaldības procesu eksperte", "Vārds uzvārds": "Vita Kazakēviča", email: "vita.kazakcevica@vid.gov.lv" },
    { id: "u-3", role: "admin", "Amats": "Vecākais eksperts", "Vārds uzvārds": "Elita Jēkabsonē", email: "elita.jekabsonne@vid.gov.lv" },
    { id: "u-4", role: "admin", "Amats": "Vecākais eksperts", "Vārds uzvārds": "Svetlana Novoselova", email: "svetlana.novoselova@vid.gov.lv" },
    { id: "u-5", role: "admin", "Amats": "Pakalpojumu pārvaldības procesu eksperte", "Vārds uzvārds": "Lilita Gurnasa", email: "lilita.gurnasa@vid.gov.lv" },
    { id: "u-6", role: "admin", "Amats": "Vecākais eksperts", "Vārds uzvārds": "Elita Sēlvanova", email: "elita.selvanova@vid.gov.lv" },
    { id: "u-7", role: "admin", "Amats": "Vadītājs", "Vārds uzvārds": "Katrīna Jurgensone", email: "katrina.jurgensone@vid.gov.lv" },
    { id: "u-8", role: "admin", "Amats": "Vecākais eksperts", "Vārds uzvārds": "Elīna Jespersonē", email: "elina.jespersonne@vid.gov.lv" },
  ];

  function loadTeamUsers() {
    const raw = localStorage.getItem(LS_TEAM_USERS);
    if (!raw) {
      localStorage.setItem(LS_TEAM_USERS, JSON.stringify(seedUsers));
      return [...seedUsers];
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("bad");
      return parsed;
    } catch {
      localStorage.setItem(LS_TEAM_USERS, JSON.stringify(seedUsers));
      return [...seedUsers];
    }
  }

  function saveTeamUsers(users) {
    localStorage.setItem(LS_TEAM_USERS, JSON.stringify(users ?? []));
  }

  function upsertTeamUser(user) {
    const users = loadTeamUsers();
    const idx = users.findIndex((u) => String(u.id) === String(user.id));
    const safe = normalizeUser(user);
    if (idx >= 0) users[idx] = safe;
    else users.push(safe);
    saveTeamUsers(users);
    return safe;
  }

  function normalizeUser(u) {
    return {
      id: String(u.id),
      role: String(u.role ?? "employee"),
      "Amats": String(u["Amats"] ?? u.amats ?? ""),
      "Vārds uzvārds": String(u["Vārds uzvārds"] ?? u.vardUzv ?? ""),
      email: String(u.email ?? u["e-pasts"] ?? u.imail ?? ""),
    };
  }

  function deleteTeamUser(id) {
    const users = loadTeamUsers().filter((u) => String(u.id) !== String(id));
    saveTeamUsers(users);
  }

  function conversationKey(emailA, emailB) {
    const a = String(emailA || "").trim().toLowerCase();
    const b = String(emailB || "").trim().toLowerCase();
    const list = [a, b].filter(Boolean).sort();
    return list.length === 2 ? `${list[0]}__${list[1]}` : `${a || "unknown"}__${b || "unknown"}`;
  }

  function loadMessages(key) {
    const raw = localStorage.getItem(LS_CHAT_PREFIX + key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveMessages(key, messages) {
    localStorage.setItem(LS_CHAT_PREFIX + key, JSON.stringify(messages ?? []));
  }

  function addMessage({ fromEmail, toEmail, text, ts }) {
    const key = conversationKey(fromEmail, toEmail);
    const messages = loadMessages(key);
    const msg = {
      id: (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
      fromEmail: String(fromEmail || ""),
      toEmail: String(toEmail || ""),
      text: String(text || ""),
      ts: ts ?? new Date().toISOString(),
    };
    messages.push(msg);
    saveMessages(key, messages);
    return msg;
  }

  // Public API
  window.KOMANDA = {
    loadTeamUsers,
    saveTeamUsers,
    upsertTeamUser,
    deleteTeamUser,
    conversationKey,
    loadMessages,
    saveMessages,
    addMessage,
  };
})();

