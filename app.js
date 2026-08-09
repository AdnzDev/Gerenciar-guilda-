import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  collection,
  collectionGroup,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCdKpWilrfBv3pzss7_WzLCYBElCmnBcGw",
  authDomain: "guild-manager-c760b.firebaseapp.com",
  projectId: "guild-manager-c760b",
  storageBucket: "guild-manager-c760b.firebasestorage.app",
  messagingSenderId: "541323064261",
  appId: "1:541323064261:web:8a4bcb948707724ceb11ac",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const appRoot = document.querySelector("#app");
const modal = document.querySelector("#modal");
const modalTitle = document.querySelector("#modalTitle");
const modalBody = document.querySelector("#modalBody");
const modalClose = document.querySelector("#modalClose");

const confirmModal = document.querySelector("#confirmModal");
const confirmIcon = document.querySelector("#confirmIcon");
const confirmTitle = document.querySelector("#confirmTitle");
const confirmMessage = document.querySelector("#confirmMessage");
const confirmCancel = document.querySelector("#confirmCancel");
const confirmOk = document.querySelector("#confirmOk");

const state = {
  user: null,
  view: "home",
  homeTab: "search",
  authMode: "login",
  loading: false,
  ownerGuilds: [],
  subGuilds: [],
  subLeaders: [],
  mySubLeader: null,
  selectedGuild: null,
  selectedLines: [],
  selectedPlayers: [],
  selectedLine: null,
  publicMode: false,
  ranking: [],
  playerSearch: "",
  modalSubmit: null,
};

function icon(name, size = 18) {
  return `<i data-lucide="${name}" style="width:${size}px;height:${size}px"></i>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function emailNormalize(value) {
  return String(value || "").trim().toLowerCase();
}

function codeNormalize(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

function createGuildCode() {
  return Math.random().toString(36).slice(2, 12).toUpperCase();
}

function totalPlayer(player) {
  return Number(player.honor || 0) + Number(player.war || 0);
}

function refreshIcons() {
  window.lucide?.createIcons();
}

function isOwner() {
  return state.user && state.selectedGuild?.ownerId === state.user.uid;
}

function isSubLeader() {
  return Boolean(state.mySubLeader);
}

function canEditGuild() {
  return isOwner() || state.mySubLeader?.canEditGuild === true;
}

function canEditLine(lineId) {
  if (canEditGuild()) return true;

  const allowed = state.mySubLeader?.allowedLineIds || [];
  return allowed.includes(lineId);
}

function canDeleteLine() {
  return canEditGuild();
}

function toast(message) {
  const old = document.querySelector(".toast");
  if (old) old.remove();

  const div = document.createElement("div");
  div.className = "toast";
  div.textContent = message;

  document.body.appendChild(div);

  setTimeout(() => div.remove(), 2800);
}

function setLoading(value) {
  state.loading = value;
  render();
}

function confirmBox({
  title = "Confirmar ação",
  message = "Tem certeza que deseja continuar?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  danger = true,
  iconName = "triangle-alert",
} = {}) {
  return new Promise((resolve) => {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmCancel.textContent = cancelText;
    confirmOk.textContent = confirmText;
    confirmOk.className = danger ? "btn btn-danger" : "btn btn-primary";
    confirmIcon.innerHTML = icon(iconName, 28);
    confirmModal.classList.add("active");
    refreshIcons();

    const cleanup = (value) => {
      confirmModal.classList.remove("active");
      confirmCancel.onclick = null;
      confirmOk.onclick = null;
      confirmModal.onclick = null;
      resolve(value);
    };

    confirmCancel.onclick = () => cleanup(false);
    confirmOk.onclick = () => cleanup(true);
    confirmModal.onclick = (event) => {
      if (event.target === confirmModal) cleanup(false);
    };
  });
}

function renderAvatar(item, size = "md", fallbackIcon = "shield", alt = "Imagem") {
  if (item?.logoData) {
    return `
      <div class="avatar ${size}">
        <img src="${item.logoData}" alt="${alt}" />
      </div>
    `;
  }

  return `
    <div class="avatar ${size}">
      ${icon(fallbackIcon, size === "lg" ? 32 : 20)}
    </div>
  `;
}

function renderUpload(inputId, previewId, label, currentLogo = "", fallbackIcon = "image-plus") {
  return `
    <div class="upload-field">
      <span class="field-label">${label}</span>

      <div class="upload-row">
        <label class="upload-box" for="${inputId}">
          ${
            currentLogo
              ? `<img id="${previewId}" src="${currentLogo}" alt="${label}" />`
              : `<span id="${previewId}">${icon(fallbackIcon, 26)}</span>`
          }

          <input id="${inputId}" type="file" accept="image/*" />
        </label>

        <div class="upload-text">
          <strong>Clique para fazer upload</strong>
          JPG, PNG ou GIF
        </div>
      </div>
    </div>
  `;
}

function setupImagePreview(inputId, previewId) {
  const input = document.querySelector(`#${inputId}`);
  const preview = document.querySelector(`#${previewId}`);

  if (!input || !preview) return;

  input.addEventListener("change", () => {
    const file = input.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const img = document.createElement("img");
      img.src = reader.result;
      img.alt = "Preview";
      img.id = previewId;
      preview.replaceWith(img);
    };

    reader.readAsDataURL(file);
  });
}

function setupAllImagePreviews() {
  setupImagePreview("guildLogo", "guildLogoPreview");
  setupImagePreview("lineLogo", "lineLogoPreview");
  setupImagePreview("playerLogo", "playerLogoPreview");
}

function imageFileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      reject(new Error("Arquivo inválido."));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 256;

        let width = image.width;
        let height = image.height;

        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };

      image.onerror = reject;
      image.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showModal(title, html, onSubmit = null) {
  state.modalSubmit = onSubmit;

  modalTitle.textContent = title;
  modalBody.innerHTML = html;
  modal.classList.add("active");

  refreshIcons();
  setupAllImagePreviews();
}

function closeModal() {
  state.modalSubmit = null;
  modal.classList.remove("active");
  modalBody.innerHTML = "";
}

modalClose.addEventListener("click", closeModal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

function route(view) {
  state.view = view;

  if (view === "home") {
    state.selectedGuild = null;
    state.selectedLines = [];
    state.selectedPlayers = [];
    state.selectedLine = null;
    state.subLeaders = [];
    state.mySubLeader = null;
    state.publicMode = false;
    state.playerSearch = "";
  }

  render();
}

async function ensureUserProfile(user) {
  if (!user) return;

  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      email: user.email,
      emailLower: emailNormalize(user.email),
      lastSeenAt: serverTimestamp(),
    },
    { merge: true }
  );
}

async function loadOwnerGuilds() {
  if (!state.user) {
    state.ownerGuilds = [];
    return;
  }

  const q = query(collection(db, "guilds"), where("ownerId", "==", state.user.uid));
  const snap = await getDocs(q);

  state.ownerGuilds = snap.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

async function loadSubGuilds() {
  if (!state.user) {
    state.subGuilds = [];
    return;
  }

  try {
    const q = query(collectionGroup(db, "subLeaders"), where("uid", "==", state.user.uid));
    const snap = await getDocs(q);
    const guilds = [];

    for (const subDoc of snap.docs) {
      const guildRef = subDoc.ref.parent.parent;

      if (!guildRef) continue;

      const guildSnap = await getDoc(guildRef);

      if (guildSnap.exists() && guildSnap.data().ownerId !== state.user.uid) {
        guilds.push({
          id: guildSnap.id,
          ...guildSnap.data(),
          subPermission: subDoc.data(),
        });
      }
    }

    state.subGuilds = guilds;
  } catch (error) {
    console.error("Erro ao carregar guildas como sublíder:", error);
    state.subGuilds = [];
  }
}

async function loadSubLeaderData(guild) {
  state.subLeaders = [];
  state.mySubLeader = null;

  if (!state.user || !guild) return;

  if (guild.ownerId === state.user.uid) {
    const snap = await getDocs(collection(db, "guilds", guild.id, "subLeaders"));

    state.subLeaders = snap.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    }));

    return;
  }

  const myRef = doc(db, "guilds", guild.id, "subLeaders", state.user.uid);
  const mySnap = await getDoc(myRef);

  if (mySnap.exists()) {
    state.mySubLeader = {
      id: mySnap.id,
      ...mySnap.data(),
    };
  }
}

async function loadGuildTree(guildId, publicMode = false) {
  setLoading(true);

  try {
    const guildRef = doc(db, "guilds", guildId);
    const guildSnap = await getDoc(guildRef);

    if (!guildSnap.exists()) {
      toast("Guilda não encontrada.");
      return;
    }

    const guild = {
      id: guildSnap.id,
      ...guildSnap.data(),
    };

    await loadSubLeaderData(guild);

    const linesSnap = await getDocs(collection(db, "guilds", guild.id, "lines"));
    const lines = [];

    for (const lineDoc of linesSnap.docs) {
      const line = {
        id: lineDoc.id,
        ...lineDoc.data(),
        players: [],
      };

      const playersSnap = await getDocs(
        collection(db, "guilds", guild.id, "lines", line.id, "players")
      );

      line.players = playersSnap.docs.map((playerDoc) => ({
        id: playerDoc.id,
        ...playerDoc.data(),
      }));

      lines.push(line);
    }

    state.selectedGuild = guild;
    state.selectedLines = lines;
    state.selectedLine = null;
    state.selectedPlayers = [];
    state.publicMode = publicMode;
    state.view = "guild";
    state.playerSearch = "";
  } catch (error) {
    console.error(error);
    toast("Erro ao carregar guilda. Confira as Rules do Firebase.");
  } finally {
    state.loading = false;
    render();
  }
}

async function searchGuildByCode(code) {
  const cleanCode = codeNormalize(code);

  if (!cleanCode) {
    toast("Digite o código da guilda.");
    return;
  }

  setLoading(true);

  try {
    const q = query(collection(db, "guilds"), where("code", "==", cleanCode));
    const snap = await getDocs(q);

    if (snap.empty) {
      toast("Guilda não encontrada.");
      return;
    }

    const guildId = snap.docs[0].id;
    await loadGuildTree(guildId, true);
  } catch (error) {
    console.error(error);
    toast("Erro ao buscar guilda.");
  } finally {
    state.loading = false;
    render();
  }
}

async function loadLine(lineId) {
  const line = state.selectedLines.find((item) => item.id === lineId);

  if (!line) {
    toast("Line não encontrada.");
    return;
  }

  state.selectedLine = line;
  state.selectedPlayers = line.players || [];
  state.playerSearch = "";
  state.view = "line";

  render();
}

async function loadGlobalRanking() {
  setLoading(true);

  try {
    const ranking = [];
    const guildSnap = await getDocs(collection(db, "guilds"));

    for (const guildDoc of guildSnap.docs) {
      const guild = {
        id: guildDoc.id,
        ...guildDoc.data(),
      };

      const linesSnap = await getDocs(collection(db, "guilds", guild.id, "lines"));

      for (const lineDoc of linesSnap.docs) {
        const line = {
          id: lineDoc.id,
          ...lineDoc.data(),
        };

        const playersSnap = await getDocs(
          collection(db, "guilds", guild.id, "lines", line.id, "players")
        );

        playersSnap.docs.forEach((playerDoc) => {
          const player = {
            id: playerDoc.id,
            ...playerDoc.data(),
          };

          ranking.push({
            ...player,
            guildName: guild.name,
            lineName: line.name,
            total: totalPlayer(player),
          });
        });
      }
    }

    state.ranking = ranking.sort((a, b) => b.total - a.total);
    state.view = "ranking";
  } catch (error) {
    console.error(error);
    toast("Erro ao carregar ranking.");
  } finally {
    state.loading = false;
    render();
  }
}

async function register(email, password) {
  if (!email || !password) {
    toast("Preencha email e senha.");
    return;
  }

  try {
    setLoading(true);
    await createUserWithEmailAndPassword(auth, email, password);
    toast("Conta criada com sucesso.");
  } catch (error) {
    console.error("ERRO FIREBASE AUTH:", error.code, error.message);

    if (error.code === "auth/operation-not-allowed") {
      toast("Ative Email/Senha no Firebase Authentication.");
      return;
    }

    if (error.code === "auth/email-already-in-use") {
      toast("Esse email já está cadastrado.");
      return;
    }

    if (error.code === "auth/invalid-email") {
      toast("Email inválido.");
      return;
    }

    if (error.code === "auth/weak-password") {
      toast("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    toast(`Erro ao criar conta: ${error.code}`);
  } finally {
    setLoading(false);
  }
}

async function login(email, password) {
  if (!email || !password) {
    toast("Preencha email e senha.");
    return;
  }

  try {
    setLoading(true);
    await signInWithEmailAndPassword(auth, email, password);
    toast("Login feito com sucesso.");
  } catch (error) {
    console.error("ERRO LOGIN FIREBASE:", error.code, error.message);

    if (error.code === "auth/operation-not-allowed") {
      toast("Ative Email/Senha no Firebase Authentication.");
      return;
    }

    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/user-not-found" ||
      error.code === "auth/wrong-password"
    ) {
      toast("Email ou senha incorretos.");
      return;
    }

    if (error.code === "auth/invalid-email") {
      toast("Email inválido.");
      return;
    }

    toast(`Erro ao entrar: ${error.code}`);
  } finally {
    setLoading(false);
  }
}

async function logout() {
  await signOut(auth);

  state.view = "home";
  state.homeTab = "search";
  state.ownerGuilds = [];
  state.subGuilds = [];
  state.selectedGuild = null;
  state.selectedLines = [];
  state.selectedLine = null;
  state.selectedPlayers = [];
  state.subLeaders = [];
  state.mySubLeader = null;
  state.publicMode = false;

  render();
}

async function createGuild(data) {
  if (!state.user) {
    toast("Faça login para criar guilda.");
    state.homeTab = "login";
    render();
    return false;
  }

  if (state.ownerGuilds.length >= 5) {
    toast("Limite de 5 guildas atingido.");
    return false;
  }

  const name = data.name.trim();
  const code = codeNormalize(data.code || createGuildCode());
  const description = data.description?.trim() || "";
  const logoData = data.logoData || "";

  if (!name) {
    toast("Informe o nome da guilda.");
    return false;
  }

  if (!code) {
    toast("Informe a tag da guilda.");
    return false;
  }

  const existing = await getDocs(query(collection(db, "guilds"), where("code", "==", code)));

  if (!existing.empty) {
    toast("Essa tag já está em uso.");
    return false;
  }

  setLoading(true);

  try {
    const ref = await addDoc(collection(db, "guilds"), {
      name,
      code,
      description,
      logoData,
      alerta: "",
      ownerId: state.user.uid,
      ownerEmail: state.user.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await loadOwnerGuilds();
    await loadSubGuilds();
    await loadGuildTree(ref.id, false);

    toast("Guilda criada.");
    return true;
  } catch (error) {
    console.error(error);
    toast("Erro ao criar guilda.");
    return false;
  } finally {
    state.loading = false;
    render();
  }
}

async function updateGuild(data) {
  if (!canEditGuild()) {
    toast("Você não pode editar esta guilda.");
    return false;
  }

  const name = data.name.trim();
  const code = codeNormalize(data.code);
  const description = data.description?.trim() || "";
  const logoData = data.logoData ?? state.selectedGuild.logoData ?? "";
  const alerta = state.selectedGuild.alerta || "";

  if (!name || !code) {
    toast("Nome e tag são obrigatórios.");
    return false;
  }

  const existing = await getDocs(query(collection(db, "guilds"), where("code", "==", code)));
  const codeUsedByOther = existing.docs.some((item) => item.id !== state.selectedGuild.id);

  if (codeUsedByOther) {
    toast("Essa tag já está sendo usada.");
    return false;
  }

  await updateDoc(doc(db, "guilds", state.selectedGuild.id), {
    name,
    code,
    description,
    logoData,
    alerta,
    ownerId: state.selectedGuild.ownerId,
    ownerEmail: state.selectedGuild.ownerEmail,
    updatedAt: serverTimestamp(),
  });

  await loadOwnerGuilds();
  await loadSubGuilds();
  await loadGuildTree(state.selectedGuild.id, false);

  toast("Guilda atualizada.");
  return true;
}

async function deleteGuild(guildId) {
  if (!state.user) return;

  const guild = state.ownerGuilds.find((item) => item.id === guildId) || state.selectedGuild;

  if (!guild || guild.ownerId !== state.user.uid) {
    toast("Apenas o dono pode apagar esta guilda.");
    return;
  }

  const confirmed = await confirmBox({
    title: "Apagar guilda?",
    message: "Essa ação remove a guilda inteira, todas as lines, jogadores e sublíderes. Não tem como desfazer.",
    confirmText: "Apagar guilda",
    cancelText: "Cancelar",
    danger: true,
    iconName: "trash-2",
  });

  if (!confirmed) return;

  setLoading(true);

  try {
    const subSnap = await getDocs(collection(db, "guilds", guildId, "subLeaders"));

    for (const subDoc of subSnap.docs) {
      await deleteDoc(doc(db, "guilds", guildId, "subLeaders", subDoc.id));
    }

    const linesSnap = await getDocs(collection(db, "guilds", guildId, "lines"));

    for (const lineDoc of linesSnap.docs) {
      const playersSnap = await getDocs(
        collection(db, "guilds", guildId, "lines", lineDoc.id, "players")
      );

      for (const playerDoc of playersSnap.docs) {
        await deleteDoc(doc(db, "guilds", guildId, "lines", lineDoc.id, "players", playerDoc.id));
      }

      await deleteDoc(doc(db, "guilds", guildId, "lines", lineDoc.id));
    }

    await deleteDoc(doc(db, "guilds", guildId));

    await loadOwnerGuilds();
    await loadSubGuilds();

    state.selectedGuild = null;
    state.selectedLines = [];
    state.selectedLine = null;
    state.view = "admin";

    toast("Guilda apagada.");
  } catch (error) {
    console.error(error);
    toast("Erro ao apagar guilda.");
  } finally {
    setLoading(false);
  }
}

async function createLine(data) {
  if (!canEditGuild()) {
    toast("Você não pode criar line nesta guilda.");
    return false;
  }

  const name = data.name.trim();
  const description = data.description.trim();
  const logoData = data.logoData || "";

  if (!name) {
    toast("Informe o nome da line.");
    return false;
  }

  await addDoc(collection(db, "guilds", state.selectedGuild.id, "lines"), {
    name,
    description,
    logoData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await loadGuildTree(state.selectedGuild.id, false);

  toast("Line criada.");
  return true;
}

async function updateLine(lineId, data) {
  if (!canEditLine(lineId)) {
    toast("Você não tem permissão nesta line.");
    return false;
  }

  const name = data.name.trim();
  const description = data.description.trim();
  const currentLine = state.selectedLines.find((item) => item.id === lineId);
  const logoData = data.logoData ?? currentLine?.logoData ?? "";

  if (!name) {
    toast("Informe o nome da line.");
    return false;
  }

  await updateDoc(doc(db, "guilds", state.selectedGuild.id, "lines", lineId), {
    name,
    description,
    logoData,
    updatedAt: serverTimestamp(),
  });

  await loadGuildTree(state.selectedGuild.id, false);

  toast("Line atualizada.");
  return true;
}

async function deleteLine(lineId) {
  if (!canDeleteLine()) {
    toast("Apenas quem tem permissão geral pode apagar lines.");
    return;
  }

  const confirmed = await confirmBox({
    title: "Apagar line?",
    message: "Essa ação remove a line e todos os jogadores dentro dela. Não tem como desfazer.",
    confirmText: "Apagar line",
    cancelText: "Cancelar",
    danger: true,
    iconName: "trash-2",
  });

  if (!confirmed) return;

  const playersSnap = await getDocs(
    collection(db, "guilds", state.selectedGuild.id, "lines", lineId, "players")
  );

  for (const playerDoc of playersSnap.docs) {
    await deleteDoc(
      doc(db, "guilds", state.selectedGuild.id, "lines", lineId, "players", playerDoc.id)
    );
  }

  await deleteDoc(doc(db, "guilds", state.selectedGuild.id, "lines", lineId));

  await loadGuildTree(state.selectedGuild.id, false);

  toast("Line apagada.");
}

function normalizePlayerData(data) {
  return {
    name: data.name.trim(),
    nick: data.nick.trim(),
    playerId: data.playerId.trim(),
    role: data.role.trim(),
    honor: Number(data.honor || 0),
    war: Number(data.war || 0),
    notes: data.notes.trim(),
    logoData: data.logoData || "",
  };
}

async function createPlayer(data) {
  if (!state.selectedLine || !canEditLine(state.selectedLine.id)) {
    toast("Você não tem permissão para adicionar membro nesta line.");
    return false;
  }

  const line = state.selectedLine;
  const payload = normalizePlayerData(data);

  if (!payload.name || !payload.nick || !payload.playerId) {
    toast("Nome, nick e ID são obrigatórios.");
    return false;
  }

  await addDoc(
    collection(db, "guilds", state.selectedGuild.id, "lines", line.id, "players"),
    {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  await loadGuildTree(state.selectedGuild.id, false);
  await loadLine(line.id);

  toast("Jogador adicionado.");
  return true;
}

async function updatePlayer(playerId, data) {
  if (!state.selectedLine || !canEditLine(state.selectedLine.id)) {
    toast("Você não tem permissão para editar membro nesta line.");
    return false;
  }

  const line = state.selectedLine;
  const currentPlayer = (line.players || []).find((item) => item.id === playerId);

  const payload = normalizePlayerData({
    ...data,
    logoData: data.logoData ?? currentPlayer?.logoData ?? "",
  });

  if (!payload.name || !payload.nick || !payload.playerId) {
    toast("Nome, nick e ID são obrigatórios.");
    return false;
  }

  await updateDoc(
    doc(db, "guilds", state.selectedGuild.id, "lines", line.id, "players", playerId),
    {
      ...payload,
      updatedAt: serverTimestamp(),
    }
  );

  await loadGuildTree(state.selectedGuild.id, false);
  await loadLine(line.id);

  toast("Jogador atualizado.");
  return true;
}

async function deletePlayer(playerId) {
  if (!state.selectedLine || !canEditLine(state.selectedLine.id)) {
    toast("Você não tem permissão para apagar membro nesta line.");
    return;
  }

  const line = state.selectedLine;

  const confirmed = await confirmBox({
    title: "Apagar membro?",
    message: "Esse jogador será removido desta line. Não tem como desfazer.",
    confirmText: "Apagar membro",
    cancelText: "Cancelar",
    danger: true,
    iconName: "user-x",
  });

  if (!confirmed) return;

  await deleteDoc(
    doc(db, "guilds", state.selectedGuild.id, "lines", line.id, "players", playerId)
  );

  await loadGuildTree(state.selectedGuild.id, false);
  await loadLine(line.id);

  toast("Jogador apagado.");
}

async function findUserByEmail(email) {
  const clean = emailNormalize(email);

  if (!clean) return null;

  const q = query(collection(db, "users"), where("emailLower", "==", clean));
  const snap = await getDocs(q);

  if (snap.empty) return null;

  return {
    id: snap.docs[0].id,
    ...snap.docs[0].data(),
  };
}

async function addSubLeader(data) {
  if (!isOwner()) {
    toast("Apenas o dono pode adicionar sublíder.");
    return false;
  }

  const email = emailNormalize(data.email);
  const canEditWholeGuild = Boolean(data.canEditGuild);
  const allowedLineIds = canEditWholeGuild ? [] : data.allowedLineIds;

  if (!email) {
    toast("Digite o email do sublíder.");
    return false;
  }

  if (!canEditWholeGuild && allowedLineIds.length === 0) {
    toast("Escolha pelo menos uma line ou dê permissão geral.");
    return false;
  }

  const user = await findUserByEmail(email);

  if (!user) {
    toast("Esse email ainda não existe. O sub precisa criar conta ou fazer login uma vez.");
    return false;
  }

  if (user.uid === state.selectedGuild.ownerId) {
    toast("O dono não precisa ser sublíder.");
    return false;
  }

  const ref = doc(db, "guilds", state.selectedGuild.id, "subLeaders", user.uid);
  const old = await getDoc(ref);

  await setDoc(ref, {
    uid: user.uid,
    email: user.email,
    emailLower: user.emailLower,
    canEditGuild: canEditWholeGuild,
    allowedLineIds,
    createdAt: old.exists() ? old.data().createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await loadGuildTree(state.selectedGuild.id, false);
  await loadSubGuilds();

  toast("Sublíder salvo.");
  return true;
}

async function updateSubLeader(subUid, data) {
  if (!isOwner()) {
    toast("Apenas o dono pode editar sublíder.");
    return false;
  }

  const current = state.subLeaders.find((item) => item.uid === subUid || item.id === subUid);

  if (!current) {
    toast("Sublíder não encontrado.");
    return false;
  }

  const canEditWholeGuild = Boolean(data.canEditGuild);
  const allowedLineIds = canEditWholeGuild ? [] : data.allowedLineIds;

  if (!canEditWholeGuild && allowedLineIds.length === 0) {
    toast("Escolha pelo menos uma line ou dê permissão geral.");
    return false;
  }

  await updateDoc(doc(db, "guilds", state.selectedGuild.id, "subLeaders", subUid), {
    canEditGuild: canEditWholeGuild,
    allowedLineIds,
    updatedAt: serverTimestamp(),
  });

  await loadGuildTree(state.selectedGuild.id, false);
  await loadSubGuilds();

  toast("Permissões atualizadas.");
  return true;
}

async function removeSubLeader(subUid) {
  if (!isOwner()) {
    toast("Apenas o dono pode remover sublíder.");
    return;
  }

  const confirmed = await confirmBox({
    title: "Remover sublíder?",
    message: "Essa pessoa perderá o acesso de edição nesta guilda.",
    confirmText: "Remover",
    cancelText: "Cancelar",
    danger: true,
    iconName: "user-minus",
  });

  if (!confirmed) return;

  await deleteDoc(doc(db, "guilds", state.selectedGuild.id, "subLeaders", subUid));

  await loadGuildTree(state.selectedGuild.id, false);
  await loadSubGuilds();

  closeModal();
  toast("Sublíder removido.");
}

function collectSubLeaderFormData() {
  const canEditGuildValue = document.querySelector("#subCanEditGuild")?.checked || false;

  const allowedLineIds = Array.from(document.querySelectorAll(".subLineCheck:checked"))
    .map((input) => input.value);

  return {
    email: document.querySelector("#subEmail")?.value || "",
    canEditGuild: canEditGuildValue,
    allowedLineIds,
  };
}

function renderLineCheckboxes(selectedIds = []) {
  if (state.selectedLines.length === 0) {
    return `<div class="empty">Crie uma line antes de dar permissão específica.</div>`;
  }

  return `
    <div class="check-list">
      ${state.selectedLines.map(line => `
        <label class="check-row">
          <input
            class="subLineCheck"
            type="checkbox"
            value="${line.id}"
            ${selectedIds.includes(line.id) ? "checked" : ""}
          />
          ${renderAvatar(line, "xs", "users", "Foto da line")}
          <span>${escapeHtml(line.name)}</span>
        </label>
      `).join("")}
    </div>
  `;
}

function renderSubPermissionText(sub) {
  if (sub.canEditGuild) {
    return "Permissão geral: pode editar guilda, criar lines e editar todos os membros.";
  }

  const names = (sub.allowedLineIds || [])
    .map((id) => state.selectedLines.find((line) => line.id === id)?.name)
    .filter(Boolean);

  if (names.length === 0) return "Sem line liberada.";

  return `Pode editar: ${names.join(", ")}.`;
}

function render() {
  appRoot.innerHTML = `
    <div class="app-shell">
      ${renderSidebar()}
      <main class="main">
        ${renderMobileTop()}
        <div class="page">
          ${state.loading ? renderLoading() : renderView()}
        </div>
      </main>
      ${renderBottomNav()}
    </div>
  `;

  refreshIcons();
}

function renderSidebar() {
  const ownerGuilds = state.ownerGuilds || [];
  const subGuilds = state.subGuilds || [];

  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-icon">${icon("shield")}</div>
        <strong>Guild Manager</strong>
      </div>

      <nav class="nav">
        <button class="nav-btn ${state.view === "home" ? "active" : ""}" data-action="home">
          ${icon("home")}
          Início
        </button>

        <button class="nav-btn ${state.view === "admin" ? "active" : ""}" data-action="admin">
          ${icon("layout-dashboard")}
          Painel Admin
        </button>

        <button class="nav-btn ${state.view === "ranking" ? "active" : ""}" data-action="ranking">
          ${icon("trophy")}
          Ranking Global
        </button>
      </nav>

      <div class="side-section">
        <div class="side-title">
          <span>Minhas guildas</span>
          <span>${ownerGuilds.length}/5</span>
        </div>

        <div class="side-guild-list">
          ${
            state.user
              ? ownerGuilds.length
                ? ownerGuilds.map(guild => `
                  <button class="side-guild" data-action="open-owner-guild" data-id="${guild.id}">
                    <div class="card-title-row">
                      ${renderAvatar(guild, "sm", "shield", "Logo da guilda")}
                      <div>
                        <strong>${escapeHtml(guild.name)}</strong>
                        <small>${escapeHtml(guild.code)}</small>
                      </div>
                    </div>
                  </button>
                `).join("")
                : `<div class="empty">Nenhuma guilda criada.</div>`
              : `<div class="empty">Entre para ver suas guildas.</div>`
          }
        </div>
      </div>

      ${
        state.user && subGuilds.length
          ? `
            <div class="side-section">
              <div class="side-title">
                <span>Como sublíder</span>
                <span>${subGuilds.length}</span>
              </div>

              <div class="side-guild-list">
                ${subGuilds.map(guild => `
                  <button class="side-guild" data-action="open-owner-guild" data-id="${guild.id}">
                    <div class="card-title-row">
                      ${renderAvatar(guild, "sm", "shield", "Logo da guilda")}
                      <div>
                        <strong>${escapeHtml(guild.name)}</strong>
                        <small>${guild.subPermission?.canEditGuild ? "Permissão geral" : "Permissão de line"}</small>
                      </div>
                    </div>
                  </button>
                `).join("")}
              </div>
            </div>
          `
          : ""
      }

      <div class="user-card">
        <div class="user-info">
          <small>${state.user ? "Logado como" : "Visitante"}</small>
          <strong>${state.user ? escapeHtml(state.user.email) : "Sem login"}</strong>
        </div>

        ${
          state.user
            ? `<button class="btn btn-secondary" data-action="logout" style="width:100%">${icon("log-out")} Sair</button>`
            : `<button class="btn btn-primary" data-action="show-login" style="width:100%">${icon("log-in")} Entrar</button>`
        }
      </div>
    </aside>
  `;
}

function renderMobileTop() {
  return `
    <header class="mobile-top">
      <div class="brand" style="height:auto;padding:0;border:0">
        <div class="brand-icon">${icon("shield")}</div>
        <strong>Guild Manager</strong>
      </div>

      <span class="badge green">${icon("wifi", 14)} Online</span>
    </header>
  `;
}

function renderBottomNav() {
  return `
    <nav class="bottom-nav">
      <button class="${state.view === "home" ? "active" : ""}" data-action="home">
        ${icon("home")}
        Início
      </button>

      <button class="${state.view === "admin" ? "active" : ""}" data-action="admin">
        ${icon("layout-dashboard")}
        Admin
      </button>

      <button class="${state.view === "ranking" ? "active" : ""}" data-action="ranking">
        ${icon("trophy")}
        Ranking
      </button>
    </nav>
  `;
}

function renderLoading() {
  return `
    <section class="hero">
      <div class="hero-icon">${icon("loader-2", 32)}</div>
      <h1>Carregando</h1>
      <p>Sincronizando dados com o salvamento em nuvem...</p>
    </section>
  `;
}

function renderView() {
  if (state.view === "home") return renderHome();
  if (state.view === "admin") return renderAdmin();
  if (state.view === "guild") return renderGuild();
  if (state.view === "line") return renderLine();
  if (state.view === "ranking") return renderRanking();

  return renderHome();
}

function renderHome() {
  return `
    <section class="hero">
      <div class="hero-icon">${icon("sparkles", 34)}</div>
      <h1>Guild Manager</h1>
      <p>
        Gerencie guildas, lines e jogadores com acesso público por código
        e painel privado para o criador.
      </p>

      <div class="badge-row">
        <span class="badge green">${icon("cloud", 15)} salvamento em nuvem</span>
        <span class="badge">${icon("lock", 15)} Edição só do criador</span>
        <span class="badge">${icon("scan-search", 15)} Busca por código</span>
      </div>

      <div class="tabs">
        <button class="tab ${state.homeTab === "search" ? "active" : ""}" data-action="tab-search">
          ${icon("search")}
          Buscar Guilda
        </button>

        <button class="tab ${state.homeTab === "login" ? "active" : ""}" data-action="tab-login">
          ${icon("user")}
          Login / Criar
        </button>
      </div>
    </section>

    ${
      state.homeTab === "search"
        ? renderSearchGuildPanel()
        : renderLoginPanel()
    }
  `;
}

function renderSearchGuildPanel() {
  return `
    <div class="card" style="max-width:720px;margin:0 auto;">
      <h2>Acessar Guilda</h2>
      <p>
        Cole o código da guilda. Visitantes podem visualizar membros, lines e ranking,
        mas não podem editar nada.
      </p>

      <div class="code-row">
        <input id="searchCodeInput" placeholder="EX: 1234567890" />
        <button class="btn btn-blue icon-only" data-action="search-code">
          ${icon("search", 22)}
        </button>
      </div>
    </div>
  `;
}

function renderLoginPanel() {
  if (state.user) {
    return `
      <div class="card" style="max-width:720px;margin:0 auto;">
        <h2>Você está logado</h2>
        <p>Entre no painel admin para criar e gerenciar suas guildas.</p>

        <div class="form-actions">
          <button class="btn btn-primary" data-action="admin">
            ${icon("layout-dashboard")}
            Abrir Painel Admin
          </button>

          <button class="btn btn-secondary" data-action="logout">
            ${icon("log-out")}
            Sair
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div class="card" style="max-width:720px;margin:0 auto;">
      <h2>${state.authMode === "login" ? "Entrar" : "Criar conta"}</h2>
      <p>
        Faça login para criar guildas, editar lines e gerenciar jogadores.
      </p>

      <form id="authForm" class="form">
        <label>
          Email
          <input id="authEmail" type="email" placeholder="seuemail@gmail.com" />
        </label>

        <label>
          Senha
          <input id="authPassword" type="password" placeholder="Mínimo 6 caracteres" />
        </label>

        <button class="btn btn-primary" type="submit">
          ${icon(state.authMode === "login" ? "log-in" : "user-plus")}
          ${state.authMode === "login" ? "Entrar" : "Criar conta"}
        </button>

        <button class="btn btn-secondary" type="button" data-action="switch-auth">
          ${
            state.authMode === "login"
              ? "Não tenho conta, criar agora"
              : "Já tenho conta, entrar"
          }
        </button>
      </form>
    </div>
  `;
}

function renderAdmin() {
  if (!state.user) {
    return `
      <section class="hero">
        <div class="hero-icon">${icon("lock", 32)}</div>
        <h1>Acesso Admin</h1>
        <p>Faça login para criar guildas, lines e jogadores.</p>

        <button class="btn btn-primary" data-action="show-login">
          ${icon("log-in")}
          Entrar agora
        </button>
      </section>
    `;
  }

  return `
    <div class="header-card">
      <span class="badge">${icon("layout-dashboard", 15)} Painel Admin</span>
      <h1>Minhas Guildas</h1>
      <p>Crie até 5 guildas. Cada guilda recebe uma tag pública para visualização.</p>

      <div class="header-actions">
        <button class="btn btn-primary" data-action="open-create-guild" ${state.ownerGuilds.length >= 5 ? "disabled" : ""}>
          ${icon("plus")}
          Criar Guilda
        </button>
      </div>
    </div>

    <div class="stats">
      <div class="stat">
        <span>Guildas</span>
        <strong>${state.ownerGuilds.length}/5</strong>
      </div>

      <div class="stat">
        <span>Como sublíder</span>
        <strong>${state.subGuilds.length}</strong>
      </div>

      <div class="stat">
        <span>Status</span>
        <strong style="color:#86efac">Online</strong>
      </div>
    </div>

    ${
      state.ownerGuilds.length === 0
        ? `<div class="empty">Você ainda não criou nenhuma guilda.</div>`
        : `<div class="cards-grid">
            ${state.ownerGuilds.map(guild => `
              <div class="line-card">
                <div class="card-title-row">
                  ${renderAvatar(guild, "md", "shield", "Logo da guilda")}
                  <h3>${escapeHtml(guild.name)}</h3>
                </div>

                <p>${escapeHtml(guild.description || "Sem descrição.")}</p>
                <span class="badge">${icon("key", 14)} ${escapeHtml(guild.code)}</span>

                <div class="actions">
                  <button class="btn btn-primary" data-action="open-owner-guild" data-id="${guild.id}">
                    ${icon("folder-open")}
                    Abrir
                  </button>

                  <button class="btn btn-danger" data-action="delete-guild" data-id="${guild.id}">
                    ${icon("trash-2")}
                  </button>
                </div>
              </div>
            `).join("")}
          </div>`
    }

    ${
      state.subGuilds.length
        ? `
          <div class="header-card" style="margin-top:18px">
            <span class="badge yellow">${icon("user-check", 15)} Sublíder</span>
            <h1>Guildas com acesso</h1>
            <p>Guildas onde o dono te autorizou a editar tudo ou apenas algumas lines.</p>
          </div>

          <div class="cards-grid">
            ${state.subGuilds.map(guild => `
              <div class="line-card">
                <div class="card-title-row">
                  ${renderAvatar(guild, "md", "shield", "Logo da guilda")}
                  <h3>${escapeHtml(guild.name)}</h3>
                </div>

                <p>${guild.subPermission?.canEditGuild ? "Permissão geral na guilda." : "Permissão em line específica."}</p>

                <div class="actions">
                  <button class="btn btn-primary" data-action="open-owner-guild" data-id="${guild.id}">
                    ${icon("folder-open")}
                    Abrir
                  </button>
                </div>
              </div>
            `).join("")}
          </div>
        `
        : ""
    }
  `;
}

function renderGuildAlert(guild) {
  if (!guild?.alerta) return "";

  return `
    <div class="guild-alert">
      <div class="guild-alert-icon">
        ${icon("triangle-alert", 22)}
      </div>

      <div>
        <strong>Aviso da Guilda</strong>
        <p>${escapeHtml(guild.alerta)}</p>
      </div>
    </div>
  `;
}

function renderPermissionBadgeForLine(line) {
  if (isOwner()) return "";

  if (canEditLine(line.id)) {
    return `<span class="badge green">${icon("lock-open", 14)} Você pode editar</span>`;
  }

  if (isSubLeader()) {
    return `<span class="badge">${icon("lock", 14)} Sem permissão</span>`;
  }

  return "";
}

function renderGuild() {
  const guild = state.selectedGuild;

  if (!guild) {
    return `<div class="empty">Nenhuma guilda selecionada.</div>`;
  }

  const owner = isOwner();
  const guildEditor = canEditGuild();
  const sub = isSubLeader();

  const membersCount = state.selectedLines.reduce((total, line) => total + (line.players || []).length, 0);
  const totalScore = state.selectedLines.reduce((total, line) => {
    return total + (line.players || []).reduce((sum, player) => sum + totalPlayer(player), 0);
  }, 0);

  return `
    <div class="header-card">
      <button class="btn btn-ghost" data-action="${state.publicMode ? "home" : "admin"}">
        ${icon("arrow-left")}
        Voltar
      </button>

      <div style="margin-top:18px">
        <span class="badge">${icon("key", 14)} Tag: ${escapeHtml(guild.code)}</span>
        ${owner ? `<span class="badge green">${icon("crown", 14)} Você é o criador</span>` : ""}
        ${sub && state.mySubLeader?.canEditGuild ? `<span class="badge yellow">${icon("user-check", 14)} Sublíder geral</span>` : ""}
        ${sub && !state.mySubLeader?.canEditGuild ? `<span class="badge yellow">${icon("user-check", 14)} Sublíder de line</span>` : ""}
        ${!owner && !sub ? `<span class="badge">${icon("eye", 14)} Visualização pública</span>` : ""}

        <div class="title-row">
          ${renderAvatar(guild, "lg", "shield", "Logo da guilda")}
          <h1>${escapeHtml(guild.name)}</h1>
        </div>

        <p>${escapeHtml(guild.description || "Sem descrição.")}</p>
      </div>

      <div class="header-actions">
        ${
          guildEditor
            ? `<button class="btn btn-primary" data-action="open-create-line">
                ${icon("plus")}
                Nova Line
              </button>

              <button class="btn btn-secondary" data-action="open-edit-guild">
                ${icon("edit-2")}
                Editar Guilda
              </button>`
            : ""
        }

        ${
          owner
            ? `<button class="btn btn-secondary" data-action="open-sub-help" title="Como funciona sublíder">
                ${icon("circle-alert")}
                !
              </button>

              <button class="btn btn-secondary" data-action="open-subleaders">
                ${icon("user-cog")}
                Sublíderes
              </button>

              <button class="btn btn-danger" data-action="delete-selected-guild">
                ${icon("trash-2")}
                Apagar Guilda
              </button>`
            : ""
        }
      </div>
    </div>

    ${renderGuildAlert(guild)}

    <div class="stats">
      <div class="stat">
        <span>Lines</span>
        <strong>${state.selectedLines.length}</strong>
      </div>

      <div class="stat">
        <span>Membros</span>
        <strong>${membersCount}</strong>
      </div>

      <div class="stat">
        <span>Pontuação</span>
        <strong>${totalScore}</strong>
      </div>
    </div>

    ${
      state.selectedLines.length === 0
        ? `<div class="empty">Nenhuma line cadastrada.</div>`
        : `<div class="cards-grid">
            ${state.selectedLines.map(line => {
              const lineEditable = canEditLine(line.id);

              return `
                <div class="line-card ${lineEditable && !owner ? "can-edit" : ""}">
                  <div class="card-title-row">
                    ${renderAvatar(line, "md", "users", "Foto da line")}
                    <h3>${escapeHtml(line.name)}</h3>
                  </div>

                  <p>${escapeHtml(line.description || "Sem descrição.")}</p>

                  <div class="actions">
                    <span class="badge">${icon("users", 14)} ${(line.players || []).length} membro(s)</span>
                    ${renderPermissionBadgeForLine(line)}
                  </div>

                  <div class="actions">
                    <button class="btn btn-primary" data-action="open-line" data-id="${line.id}">
                      ${icon("users")}
                      Ver membros
                    </button>

                    ${
                      lineEditable
                        ? `<button class="btn btn-secondary" data-action="open-edit-line" data-id="${line.id}">
                            ${icon("edit-2")}
                          </button>`
                        : ""
                    }

                    ${
                      canDeleteLine()
                        ? `<button class="btn btn-danger" data-action="delete-line" data-id="${line.id}">
                            ${icon("trash-2")}
                          </button>`
                        : ""
                    }
                  </div>
                </div>
              `;
            }).join("")}
          </div>`
    }
  `;
}

function renderLine() {
  const guild = state.selectedGuild;
  const line = state.selectedLine;
  const lineEditor = line ? canEditLine(line.id) : false;

  if (!guild || !line) {
    return `<div class="empty">Line não encontrada.</div>`;
  }

  const queryValue = normalize(state.playerSearch);

  const players = (line.players || []).filter(player => {
    return (
      normalize(player.name).includes(queryValue) ||
      normalize(player.nick).includes(queryValue) ||
      normalize(player.playerId).includes(queryValue)
    );
  });

  return `
    <div class="header-card">
      <button class="btn btn-ghost" data-action="back-to-guild">
        ${icon("arrow-left")}
        Voltar para Guilda
      </button>

      <div style="margin-top:18px">
        <span class="badge">${icon("shield", 14)} ${escapeHtml(guild.name)}</span>
        ${lineEditor ? `<span class="badge green">${icon("lock-open", 14)} Edição liberada</span>` : ""}

        <div class="title-row">
          ${renderAvatar(line, "lg", "users", "Foto da line")}
          <h1>${escapeHtml(line.name)}</h1>
        </div>

        <p>${escapeHtml(line.description || "Sem descrição.")}</p>
      </div>

      ${
        lineEditor
          ? `<div class="header-actions">
              <button class="btn btn-primary" data-action="open-create-player">
                ${icon("user-plus")}
                Adicionar Pessoa
              </button>
            </div>`
          : ""
      }
    </div>

    <div class="card" style="margin-bottom:18px">
      <div class="card-header">
        <div>
          <h2>Membros</h2>
          <p>Busque por ID, nick ou nome do jogador.</p>
        </div>

        <div class="search-box">
          ${icon("search")}
          <input id="playerSearch" placeholder="Buscar membro..." value="${escapeHtml(state.playerSearch)}" />
        </div>
      </div>
    </div>

    ${
      players.length === 0
        ? `<div class="empty">Nenhum membro encontrado.</div>`
        : `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nick</th>
                  <th>Nome</th>
                  <th>Função</th>
                  <th>Honra</th>
                  <th>Guerra</th>
                  <th>Total</th>
                  <th>Notas</th>
                  ${lineEditor ? "<th>Ações</th>" : ""}
                </tr>
              </thead>

              <tbody>
                ${players.map(player => `
                  <tr>
                    <td>${escapeHtml(player.playerId)}</td>
                    <td>
                      <div class="member-cell">
                        ${renderAvatar(player, "xs", "user", "Foto do membro")}
                        <strong>${escapeHtml(player.nick)}</strong>
                      </div>
                    </td>
                    <td>${escapeHtml(player.name)}</td>
                    <td>${escapeHtml(player.role || "-")}</td>
                    <td>${Number(player.honor || 0)}</td>
                    <td>${Number(player.war || 0)}</td>
                    <td class="score">${totalPlayer(player)}</td>
                    <td>${escapeHtml(player.notes || "-")}</td>
                    ${
                      lineEditor
                        ? `<td>
                            <div class="actions">
                              <button class="btn btn-secondary" data-action="open-edit-player" data-id="${player.id}">
                                ${icon("edit-2")}
                              </button>

                              <button class="btn btn-danger" data-action="delete-player" data-id="${player.id}">
                                ${icon("trash-2")}
                              </button>
                            </div>
                          </td>`
                        : ""
                    }
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

          <div class="player-mobile-list">
            ${players.map(player => `
              <div class="player-card">
                <div style="display:flex;justify-content:space-between;gap:12px">
                  <div class="card-title-row">
                    ${renderAvatar(player, "md", "user", "Foto do membro")}
                    <div>
                      <h3>${escapeHtml(player.nick)}</h3>
                      <p>${escapeHtml(player.name)}</p>
                    </div>
                  </div>

                  <strong class="score" style="font-size:24px">${totalPlayer(player)}</strong>
                </div>

                <div class="stats" style="margin:16px 0 0">
                  <div class="stat">
                    <span>ID</span>
                    <strong style="font-size:17px">${escapeHtml(player.playerId)}</strong>
                  </div>

                  <div class="stat">
                    <span>Função</span>
                    <strong style="font-size:17px">${escapeHtml(player.role || "-")}</strong>
                  </div>

                  <div class="stat">
                    <span>Honra</span>
                    <strong>${Number(player.honor || 0)}</strong>
                  </div>

                  <div class="stat">
                    <span>Guerra</span>
                    <strong>${Number(player.war || 0)}</strong>
                  </div>
                </div>

                ${
                  player.notes
                    ? `<p>${escapeHtml(player.notes)}</p>`
                    : ""
                }

                ${
                  lineEditor
                    ? `<div class="actions">
                        <button class="btn btn-secondary" data-action="open-edit-player" data-id="${player.id}">
                          ${icon("edit-2")}
                          Editar
                        </button>

                        <button class="btn btn-danger" data-action="delete-player" data-id="${player.id}">
                          ${icon("trash-2")}
                          Apagar
                        </button>
                      </div>`
                    : ""
                }
              </div>
            `).join("")}
          </div>
        `
    }
  `;
}

function renderRanking() {
  return `
    <div class="header-card">
      <button class="btn btn-ghost" data-action="home">
        ${icon("arrow-left")}
        Voltar
      </button>

      <div style="margin-top:18px">
        <span class="badge">${icon("trophy", 14)} Ranking Global</span>
        <h1>Ranking</h1>
        <p>Classificação geral por Honra + Guerra.</p>
      </div>
    </div>

    ${
      state.ranking.length === 0
        ? `<div class="empty">Nenhum jogador encontrado no ranking.</div>`
        : `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nick</th>
                  <th>Nome</th>
                  <th>Guilda</th>
                  <th>Line</th>
                  <th>Honra</th>
                  <th>Guerra</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                ${state.ranking.map((player, index) => `
                  <tr>
                    <td><strong>#${index + 1}</strong></td>
                    <td>
                      <div class="member-cell">
                        ${renderAvatar(player, "xs", "user", "Foto do membro")}
                        <strong>${escapeHtml(player.nick)}</strong>
                      </div>
                    </td>
                    <td>${escapeHtml(player.name)}</td>
                    <td>${escapeHtml(player.guildName)}</td>
                    <td>${escapeHtml(player.lineName)}</td>
                    <td>${Number(player.honor || 0)}</td>
                    <td>${Number(player.war || 0)}</td>
                    <td class="score">${player.total}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

          <div class="player-mobile-list">
            ${state.ranking.map((player, index) => `
              <div class="player-card">
                <span class="badge">${icon("trophy", 14)} #${index + 1}</span>

                <div class="card-title-row" style="margin-top:12px">
                  ${renderAvatar(player, "md", "user", "Foto do membro")}
                  <div>
                    <h3>${escapeHtml(player.nick)}</h3>
                    <p>${escapeHtml(player.name)}</p>
                  </div>
                </div>

                <div class="stats" style="margin-top:16px">
                  <div class="stat">
                    <span>Guilda</span>
                    <strong style="font-size:17px">${escapeHtml(player.guildName)}</strong>
                  </div>

                  <div class="stat">
                    <span>Line</span>
                    <strong style="font-size:17px">${escapeHtml(player.lineName)}</strong>
                  </div>

                  <div class="stat">
                    <span>Total</span>
                    <strong>${player.total}</strong>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        `
    }
  `;
}

function openSubHelpModal() {
  showModal(
    "Como funciona o Sublíder",
    `
      <div class="form">
        <div class="help-box">
          <strong>Sistema de sublíderes</strong>
          <ul>
            <li>O dono da guilda pode adicionar um sublíder pelo email de login.</li>
            <li>O sublíder precisa ter criado conta ou feito login pelo menos uma vez.</li>
            <li>Com <strong>Permissão geral</strong>, ele pode editar a guilda, criar lines e editar todos os membros.</li>
            <li>Com <strong>Permissão por line</strong>, ele vê todas as lines, mas só consegue editar as lines liberadas pelo dono.</li>
            <li>Lines liberadas aparecem destacadas com cadeado aberto.</li>
            <li>Apenas o dono pode apagar a guilda e gerenciar sublíderes.</li>
          </ul>
        </div>

        <button class="btn btn-primary" type="button" data-action="close-modal">
          Entendi
        </button>
      </div>
    `
  );
}

function openCreateGuildModal() {
  showModal(
    "Criar Guilda",
    `
      <form id="modalForm" class="form">
        <label>
          Nome
          <input id="guildName" placeholder="Ex: Guilda NX" />
        </label>

        <label>
          Tag
          <input id="guildCode" placeholder="Ex: 1234567890" value="${createGuildCode()}" />
        </label>

        ${renderUpload("guildLogo", "guildLogoPreview", "Foto da Guilda", "", "image-plus")}

        <div class="form-actions">
          <button class="btn btn-secondary" type="button" data-action="close-modal">Cancelar</button>
          <button class="btn btn-primary" type="submit">${icon("save")} Salvar</button>
        </div>
      </form>
    `,
    async () => {
      const logoFile = document.querySelector("#guildLogo")?.files?.[0];
      const logoData = logoFile ? await imageFileToBase64(logoFile) : "";

      const ok = await createGuild({
        name: document.querySelector("#guildName").value,
        code: document.querySelector("#guildCode").value,
        description: "",
        logoData,
      });

      if (ok) closeModal();
    }
  );
}

function openEditGuildModal() {
  const guild = state.selectedGuild;

  showModal(
    "Editar Guilda",
    `
      <form id="modalForm" class="form">
        <label>
          Nome
          <input id="guildName" value="${escapeHtml(guild.name)}" />
        </label>

        <label>
          Tag
          <input id="guildCode" value="${escapeHtml(guild.code)}" />
        </label>

        ${renderUpload("guildLogo", "guildLogoPreview", "Foto da Guilda", guild.logoData || "", "image-plus")}

        <div class="form-actions">
          <button class="btn btn-secondary" type="button" data-action="close-modal">Cancelar</button>
          <button class="btn btn-primary" type="submit">${icon("save")} Salvar</button>
        </div>
      </form>
    `,
    async () => {
      const logoFile = document.querySelector("#guildLogo")?.files?.[0];

      const logoData = logoFile
        ? await imageFileToBase64(logoFile)
        : state.selectedGuild.logoData || "";

      const ok = await updateGuild({
        name: document.querySelector("#guildName").value,
        code: document.querySelector("#guildCode").value,
        description: state.selectedGuild.description || "",
        logoData,
      });

      if (ok) closeModal();
    }
  );
}

function openSubLeadersModal() {
  if (!isOwner()) return;

  showModal(
    "Sublíderes",
    `
      <form id="modalForm" class="form">
        <button class="btn btn-secondary" type="button" data-action="open-sub-help">
          ${icon("circle-alert")}
          Como funciona?
        </button>

        <p class="sub-info">
          O sublíder precisa ter criado conta ou feito login uma vez. Depois disso,
          digite o email dele e escolha as permissões.
        </p>

        ${
          state.subLeaders.length
            ? `
              <div class="permission-list">
                ${state.subLeaders.map(sub => `
                  <div class="permission-card">
                    <div class="permission-card-top">
                      <div>
                        <strong>${escapeHtml(sub.email)}</strong>
                        <small>${escapeHtml(renderSubPermissionText(sub))}</small>
                      </div>

                      <div class="actions" style="margin-top:0">
                        <button class="btn btn-secondary" type="button" data-action="edit-subleader" data-id="${sub.uid}">
                          ${icon("edit-2")}
                        </button>

                        <button class="btn btn-danger" type="button" data-action="remove-subleader" data-id="${sub.uid}">
                          ${icon("trash-2")}
                        </button>
                      </div>
                    </div>
                  </div>
                `).join("")}
              </div>

              <div class="divider"></div>
            `
            : `<div class="empty">Nenhum sublíder adicionado ainda.</div>`
        }

        <label>
          Email do sublíder
          <input id="subEmail" type="email" placeholder="emaildosub@gmail.com" />
        </label>

        <label class="check-row">
          <input id="subCanEditGuild" type="checkbox" />
          ${icon("shield-check", 18)}
          <span>Permissão geral na guilda</span>
        </label>

        <p class="sub-info">
          Se marcar permissão geral, ele poderá editar guilda, criar/editar lines e mexer em todos os membros.
          Apenas o dono pode apagar a guilda e gerenciar sublíderes.
        </p>

        <label>
          Permissão por line
          ${renderLineCheckboxes([])}
        </label>

        <div class="form-actions">
          <button class="btn btn-secondary" type="button" data-action="close-modal">Cancelar</button>
          <button class="btn btn-primary" type="submit">${icon("user-plus")} Adicionar</button>
        </div>
      </form>
    `,
    async () => {
      const ok = await addSubLeader(collectSubLeaderFormData());
      if (ok) closeModal();
    }
  );
}

function openEditSubLeaderModal(subUid) {
  const sub = state.subLeaders.find((item) => item.uid === subUid || item.id === subUid);

  if (!sub) return;

  showModal(
    "Editar Sublíder",
    `
      <form id="modalForm" class="form">
        <button class="btn btn-secondary" type="button" data-action="open-sub-help">
          ${icon("circle-alert")}
          Como funciona?
        </button>

        <div class="permission-card">
          <strong>${escapeHtml(sub.email)}</strong>
          <small>Alterando permissões deste sublíder.</small>
        </div>

        <label class="check-row">
          <input id="subCanEditGuild" type="checkbox" ${sub.canEditGuild ? "checked" : ""} />
          ${icon("shield-check", 18)}
          <span>Permissão geral na guilda</span>
        </label>

        <p class="sub-info">
          Se marcar permissão geral, ele poderá editar guilda, criar/editar lines e mexer em todos os membros.
        </p>

        <label>
          Permissão por line
          ${renderLineCheckboxes(sub.allowedLineIds || [])}
        </label>

        <div class="form-actions">
          <button class="btn btn-secondary" type="button" data-action="close-modal">Cancelar</button>
          <button class="btn btn-primary" type="submit">${icon("save")} Salvar</button>
        </div>
      </form>
    `,
    async () => {
      const data = collectSubLeaderFormData();
      const ok = await updateSubLeader(subUid, data);
      if (ok) closeModal();
    }
  );
}

function openCreateLineModal() {
  showModal(
    "Criar Line",
    `
      <form id="modalForm" class="form">
        <label>
          Nome da Line
          <input id="lineName" placeholder="Ex: Line Principal" />
        </label>

        <label>
          Descrição
          <textarea id="lineDescription" placeholder="Descrição da line..."></textarea>
        </label>

        ${renderUpload("lineLogo", "lineLogoPreview", "Foto da Line", "", "image-plus")}

        <div class="form-actions">
          <button class="btn btn-secondary" type="button" data-action="close-modal">Cancelar</button>
          <button class="btn btn-primary" type="submit">${icon("save")} Salvar</button>
        </div>
      </form>
    `,
    async () => {
      const logoFile = document.querySelector("#lineLogo")?.files?.[0];
      const logoData = logoFile ? await imageFileToBase64(logoFile) : "";

      const ok = await createLine({
        name: document.querySelector("#lineName").value,
        description: document.querySelector("#lineDescription").value,
        logoData,
      });

      if (ok) closeModal();
    }
  );
}

function openEditLineModal(lineId) {
  const line = state.selectedLines.find(item => item.id === lineId);

  if (!line) return;

  showModal(
    "Editar Line",
    `
      <form id="modalForm" class="form">
        <label>
          Nome da Line
          <input id="lineName" value="${escapeHtml(line.name)}" />
        </label>

        <label>
          Descrição
          <textarea id="lineDescription">${escapeHtml(line.description || "")}</textarea>
        </label>

        ${renderUpload("lineLogo", "lineLogoPreview", "Foto da Line", line.logoData || "", "image-plus")}

        <div class="form-actions">
          <button class="btn btn-secondary" type="button" data-action="close-modal">Cancelar</button>
          <button class="btn btn-primary" type="submit">${icon("save")} Salvar</button>
        </div>
      </form>
    `,
    async () => {
      const logoFile = document.querySelector("#lineLogo")?.files?.[0];

      const logoData = logoFile
        ? await imageFileToBase64(logoFile)
        : line.logoData || "";

      const ok = await updateLine(lineId, {
        name: document.querySelector("#lineName").value,
        description: document.querySelector("#lineDescription").value,
        logoData,
      });

      if (ok) closeModal();
    }
  );
}

function openPlayerModal(player = null) {
  const isEdit = Boolean(player);

  showModal(
    isEdit ? "Editar Pessoa" : "Adicionar Pessoa",
    `
      <form id="modalForm" class="form">
        ${renderUpload("playerLogo", "playerLogoPreview", "Foto do Membro", player?.logoData || "", "user-plus")}

        <div class="grid-2">
          <label>
            Nome
            <input id="playerName" value="${escapeHtml(player?.name || "")}" placeholder="Ex: Tito Galeria" />
          </label>

          <label>
            Nick
            <input id="playerNick" value="${escapeHtml(player?.nick || "")}" placeholder="Ex: NX TITO" />
          </label>
        </div>

        <div class="grid-2">
          <label>
            ID do jogador
            <input id="playerId" value="${escapeHtml(player?.playerId || "")}" placeholder="Ex: 1234567890" />
          </label>

          <label>
            Função
            <input id="playerRole" value="${escapeHtml(player?.role || "")}" placeholder="Ex: Rush, Suporte..." />
          </label>
        </div>

        <div class="grid-2">
          <label>
            Honra
            <input id="playerHonor" type="number" value="${Number(player?.honor || 0)}" />
          </label>

          <label>
            Guerra
            <input id="playerWar" type="number" value="${Number(player?.war || 0)}" />
          </label>
        </div>

        <label>
          Observações
          <textarea id="playerNotes" placeholder="Informações específicas sobre o jogador...">${escapeHtml(player?.notes || "")}</textarea>
        </label>

        <div class="form-actions">
          <button class="btn btn-secondary" type="button" data-action="close-modal">Cancelar</button>
          <button class="btn btn-primary" type="submit">${icon("save")} Salvar</button>
        </div>
      </form>
    `,
    async () => {
      const logoFile = document.querySelector("#playerLogo")?.files?.[0];

      const logoData = logoFile
        ? await imageFileToBase64(logoFile)
        : player?.logoData || "";

      const data = {
        name: document.querySelector("#playerName").value,
        nick: document.querySelector("#playerNick").value,
        playerId: document.querySelector("#playerId").value,
        role: document.querySelector("#playerRole").value,
        honor: document.querySelector("#playerHonor").value,
        war: document.querySelector("#playerWar").value,
        notes: document.querySelector("#playerNotes").value,
        logoData,
      };

      let ok = false;

      if (isEdit) {
        ok = await updatePlayer(player.id, data);
      } else {
        ok = await createPlayer(data);
      }

      if (ok) closeModal();
    }
  );
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");

  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === "home") route("home");

  if (action === "admin") {
    if (!state.user) {
      state.homeTab = "login";
      route("home");
      return;
    }

    await loadOwnerGuilds();
    await loadSubGuilds();
    route("admin");
  }

  if (action === "ranking") {
    await loadGlobalRanking();
  }

  if (action === "show-login") {
    state.homeTab = "login";
    route("home");
  }

  if (action === "logout") logout();

  if (action === "tab-search") {
    state.homeTab = "search";
    render();
  }

  if (action === "tab-login") {
    state.homeTab = "login";
    render();
  }

  if (action === "switch-auth") {
    state.authMode = state.authMode === "login" ? "register" : "login";
    render();
  }

  if (action === "search-code") {
    const code = document.querySelector("#searchCodeInput")?.value;
    await searchGuildByCode(code);
  }

  if (action === "open-create-guild") openCreateGuildModal();

  if (action === "open-owner-guild") {
    await loadGuildTree(id, false);
  }

  if (action === "delete-guild") {
    await deleteGuild(id);
  }

  if (action === "delete-selected-guild") {
    await deleteGuild(state.selectedGuild.id);
  }

  if (action === "open-edit-guild") openEditGuildModal();

  if (action === "open-sub-help") openSubHelpModal();

  if (action === "open-subleaders") openSubLeadersModal();

  if (action === "edit-subleader") openEditSubLeaderModal(id);

  if (action === "remove-subleader") await removeSubLeader(id);

  if (action === "open-create-line") openCreateLineModal();

  if (action === "open-edit-line") openEditLineModal(id);

  if (action === "delete-line") await deleteLine(id);

  if (action === "open-line") await loadLine(id);

  if (action === "back-to-guild") {
    state.selectedLine = null;
    state.selectedPlayers = [];
    state.playerSearch = "";
    state.view = "guild";
    render();
  }

  if (action === "open-create-player") openPlayerModal();

  if (action === "open-edit-player") {
    const player = state.selectedPlayers.find(item => item.id === id);
    openPlayerModal(player);
  }

  if (action === "delete-player") await deletePlayer(id);

  if (action === "close-modal") closeModal();
});

document.addEventListener("submit", async (event) => {
  if (event.target.id === "authForm") {
    event.preventDefault();

    const email = document.querySelector("#authEmail").value.trim();
    const password = document.querySelector("#authPassword").value.trim();

    if (state.authMode === "login") {
      await login(email, password);
    } else {
      await register(email, password);
    }
  }

  if (event.target.id === "modalForm") {
    event.preventDefault();
    await state.modalSubmit?.();
  }
});

document.addEventListener("keydown", async (event) => {
  if (event.target.id === "searchCodeInput" && event.key === "Enter") {
    await searchGuildByCode(event.target.value);
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "playerSearch") {
    state.playerSearch = event.target.value;
    render();

    setTimeout(() => {
      const input = document.querySelector("#playerSearch");

      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }, 0);
  }

  if (event.target.id === "guildCode" || event.target.id === "searchCodeInput") {
    event.target.value = event.target.value.toUpperCase();
  }
});

onAuthStateChanged(auth, async (user) => {
  state.user = user;

  if (user) {
    try {
      await ensureUserProfile(user);
    } catch (error) {
      console.error("Erro ao salvar usuário:", error);
      toast("Atualize as Rules do Firebase para usar sublíderes.");
    }

    await loadOwnerGuilds();
    await loadSubGuilds();
  } else {
    state.ownerGuilds = [];
    state.subGuilds = [];
  }

  render();
});

render();
