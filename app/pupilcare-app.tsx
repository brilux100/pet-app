"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type View =
  | "home"
  | "profile"
  | "health"
  | "calendar"
  | "documents"
  | "ai"
  | "services"
  | "vet24";

type Modal = "pet" | "visit" | "document" | "premium" | null;

type Visit = {
  id: string;
  title: string;
  type: string;
  date: string;
  time: string;
  place: string;
};

type Vaccine = {
  id: string;
  name: string;
  date: string;
  nextDate: string;
  status: "ok" | "soon" | "missing";
};

type PetDocument = {
  id: string;
  name: string;
  kind: string;
  date: string;
};

type Pet = {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: string;
  sex: string;
  weight: string;
  emoji: string;
  color: string;
  photoPath?: string;
  photoUrl?: string;
  healthScore: number;
  allergies: string;
  medications: string;
  conditions: string;
  vet: string;
  vaccines: Vaccine[];
  visits: Visit[];
  documents: PetDocument[];
};

type NewPetInput = {
  name: string;
  species: string;
  breed: string;
  age: string;
  sex: string;
  weight: string;
  photo?: File | null;
};

type PupilCareAppProps = {
  supabase?: SupabaseClient;
  userId?: string;
  userEmail?: string;
  onSignOut?: () => void | Promise<void>;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  cta?: "premium" | "vet24";
};

type IconName =
  | "home"
  | "paw"
  | "heart"
  | "calendar"
  | "file"
  | "spark"
  | "cross"
  | "plus"
  | "bell"
  | "arrow"
  | "clock"
  | "pin"
  | "shield"
  | "send"
  | "shop"
  | "menu"
  | "close";

// Fictional, non-identifying records used only to demonstrate the interface.
const demoPets: Pet[] = [
  {
    id: "bruno",
    name: "Bruno",
    species: "Pies",
    breed: "Labrador retriever",
    age: "3 lata",
    sex: "Samiec",
    weight: "31,4 kg",
    emoji: "🐶",
    color: "#d9f7e8",
    healthScore: 92,
    allergies: "Brak zgłoszonych",
    medications: "Brak",
    conditions: "Brak chorób przewlekłych",
    vet: "Przychodnia VetCare",
    vaccines: [
      {
        id: "v1",
        name: "Wścieklizna",
        date: "12.09.2025",
        nextDate: "12.09.2026",
        status: "soon",
      },
      {
        id: "v2",
        name: "Szczepienie podstawowe",
        date: "03.02.2026",
        nextDate: "03.02.2027",
        status: "ok",
      },
    ],
    visits: [
      {
        id: "visit-1",
        title: "Kontrola i szczepienie",
        type: "Weterynarz",
        date: "2026-09-12",
        time: "10:30",
        place: "VetCare, Gdańsk",
      },
      {
        id: "visit-2",
        title: "Pielęgnacja sierści",
        type: "Groomer",
        date: "2026-09-28",
        time: "16:00",
        place: "Happy Paws",
      },
    ],
    documents: [
      { id: "d1", name: "Książeczka zdrowia", kind: "Zdrowie", date: "18.08.2026" },
      { id: "d2", name: "Wyniki morfologii", kind: "Badania", date: "07.06.2026" },
      { id: "d3", name: "Polisa ubezpieczeniowa", kind: "Ubezpieczenie", date: "02.01.2026" },
    ],
  },
  {
    id: "luna",
    name: "Luna",
    species: "Kot",
    breed: "Europejski krótkowłosy",
    age: "2 lata",
    sex: "Samica",
    weight: "4,6 kg",
    emoji: "🐱",
    color: "#ffe8c7",
    healthScore: 88,
    allergies: "Podejrzenie alergii na kurczaka",
    medications: "Brak",
    conditions: "Wrażliwy układ pokarmowy",
    vet: "Przychodnia VetCare",
    vaccines: [
      {
        id: "lv1",
        name: "Szczepienie podstawowe",
        date: "14.04.2026",
        nextDate: "14.04.2027",
        status: "ok",
      },
    ],
    visits: [],
    documents: [
      { id: "ld1", name: "Karta adopcyjna", kind: "Inne", date: "11.03.2025" },
    ],
  },
];

const navigation: { id: View; label: string; icon: IconName }[] = [
  { id: "home", label: "Start", icon: "home" },
  { id: "profile", label: "Profil pupila", icon: "paw" },
  { id: "health", label: "Zdrowie", icon: "heart" },
  { id: "calendar", label: "Wizyty", icon: "calendar" },
  { id: "documents", label: "Dokumenty", icon: "file" },
  { id: "ai", label: "AI Asystent", icon: "spark" },
  { id: "services", label: "Specjaliści", icon: "cross" },
];

const quickPrompts = [
  "Bruno nie je od rana",
  "Drapie się częściej niż zwykle",
  "Jak przygotować się do szczepienia?",
];

function createId(prefix: string) {
  return prefix + "-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function petEmoji(species: string) {
  const value = species.toLowerCase();
  if (value.includes("kot")) return "🐱";
  if (value.includes("królik")) return "🐰";
  if (value.includes("gryzo")) return "🐹";
  if (value.includes("ptak")) return "🐦";
  if (value.includes("gad")) return "🦎";
  if (value.includes("koń")) return "🐴";
  if (value.includes("ryb")) return "🐠";
  if (value.includes("inny")) return "🐾";
  return "🐶";
}

const FREE_AI_LIMIT = 5;

function isPetTopic(question: string, petName: string) {
  const text = question.toLowerCase();
  const petWords = [
    petName.toLowerCase(), "pies", "psa", "psu", "kot", "kota", "pupil", "zwierz",
    "je", "pije", "karma", "karmi", "wymiot", "biegun", "drapie", "skóra", "sierść",
    "łapa", "ucho", "oczy", "ząb", "zęby", "szczep", "lek", "weterynar", "groom",
    "spacer", "zachowanie", "trening", "odrobacz", "kleszcz", "pchł", "ból", "apat",
    "kaszel", "oddech", "temperatur", "waga", "alerg", "stolec", "mocz", "opieka",
  ];
  return petWords.some((word) => text.includes(word));
}

function isUrgentPetQuestion(question: string) {
  const text = question.toLowerCase();
  return [
    "nie oddycha", "dusi", "drgaw", "krwawi", "truciz", "zjadł lek", "nieprzytom",
    "wypadek", "potrącon", "skręt żołądka", "wzdęty brzuch",
  ].some((word) => text.includes(word));
}

function formatDate(date: string) {
  if (!date) return "Bez daty";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date + "T12:00:00"));
}

function petFromRow(row: Record<string, any>): Pet {
  return {
    id: String(row.id),
    name: String(row.name),
    species: String(row.species),
    breed: String(row.breed || "Nie podano"),
    age: String(row.age_label || "Nie podano"),
    sex: String(row.sex || "Nie podano"),
    weight: String(row.weight_label || "Nie podano"),
    emoji: String(row.emoji || petEmoji(String(row.species))),
    color: String(row.color || "#dff6ff"),
    photoPath: row.photo_path ? String(row.photo_path) : undefined,
    healthScore: Number(row.health_score || 72),
    allergies: String(row.allergies || "Nie uzupełniono"),
    medications: String(row.medications || "Nie uzupełniono"),
    conditions: String(row.conditions || "Nie uzupełniono"),
    vet: String(row.veterinarian || "Nie wybrano"),
    vaccines: (row.vaccines || []).map((item: Record<string, any>) => ({
      id: String(item.id),
      name: String(item.name),
      date: String(item.administered_on || ""),
      nextDate: String(item.next_due_on || ""),
      status: item.status === "soon" || item.status === "missing" ? item.status : "ok",
    })),
    visits: (row.visits || []).map((item: Record<string, any>) => ({
      id: String(item.id),
      title: String(item.title),
      type: String(item.visit_type),
      date: String(item.visit_date || ""),
      time: String(item.visit_time || "").slice(0, 5),
      place: String(item.place || ""),
    })),
    documents: (row.documents || []).map((item: Record<string, any>) => ({
      id: String(item.id),
      name: String(item.name),
      kind: String(item.kind),
      date: new Date(String(item.created_at)).toLocaleDateString("pl-PL"),
    })),
  };
}

export default function PupilCareApp({ supabase, userId, userEmail, onSignOut }: PupilCareAppProps = {}) {
  const authenticated = Boolean(supabase && userId);
  const [view, setView] = useState<View>("home");
  const [modal, setModal] = useState<Modal>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [pets, setPets] = useState<Pet[]>(authenticated ? [] : demoPets);
  const [activePetId, setActivePetId] = useState("bruno");
  const [dataLoading, setDataLoading] = useState(authenticated);
  const [dataError, setDataError] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([
    {
      id: "hello",
      role: "assistant",
      text: "Cześć! Znam profil Bruna i jego historię zdrowia. Opisz, co się dzieje, a pomogę uporządkować kolejne kroki.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [aiUsed, setAiUsed] = useState(0);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (authenticated) return;
    const saved = window.localStorage.getItem("pupilcare-pets-v1");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { pets: Pet[]; activePetId: string };
      if (parsed.pets?.length) {
        const timer = window.setTimeout(() => {
          setPets(parsed.pets);
          setActivePetId(parsed.activePetId || parsed.pets[0].id);
        }, 0);
        return () => window.clearTimeout(timer);
      }
    } catch {
      window.localStorage.removeItem("pupilcare-pets-v1");
    }
  }, [authenticated]);

  useEffect(() => {
    if (authenticated) return;
    const account = window.localStorage.getItem("pupilcare-account-v1");
    if (!account) return;
    try {
      const parsed = JSON.parse(account) as {
        aiUsed?: number;
        isPremium?: boolean;
      };
      const timer = window.setTimeout(() => {
        setAiUsed(parsed.aiUsed || 0);
        setIsPremium(Boolean(parsed.isPremium));
      }, 0);
      return () => window.clearTimeout(timer);
    } catch {
      window.localStorage.removeItem("pupilcare-account-v1");
    }
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated || !supabase || !userId) {
      setDataLoading(false);
      return;
    }
    let mounted = true;
    async function loadAccount() {
      setDataLoading(true);
      setDataError("");
      const profileUpsert = await supabase!.from("profiles").upsert(
        { id: userId, email: userEmail ?? null },
        { onConflict: "id" },
      );
      const [petsResult, profileResult] = await Promise.all([
        supabase!.from("pets").select("*, vaccines(*), visits(*), documents(*)").order("created_at"),
        supabase!.from("profiles").select("plan").eq("id", userId).maybeSingle(),
      ]);
      if (!mounted) return;
      if (petsResult.error) {
        console.error("PupilCare pets query failed", petsResult.error);
        setDataError("Nie udało się teraz połączyć z profilem. Spróbuj odświeżyć stronę za chwilę.");
      } else {
        const loaded = await Promise.all((petsResult.data || []).map(async (row) => {
          const mapped = petFromRow(row as Record<string, any>);
          if (!mapped.photoPath) return mapped;
          const signed = await supabase!.storage.from("pet-photos").createSignedUrl(mapped.photoPath, 60 * 60 * 24);
          return { ...mapped, photoUrl: signed.data?.signedUrl };
        }));
        setPets(loaded);
        if (loaded.length) setActivePetId(loaded[0].id);
      }
      if (profileUpsert.error) console.error("PupilCare profile upsert failed", profileUpsert.error);
      setIsPremium(profileResult.data?.plan === "premium");
      setDataLoading(false);
    }
    void loadAccount();
    return () => { mounted = false; };
  }, [authenticated, supabase, userEmail, userId]);

  useEffect(() => {
    if (authenticated) return;
    window.localStorage.setItem(
      "pupilcare-pets-v1",
      JSON.stringify({ pets, activePetId })
    );
  }, [pets, activePetId, authenticated]);

  useEffect(() => {
    if (authenticated) return;
    window.localStorage.setItem(
      "pupilcare-account-v1",
      JSON.stringify({ aiUsed, isPremium })
    );
  }, [aiUsed, isPremium, authenticated]);

  const pet = pets.find((item) => item.id === activePetId) || pets[0] || demoPets[0];
  const nextVisit = useMemo(() => {
    return [...pet.visits].sort((a, b) => a.date.localeCompare(b.date))[0];
  }, [pet.visits]);

  const changeView = (next: View) => {
    setView(next);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updatePet = (nextPet: Pet) => {
    setPets((current) =>
      current.map((item) => (item.id === nextPet.id ? nextPet : item))
    );
  };

  const createPet = async (input: NewPetInput) => {
    const species = input.species || "Pies";
    const name = input.name.trim();
    if (!name) return;

    const newPet: Pet = {
      id: authenticated ? crypto.randomUUID() : createId("pet"),
      name,
      species,
      breed: input.breed || "Nie podano",
      age: input.age || "Nie podano",
      sex: input.sex || "Nie podano",
      weight: input.weight || "Nie podano",
      emoji: petEmoji(species),
      color: "#dff6ff",
      healthScore: 72,
      allergies: "Nie uzupełniono",
      medications: "Nie uzupełniono",
      conditions: "Nie uzupełniono",
      vet: "Nie wybrano",
      vaccines: [],
      visits: [],
      documents: [],
    };

    if (authenticated && supabase && userId) {
      if (input.photo) {
        if (input.photo.size > 8 * 1024 * 1024) {
          setDataError("Zdjęcie jest za duże. Wybierz plik mniejszy niż 8 MB.");
          return;
        }
        const extension = input.photo.name.split(".").pop()?.toLowerCase() || "jpg";
        const safeExtension = ["jpg", "jpeg", "png", "webp"].includes(extension) ? extension : "jpg";
        const photoPath = `${userId}/${newPet.id}/avatar.${safeExtension}`;
        const uploaded = await supabase.storage.from("pet-photos").upload(photoPath, input.photo, {
          cacheControl: "3600",
          contentType: input.photo.type || "image/jpeg",
          upsert: true,
        });
        if (uploaded.error) {
          console.error("PupilCare photo upload failed", uploaded.error);
          setDataError("Nie udało się przesłać zdjęcia. Wybierz inne zdjęcie lub spróbuj ponownie.");
          return;
        }
        newPet.photoPath = photoPath;
        newPet.photoUrl = URL.createObjectURL(input.photo);
      }

      const { error } = await supabase.from("pets").insert({
        id: newPet.id,
        owner_id: userId,
        name: newPet.name,
        species: newPet.species,
        breed: newPet.breed,
        age_label: newPet.age,
        sex: newPet.sex,
        weight_label: newPet.weight,
        emoji: newPet.emoji,
        color: newPet.color,
        health_score: newPet.healthScore,
        allergies: newPet.allergies,
        medications: newPet.medications,
        conditions: newPet.conditions,
        veterinarian: newPet.vet,
        ...(newPet.photoPath ? { photo_path: newPet.photoPath } : {}),
      });
      if (error) {
        if (newPet.photoPath) await supabase.storage.from("pet-photos").remove([newPet.photoPath]);
        console.error("PupilCare pet insert failed", error);
        setDataError("Nie udało się utworzyć profilu. Spróbuj ponownie za chwilę.");
        return;
      }
    }

    setPets((current) => [...current, newPet]);
    setActivePetId(newPet.id);
    setModal(null);
    setView("profile");
  };

  const addPet = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const photo = data.get("photo");
    await createPet({
      name: String(data.get("name") || ""),
      species: String(data.get("species") || "Pies"),
      breed: String(data.get("breed") || ""),
      age: String(data.get("age") || ""),
      sex: String(data.get("sex") || "Nie wiem"),
      weight: String(data.get("weight") || ""),
      photo: photo instanceof File && photo.size ? photo : null,
    });
  };

  const addVisit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const visit: Visit = {
      id: authenticated ? crypto.randomUUID() : createId("visit"),
      title: String(data.get("title") || "Nowa wizyta"),
      type: String(data.get("type") || "Weterynarz"),
      date: String(data.get("date") || ""),
      time: String(data.get("time") || ""),
      place: String(data.get("place") || ""),
    };
    if (authenticated && supabase && userId) {
      const { error } = await supabase.from("visits").insert({
        id: visit.id,
        owner_id: userId,
        pet_id: pet.id,
        title: visit.title,
        visit_type: visit.type,
        visit_date: visit.date || null,
        visit_time: visit.time || null,
        place: visit.place,
      });
      if (error) {
        setDataError("Nie udało się zapisać wizyty.");
        return;
      }
    }
    updatePet({ ...pet, visits: [visit, ...pet.visits] });
    setModal(null);
    setView("calendar");
  };

  const addDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const document: PetDocument = {
      id: authenticated ? crypto.randomUUID() : createId("document"),
      name: String(data.get("name") || "Nowy dokument"),
      kind: String(data.get("kind") || "Inne"),
      date: new Date().toLocaleDateString("pl-PL"),
    };
    if (authenticated && supabase && userId) {
      const { error } = await supabase.from("documents").insert({
        id: document.id,
        owner_id: userId,
        pet_id: pet.id,
        name: document.name,
        kind: document.kind,
      });
      if (error) {
        setDataError("Nie udało się zapisać dokumentu.");
        return;
      }
    }
    updatePet({ ...pet, documents: [document, ...pet.documents] });
    setModal(null);
    setView("documents");
  };

  const askAi = (text?: string) => {
    const question = (text || chatInput).trim();
    if (!question) return;
    const urgent = isUrgentPetQuestion(question);

    if (!isPetTopic(question, pet.name)) {
      setChat((current) => [
        ...current,
        { id: createId("user"), role: "user", text: question },
        {
          id: createId("assistant"),
          role: "assistant",
          text: "Jestem asystentem PupilCare i pomagam wyłącznie w sprawach związanych z Twoim pupilem. Zapytaj mnie o zdrowie, żywienie, zachowanie, pielęgnację lub opiekę nad " + pet.name + ".",
        },
      ]);
      setChatInput("");
      return;
    }

    if (!isPremium && aiUsed >= FREE_AI_LIMIT && !urgent) {
      setModal("premium");
      return;
    }

    const lower = question.toLowerCase();
    let answer =
      "Zapisz, od kiedy trwa objaw i czy zmieniły się apetyt, pragnienie lub zachowanie. Jeśli stan się pogarsza, skontaktuj się z weterynarzem.";
    let cta: ChatMessage["cta"] = "premium";
    if (urgent) {
      answer =
        "To może być stan nagły. Nie czekaj na kolejną odpowiedź AI: przejdź do Vet 24/7 albo natychmiast zadzwoń do najbliższej całodobowej kliniki. Jeśli możesz, przygotuj informację o czasie wystąpienia objawów, lekach i możliwych toksynach.";
      cta = "vet24";
    } else if (lower.includes("nie je")) {
      answer =
        "Brak apetytu przez kilka godzin nie zawsze oznacza nagły problem, ale obserwuj " + pet.name + ". Zapewnij wodę i nie podawaj ludzkich leków. Jeśli nie je ponad 24 godziny, wymiotuje, jest apatyczny albo ma wzdęty brzuch — pilnie skontaktuj się z weterynarzem.";
      cta = "vet24";
    } else if (lower.includes("drapie")) {
      answer =
        "Sprawdź skórę, uszy i sierść: zaczerwienienie, ranki, pasożyty lub nowy kosmetyk mogą być ważną wskazówką. Zrób zdjęcie zmiany i umów konsultację, jeśli świąd trwa dłużej niż 1–2 dni lub pojawią się rany.";
    } else if (lower.includes("szczep")) {
      answer =
        "Przed szczepieniem " + pet.name + " powinien czuć się dobrze. Zabierz książeczkę zdrowia, listę leków i informację o ostatnim odrobaczeniu. Po szczepieniu zaplanuj spokojniejszy dzień i obserwuj samopoczucie.";
    }
    if (!isPremium && !urgent) setAiUsed((current) => current + 1);
    setChat((current) => [
      ...current,
      { id: createId("user"), role: "user", text: question },
      { id: createId("assistant"), role: "assistant", text: answer, cta },
    ]);
    setChatInput("");
  };

  const finishVet24 = (summary: string) => {
    const now = new Date();
    const visit: Visit = {
      id: createId("vet24"),
      title: "Konsultacja Vet 24/7",
      type: "Weterynarz online",
      date: now.toISOString().slice(0, 10),
      time: now.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
      place: summary,
    };
    updatePet({ ...pet, visits: [visit, ...pet.visits] });
  };

  if (dataLoading) {
    return <main className="auth-loading"><span className="auth-loader" /><strong>Pobieramy profile pupili…</strong></main>;
  }

  if (authenticated && pets.length === 0) {
    return <FirstPetSetup onSubmit={createPet} email={userEmail} error={dataError} onSignOut={onSignOut} />;
  }

  return (
    <main className="app-shell">
      <aside className={mobileMenu ? "sidebar sidebar-open" : "sidebar"}>
        <div className="brand">
          <div className="brand-mark"><Icon name="paw" /></div>
          <div>
            <strong>PupilCare</strong>
            <span>pet care hub</span>
          </div>
        </div>

        <button
          className="mobile-close"
          aria-label="Zamknij menu"
          onClick={() => setMobileMenu(false)}
        >
          <Icon name="close" />
        </button>

        <div className="pet-switcher">
          <PetAvatar pet={pet} className="small" />
          <label>
            <span>Aktywny profil</span>
            <select value={activePetId} onChange={(event) => setActivePetId(event.target.value)}>
              {pets.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <button className="icon-button" aria-label="Dodaj pupila" onClick={() => setModal("pet")}>
            <Icon name="plus" />
          </button>
        </div>

        <nav className="main-nav" aria-label="Główna nawigacja">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "nav-item active" : "nav-item"}
              onClick={() => changeView(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.id === "ai" && <em>AI</em>}
            </button>
          ))}
        </nav>

        <div className="sidebar-help">
          <span className="status-dot" />
          <div>
            <strong>Vet24 dostępny</strong>
            <p>Porozmawiaj ze specjalistą</p>
          </div>
          <button onClick={() => changeView("vet24")}><Icon name="arrow" /></button>
        </div>

        <button className="sidebar-user" onClick={() => setModal("premium")} title={userEmail}>
          <span className="user-avatar">{userEmail?.slice(0, 1).toUpperCase() || "M"}</span>
          <div><strong>{userEmail ? "Moje konto" : "Wersja demo"}</strong><span>{isPremium ? "PupilCare Premium" : "Plan bezpłatny"}</span></div>
        </button>
      </aside>

      {mobileMenu && <button className="sidebar-backdrop" aria-label="Zamknij menu" onClick={() => setMobileMenu(false)} />}

      <section className="app-content">
        <header className="topbar">
          <button className="menu-button" aria-label="Otwórz menu" onClick={() => setMobileMenu(true)}>
            <Icon name="menu" />
          </button>
          <div className="mobile-brand">PupilCare</div>
          <div className="top-actions">
            {onSignOut && <button className="signout-button" onClick={() => void onSignOut()}>Wyloguj</button>}
            <button className="top-action" aria-label="Powiadomienia">
              <Icon name="bell" /><span className="notification-dot" />
            </button>
            <button className="add-pet-button" onClick={() => setModal("pet")}>
              <Icon name="plus" /> Dodaj pupila
            </button>
          </div>
        </header>

        {view === "home" && (
          <Dashboard
            pet={pet}
            nextVisit={nextVisit}
            onView={changeView}
            onVisit={() => setModal("visit")}
            onDocument={() => setModal("document")}
            onVet24={() => changeView("vet24")}
          />
        )}
        {view === "profile" && <Profile pet={pet} />}
        {view === "health" && <Health pet={pet} onDocument={() => setModal("document")} />}
        {view === "calendar" && <CalendarView pet={pet} onAdd={() => setModal("visit")} />}
        {view === "documents" && <Documents pet={pet} onAdd={() => setModal("document")} />}
        {view === "ai" && (
          <AiAssistant
            pet={pet}
            messages={chat}
            input={chatInput}
            setInput={setChatInput}
            onAsk={askAi}
            onVet={() => changeView("vet24")}
            onPremium={() => setModal("premium")}
            remaining={Math.max(0, FREE_AI_LIMIT - aiUsed)}
            isPremium={isPremium}
          />
        )}
        {view === "services" && <Services pet={pet} onVet24={() => changeView("vet24")} />}
        {view === "vet24" && (
          <Vet24
            pet={pet}
            isPremium={isPremium}
            onFinish={finishVet24}
            onHistory={() => changeView("calendar")}
          />
        )}
      </section>

      <nav className="bottom-nav" aria-label="Nawigacja mobilna">
        {navigation.slice(0, 5).map((item) => (
          <button
            key={item.id}
            className={view === item.id ? "active" : ""}
            onClick={() => changeView(item.id)}
          >
            <Icon name={item.icon} />
            <span>{item.label.split(" ")[0]}</span>
          </button>
        ))}
      </nav>

      {modal === "pet" && (
        <ModalShell title="Dodaj pupila" subtitle="Podstawowe dane wystarczą na początek" onClose={() => setModal(null)}>
          <form className="form-grid" onSubmit={addPet}>
            <label className="upload-box full pet-photo-field"><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /><Icon name="plus" /><span><strong>Dodaj zdjęcie pupila</strong><small>JPG, PNG lub WEBP · maks. 8 MB</small></span></label>
            <Field label="Imię pupila" name="name" placeholder="np. Figa" required />
            <SelectField label="Gatunek" name="species" options={["Pies", "Kot", "Królik", "Gryzoń", "Ptak", "Gad", "Koń", "Inny"]} />
            <Field label="Rasa" name="breed" placeholder="np. Beagle" />
            <Field label="Wiek lub data urodzenia" name="age" placeholder="np. 2 lata" />
            <SelectField label="Płeć" name="sex" options={["Samica", "Samiec", "Nie wiem"]} />
            <Field label="Waga" name="weight" placeholder="np. 8,5 kg" />
            <div className="form-actions full">
              <button type="button" className="secondary-button" onClick={() => setModal(null)}>Anuluj</button>
              <button type="submit" className="primary-button">Utwórz profil <Icon name="arrow" /></button>
            </div>
          </form>
        </ModalShell>
      )}

      {modal === "visit" && (
        <ModalShell title="Dodaj wizytę" subtitle={"Nowe wydarzenie dla " + pet.name} onClose={() => setModal(null)}>
          <form className="form-grid" onSubmit={addVisit}>
            <SelectField label="Typ wizyty" name="type" options={["Weterynarz", "Groomer", "Hotel", "Przypomnienie"]} />
            <Field label="Tytuł" name="title" placeholder="np. Kontrola" required />
            <Field label="Data" name="date" type="date" required />
            <Field label="Godzina" name="time" type="time" />
            <Field label="Miejsce" name="place" placeholder="Nazwa i adres" full />
            <div className="form-actions full">
              <button type="button" className="secondary-button" onClick={() => setModal(null)}>Anuluj</button>
              <button type="submit" className="primary-button">Zapisz wizytę</button>
            </div>
          </form>
        </ModalShell>
      )}

      {modal === "document" && (
        <ModalShell title="Dodaj dokument" subtitle={"Dokument zostanie zapisany w profilu " + pet.name} onClose={() => setModal(null)}>
          <form className="form-grid" onSubmit={addDocument}>
            <Field label="Nazwa dokumentu" name="name" placeholder="np. Wyniki badania krwi" required full />
            <SelectField label="Kategoria" name="kind" options={["Zdrowie", "Badania", "Szczepienia", "Ubezpieczenie", "Inne"]} full />
            <label className="upload-box full">
              <Icon name="file" />
              <strong>Wybierz plik</strong>
              <span>PDF, JPG lub PNG — do 10 MB</span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" />
            </label>
            <div className="form-actions full">
              <button type="button" className="secondary-button" onClick={() => setModal(null)}>Anuluj</button>
              <button type="submit" className="primary-button">Dodaj dokument</button>
            </div>
          </form>
        </ModalShell>
      )}

      {modal === "premium" && (
        <ModalShell
          title="PupilCare Premium"
          subtitle="Więcej pewności i pełna historia opieki"
          onClose={() => setModal(null)}
        >
          <div className="premium-modal">
            <div className="premium-hero">
              <span><Icon name="spark" /></span>
              <div>
                <small>Plan dla świadomego opiekuna</small>
                <h3>{isPremium ? "Premium jest aktywny" : "Zadbaj o pupila bez limitów"}</h3>
              </div>
            </div>
            <div className="premium-benefits">
              <div><Icon name="spark" /><span><strong>Rozszerzony AI</strong><small>Więcej pytań i pełny kontekst historii</small></span></div>
              <div><Icon name="cross" /><span><strong>Vet 24/7 za 49,99 zł</strong><small>Zamiast 89,99 zł bez Premium</small></span></div>
              <div><Icon name="file" /><span><strong>Pełna historia</strong><small>Dokumenty, wizyty i zalecenia bez ograniczeń</small></span></div>
              <div><Icon name="shop" /><span><strong>Opłata serwisowa 4,99 zł</strong><small>Zamiast 9,99 zł za każdą rezerwację</small></span></div>
            </div>
            {!isPremium ? (
              <button
                className="premium-activate"
                onClick={() => { if (!authenticated) setIsPremium(true); setModal(null); }}
              >
                Premium · 39,99 zł/mies. <Icon name="arrow" />
              </button>
            ) : (
              <button className="secondary-button" onClick={() => setModal(null)}>Wróć do PupilCare</button>
            )}
            <p className="premium-note">Subskrypcję można anulować w dowolnym momencie. Płatności podłączymy w kolejnym etapie.</p>
          </div>
        </ModalShell>
      )}
    </main>
  );
}

function Dashboard({
  pet,
  nextVisit,
  onView,
  onVisit,
  onDocument,
  onVet24,
}: {
  pet: Pet;
  nextVisit?: Visit;
  onView: (view: View) => void;
  onVisit: () => void;
  onDocument: () => void;
  onVet24: () => void;
}) {
  const services = [
    {
      icon: "cross" as IconName,
      title: "Weterynarz",
      text: "Znajdź klinikę i umów wizytę",
      tone: "mint",
      badge: "Terminy online",
    },
    {
      icon: "spark" as IconName,
      title: "Grooming",
      text: "Pielęgnacja, kąpiel i strzyżenie",
      tone: "purple",
      badge: "Najbliżej Ciebie",
    },
    {
      icon: "shop" as IconName,
      title: "Sklep dla pupila",
      text: "Karma, akcesoria i sprawdzone produkty",
      tone: "yellow",
      badge: "Polecane dla " + pet.name,
    },
    {
      icon: "paw" as IconName,
      title: "Opieka i hotel",
      text: "Opiekun, petsitter i nocleg",
      tone: "blue",
      badge: "Bezpieczna opieka",
    },
  ];

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Dzień dobry, {pet.name} jest z Tobą</p>
          <h1>Czego dziś potrzebuje Twój pupil?</h1>
          <p>Wybierz usługę albo poproś o pomoc — cała opieka jest w jednym miejscu.</p>
        </div>
        <div className="today-chip"><Icon name="calendar" /> Sobota, 22 sierpnia</div>
      </div>

      <section className="home-feature-grid">
        <article className="vet24-home-card">
          <div className="vet24-home-copy">
            <span className="online-chip"><i /> Lekarz online teraz</span>
            <div className="home-feature-icon"><Icon name="cross" /></div>
            <p className="feature-label">Pomoc zawsze pod ręką</p>
            <h2>Weterynarz<br />24/7</h2>
            <p className="feature-description">
              Opisz, co się dzieje, i połącz się z lekarzem bez czekania do rana.
            </p>
            <button onClick={onVet24}>
              Połącz z weterynarzem <Icon name="arrow" />
            </button>
          </div>
          <div className="vet24-pet">
            <PetAvatar pet={pet} className="vet" />
            <div className="doctor-badge"><Icon name="cross" /><span><strong>Vet24</strong><em>gotowy do rozmowy</em></span></div>
          </div>
        </article>

        <article className="ai-home-card">
          <div className="ai-home-top">
            <span className="home-feature-icon purple"><Icon name="spark" /></span>
            <span className="beta-chip">AI</span>
          </div>
          <div>
            <p className="feature-label">Pierwszy krok</p>
            <h2>AI Asystent</h2>
            <p>Opisz objawy, zachowanie albo zadaj pytanie o opiekę nad {pet.name}.</p>
          </div>
          <div className="ai-home-prompt">
            <span>„{pet.name} nie je od rana...”</span>
            <button aria-label="Otwórz AI Asystenta" onClick={() => onView("ai")}><Icon name="send" /></button>
          </div>
          <button className="ai-home-button" onClick={() => onView("ai")}>
            Zapytaj AI Asystenta <Icon name="arrow" />
          </button>
        </article>
      </section>

      <div className="home-section-title">
        <div>
          <span className="section-kicker">Ekosystem PupilCare</span>
          <h2>Wszystko dla Twojego pupila</h2>
        </div>
        <button onClick={() => onView("services")}>Zobacz wszystkie <Icon name="arrow" /></button>
      </div>

      <section className="ecosystem-grid">
        {services.map((service) => (
          <button className="ecosystem-card" key={service.title} onClick={() => onView("services")}>
            <span className={"ecosystem-icon " + service.tone}><Icon name={service.icon} /></span>
            <span className="ecosystem-copy">
              <em>{service.badge}</em>
              <strong>{service.title}</strong>
              <small>{service.text}</small>
            </span>
            <span className="ecosystem-arrow"><Icon name="arrow" /></span>
          </button>
        ))}
      </section>

      <section className="home-summary-grid">
        <article className="card compact-health-card">
          <div className="compact-health-head">
            <span className="action-icon mint"><Icon name="heart" /></span>
            <div>
              <span className="section-kicker">Zdrowie {pet.name}</span>
              <h2>Profil zdrowia</h2>
            </div>
            <button onClick={() => onView("health")}>Szczegóły <Icon name="arrow" /></button>
          </div>
          <div className="health-inline">
            <div className="health-number"><strong>{pet.healthScore}</strong><span>/100</span></div>
            <div className="health-inline-copy">
              <strong>Dobra kondycja profilu</strong>
              <p>Szczepienia: {pet.vaccines.length} · Dokumenty: {pet.documents.length}</p>
              <div className="progress-line"><span style={{ width: pet.healthScore + "%" }} /></div>
            </div>
          </div>
          <div className="health-shortcuts">
            <button onClick={() => onView("health")}><Icon name="shield" /> Szczepienia</button>
            <button onClick={() => onView("documents")}><Icon name="file" /> Dokumenty</button>
            <button onClick={onDocument}><Icon name="plus" /> Dodaj plik</button>
          </div>
        </article>

        <article className="card next-care-card">
          <div className="section-title">
            <div><span className="section-kicker">Plan opieki</span><h2>Co dalej?</h2></div>
            <button onClick={onVisit}><Icon name="plus" /> Dodaj</button>
          </div>
          {nextVisit ? (
            <button className="visit-feature" onClick={() => onView("calendar")}>
              <div className="date-block"><strong>{new Date(nextVisit.date + "T12:00:00").getDate()}</strong><span>WRZ</span></div>
              <div className="visit-copy">
                <span>{nextVisit.type}</span>
                <h3>{nextVisit.title}</h3>
                <p><Icon name="clock" /> {nextVisit.time || "Godzina do ustalenia"} <Icon name="pin" /> {nextVisit.place || "Miejsce do ustalenia"}</p>
              </div>
              <span className="round-arrow"><Icon name="arrow" /></span>
            </button>
          ) : (
            <EmptyState icon="calendar" title="Brak zaplanowanych wizyt" action="Dodaj pierwszą wizytę" onAction={onVisit} />
          )}
          <div className="reminder-row">
            <span className="reminder-icon"><Icon name="shield" /></span>
            <div><strong>Szczepienie przeciwko wściekliźnie</strong><p>Termin za 21 dni</p></div>
            <span className="warning-chip">Wkrótce</span>
          </div>
        </article>
      </section>
    </div>
  );
}

function FirstPetSetup({
  onSubmit,
  email,
  error,
  onSignOut,
}: {
  onSubmit: (input: NewPetInput) => void | Promise<void>;
  email?: string;
  error?: string;
  onSignOut?: () => void | Promise<void>;
}) {
  const [step, setStep] = useState(1);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState<NewPetInput>({
    name: "",
    species: "Pies",
    breed: "",
    age: "",
    sex: "Nie wiem",
    weight: "",
    photo: null,
  });
  const [photoPreview, setPhotoPreview] = useState("");

  useEffect(() => {
    if (!draft.photo) {
      setPhotoPreview("");
      return;
    }
    const url = URL.createObjectURL(draft.photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [draft.photo]);

  const update = (key: keyof NewPetInput, value: string | File | null) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const chooseSpecies = (species: string) => {
    update("species", species);
  };

  const next = () => {
    if (step === 2 && !draft.name.trim()) return;
    setStep((current) => Math.min(4, current + 1));
  };

  const finish = async () => {
    setPending(true);
    await onSubmit(draft);
    setPending(false);
  };

  const onPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file && file.size > 8 * 1024 * 1024) {
      event.target.value = "";
      return;
    }
    update("photo", file);
  };

  const speciesCards = [
    { value: "Pies", label: "Pies", image: "/onboarding/dog.webp" },
    { value: "Kot", label: "Kot", image: "/onboarding/cat.webp" },
    { value: "Królik", label: "Inny pupil", image: "/onboarding/other-pets.webp" },
  ];

  return (
    <main className="first-pet-page">
      <section className="onboarding-shell">
        <header className="onboarding-header">
          <div className="brand auth-brand">
            <div className="brand-mark">🐾</div>
            <div><strong>PupilCare</strong><span>{email || "Nowe konto"}</span></div>
          </div>
          {onSignOut && <button className="onboarding-signout" onClick={() => void onSignOut()}>Wyloguj się</button>}
        </header>

        <div className="onboarding-progress" aria-label={`Krok ${step} z 4`}>
          <div><span style={{ width: `${step * 25}%` }} /></div>
          <strong>{step} / 4</strong>
        </div>

        <div className="onboarding-stage" key={step}>
          {step === 1 && (
            <>
              <div className="onboarding-copy"><span className="auth-eyebrow">Poznajmy się</span><h1>Kim jest Twój pupil?</h1><p>Wybierz zwierzaka. Dopasujemy kolejne pytania i opiekę do jego potrzeb.</p></div>
              <div className="species-cards">
                {speciesCards.map((item) => {
                  const selected = item.value === "Królik"
                    ? !["Pies", "Kot"].includes(draft.species)
                    : draft.species === item.value;
                  return (
                    <button key={item.label} className={selected ? "species-card selected" : "species-card"} onClick={() => chooseSpecies(item.value)}>
                      <img src={item.image} alt={item.label} />
                      <span>{item.label}</span>
                      <i>{selected ? "✓" : ""}</i>
                    </button>
                  );
                })}
              </div>
              {!["Pies", "Kot"].includes(draft.species) && (
                <label className="onboarding-other-species"><span>Wybierz gatunek</span><select value={draft.species} onChange={(event) => chooseSpecies(event.target.value)}>{["Królik", "Gryzoń", "Ptak", "Gad", "Koń", "Ryba", "Inny"].map((item) => <option key={item}>{item}</option>)}</select></label>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="onboarding-copy"><span className="auth-eyebrow">Najważniejsza osoba</span><h1>Jak ma na imię?</h1><p>Dodaj zdjęcie — dzięki niemu profil od razu będzie naprawdę Wasz.</p></div>
              <div className="name-photo-grid">
                <label className={photoPreview ? "photo-drop has-photo" : "photo-drop"}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto} />
                  {photoPreview ? <img src={photoPreview} alt="Podgląd zdjęcia pupila" /> : <><span>{petEmoji(draft.species)}</span><strong>Dodaj zdjęcie</strong><small>JPG, PNG lub WEBP · do 8 MB</small></>}
                  {photoPreview && <b>Zmień zdjęcie</b>}
                </label>
                <label className="onboarding-name"><span>Imię pupila</span><input autoFocus value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="np. Figa" /><small>{draft.name.trim() ? `Miło Cię poznać, ${draft.name.trim()}!` : "Wpisz imię, aby przejść dalej"}</small></label>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="onboarding-copy"><span className="auth-eyebrow">Jeszcze chwila</span><h1>Opowiedz nam trochę o {draft.name || "pupilu"}</h1><p>Nie musisz znać wszystkich odpowiedzi. Brakujące dane uzupełnisz później.</p></div>
              <div className="onboarding-fields">
                <label><span>Rasa</span><input value={draft.breed} onChange={(event) => update("breed", event.target.value)} placeholder={draft.species === "Kot" ? "np. Europejski krótkowłosy" : "np. Beagle"} /></label>
                <label><span>Wiek lub data urodzenia</span><input value={draft.age} onChange={(event) => update("age", event.target.value)} placeholder="np. 2 lata" /></label>
                <label><span>Płeć</span><select value={draft.sex} onChange={(event) => update("sex", event.target.value)}><option>Nie wiem</option><option>Samica</option><option>Samiec</option></select></label>
                <label><span>Waga</span><input value={draft.weight} onChange={(event) => update("weight", event.target.value)} placeholder="np. 8,5 kg" /></label>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="onboarding-copy centered"><span className="auth-eyebrow">Gotowe</span><h1>Witaj w PupilCare, {draft.name}!</h1><p>Za chwilę otworzymy osobisty profil i pokażemy najważniejsze kolejne kroki.</p></div>
              <div className="pet-review-card">
                <span className="review-photo" style={{ background: "#dff6ff" }}>{photoPreview ? <img src={photoPreview} alt={draft.name} /> : petEmoji(draft.species)}</span>
                <div><strong>{draft.name}</strong><p>{draft.species}{draft.breed ? ` · ${draft.breed}` : ""}</p><small>{[draft.age, draft.sex !== "Nie wiem" ? draft.sex : "", draft.weight].filter(Boolean).join(" · ") || "Dane uzupełnisz później"}</small></div>
                <i>✓</i>
              </div>
              {error && <p className="data-error onboarding-error">{error}</p>}
            </>
          )}
        </div>

        <footer className="onboarding-actions">
          {step > 1 ? <button className="onboarding-back" onClick={() => setStep((current) => current - 1)}>← Wstecz</button> : <span />}
          {step < 4 ? <button className="primary-button" disabled={step === 2 && !draft.name.trim()} onClick={next}>Dalej <Icon name="arrow" /></button> : <button className="primary-button" disabled={pending} onClick={() => void finish()}>{pending ? "Tworzymy profil…" : "Otwórz PupilCare"} <Icon name="arrow" /></button>}
        </footer>
      </section>
    </main>
  );
}

function Profile({ pet }: { pet: Pet }) {
  const details = [
    ["Gatunek", pet.species],
    ["Rasa", pet.breed],
    ["Wiek", pet.age],
    ["Płeć", pet.sex],
    ["Waga", pet.weight],
    ["Weterynarz", pet.vet],
  ];
  return (
    <div className="page">
      <PageTitle eyebrow="Profil pupila" title={"Poznaj " + pet.name} description="Dane identyfikacyjne i najważniejsze informacje o pupilu." />
      <section className="profile-grid">
        <article className="profile-card card">
          <PetAvatar pet={pet} className="profile" />
          <span className="live-chip"><span /> Profil aktywny</span>
          <h2>{pet.name}</h2>
          <p>{pet.species} · {pet.breed}</p>
          <div className="profile-stats">
            <div><strong>{pet.healthScore}%</strong><span>Zdrowie</span></div>
            <div><strong>{pet.vaccines.length}</strong><span>Szczepienia</span></div>
            <div><strong>{pet.documents.length}</strong><span>Dokumenty</span></div>
          </div>
        </article>
        <article className="card detail-card">
          <div className="section-title"><div><span className="section-kicker">Dane podstawowe</span><h2>Informacje</h2></div><button>Edytuj</button></div>
          <div className="detail-list">
            {details.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
          </div>
        </article>
        <article className="card identity-card">
          <div className="card-icon yellow"><Icon name="paw" /></div>
          <div><span className="section-kicker">Identyfikacja</span><h2>Chip i paszport</h2></div>
          <div className="detail-list compact">
            <div><span>Numer chipa</span><strong>DEMO · brak numeru</strong></div>
            <div><span>Paszport UE</span><strong>DEMO · brak numeru</strong></div>
          </div>
        </article>
      </section>
    </div>
  );
}

function Health({ pet, onDocument }: { pet: Pet; onDocument: () => void }) {
  return (
    <div className="page">
      <PageTitle eyebrow="Zdrowie" title={"Zdrowie " + pet.name} description="Aktualne informacje, szczepienia i ważne zalecenia." />
      <section className="health-overview">
        <article className="card health-summary">
          <div className="score-ring large" style={{ "--score": pet.healthScore } as React.CSSProperties}>
            <div><strong>{pet.healthScore}</strong><span>/100</span></div>
          </div>
          <div><span className="live-chip"><span /> Profil w dobrej kondycji</span><h2>Dane są prawie kompletne</h2><p>Uzupełnij ostatnie wyniki badań, aby zwiększyć dokładność profilu.</p></div>
        </article>
        <HealthFact icon="heart" label="Alergie" value={pet.allergies} tone="mint" />
        <HealthFact icon="cross" label="Leki" value={pet.medications} tone="blue" />
        <HealthFact icon="shield" label="Choroby przewlekłe" value={pet.conditions} tone="yellow" />
      </section>
      <section className="card section-card vaccines-card">
        <div className="section-title"><div><span className="section-kicker">Historia</span><h2>Szczepienia</h2></div><button onClick={onDocument}>Dodaj wpis</button></div>
        <div className="table-list">
          {pet.vaccines.map((vaccine) => (
            <div className="table-row" key={vaccine.id}>
              <span className="action-icon yellow"><Icon name="shield" /></span>
              <div><strong>{vaccine.name}</strong><span>Podano {vaccine.date}</span></div>
              <div><span>Następny termin</span><strong>{vaccine.nextDate}</strong></div>
              <span className={vaccine.status === "soon" ? "warning-chip" : "success-chip"}>{vaccine.status === "soon" ? "Wkrótce" : "Aktualne"}</span>
            </div>
          ))}
          {!pet.vaccines.length && <EmptyState icon="shield" title="Brak zapisanych szczepień" action="Dodaj dokument" onAction={onDocument} />}
        </div>
      </section>
    </div>
  );
}

function CalendarView({ pet, onAdd }: { pet: Pet; onAdd: () => void }) {
  const visits = [...pet.visits].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="page">
      <PageTitle eyebrow="Wizyty i przypomnienia" title={"Plan " + pet.name} description="Wszystkie terminy opieki w jednym miejscu." action="Dodaj wizytę" onAction={onAdd} />
      <section className="calendar-layout">
        <article className="mini-calendar card">
          <div className="section-title"><div><span className="section-kicker">Wrzesień</span><h2>2026</h2></div><div className="calendar-arrows">‹  ›</div></div>
          <div className="weekdays">{["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="days">{Array.from({ length: 35 }).map((_, index) => {
            const day = index - 1;
            const active = day === 12 || day === 28;
            return <span key={index} className={active ? "has-event" : day < 1 || day > 30 ? "muted" : ""}>{day < 1 || day > 30 ? "" : day}</span>;
          })}</div>
        </article>
        <article className="card section-card">
          <div className="section-title"><div><span className="section-kicker">Nadchodzące</span><h2>Wizyty</h2></div></div>
          <div className="timeline">
            {visits.map((visit) => (
              <div className="timeline-item" key={visit.id}>
                <span className="timeline-dot" />
                <div className="timeline-date">{formatDate(visit.date)} · {visit.time || "bez godziny"}</div>
                <div className="timeline-card">
                  <span>{visit.type}</span><h3>{visit.title}</h3><p><Icon name="pin" /> {visit.place || "Miejsce do ustalenia"}</p>
                </div>
              </div>
            ))}
            {!visits.length && <EmptyState icon="calendar" title="Brak zaplanowanych wizyt" action="Dodaj pierwszą" onAction={onAdd} />}
          </div>
        </article>
      </section>
    </div>
  );
}

function Documents({ pet, onAdd }: { pet: Pet; onAdd: () => void }) {
  return (
    <div className="page">
      <PageTitle eyebrow="Dokumenty" title={"Dokumenty " + pet.name} description="Książeczka zdrowia, wyniki badań i polisy zawsze pod ręką." action="Dodaj dokument" onAction={onAdd} />
      <section className="document-grid">
        {pet.documents.map((document, index) => (
          <article className="document-card card" key={document.id}>
            <div className={"document-preview preview-" + ((index % 3) + 1)}><Icon name="file" /><span>PDF</span></div>
            <div className="document-body"><span>{document.kind}</span><h3>{document.name}</h3><p>Dodano {document.date}</p></div>
            <button aria-label={"Otwórz " + document.name}><Icon name="arrow" /></button>
          </article>
        ))}
        <button className="add-document-card" onClick={onAdd}><span><Icon name="plus" /></span><strong>Dodaj nowy dokument</strong><p>PDF, JPG lub PNG</p></button>
      </section>
    </div>
  );
}

function AiAssistant({
  pet,
  messages,
  input,
  setInput,
  onAsk,
  onVet,
  onPremium,
  remaining,
  isPremium,
}: {
  pet: Pet;
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  onAsk: (value?: string) => void;
  onVet: () => void;
  onPremium: () => void;
  remaining: number;
  isPremium: boolean;
}) {
  return (
    <div className="page ai-page">
      <PageTitle eyebrow="AI Asystent" title={"Zapytaj o " + pet.name} description="Odpowiedzi uwzględniają profil i historię zdrowia pupila." />
      <section className="ai-layout">
        <article className="chat-card card">
          <div className="chat-header">
            <span className="ai-avatar"><Icon name="spark" /></span>
            <div><strong>PupilCare AI</strong><span><i /> Online · zna profil {pet.name}</span></div>
            <span className="beta-chip">{isPremium ? "PREMIUM" : remaining + "/" + FREE_AI_LIMIT}</span>
          </div>
          {!isPremium && (
            <div className="ai-allowance">
              <span><Icon name="spark" /> Bezpłatne pytania</span>
              <div><i style={{ width: ((remaining / FREE_AI_LIMIT) * 100) + "%" }} /></div>
              <strong>Pozostało {remaining}</strong>
            </div>
          )}
          <div className="chat-messages">
            {messages.map((message) => (
              <div key={message.id} className={"message " + message.role}>
                {message.role === "assistant" && <span className="message-avatar"><Icon name="spark" /></span>}
                <div className="message-copy">
                  <p>{message.text}</p>
                  {message.cta === "vet24" && (
                    <button className="message-cta urgent" onClick={onVet}>Przejdź do Vet 24/7 <Icon name="arrow" /></button>
                  )}
                  {message.cta === "premium" && !isPremium && (
                    <button className="message-cta" onClick={onPremium}>Poznaj Premium <Icon name="arrow" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="prompt-row">
            {quickPrompts.map((prompt) => {
              const label = prompt.replace("Bruno", pet.name);
              return <button key={prompt} onClick={() => onAsk(label)}>{label}</button>;
            })}
          </div>
          <form className="chat-input" onSubmit={(event) => { event.preventDefault(); onAsk(); }}>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={"Napisz, co dzieje się z " + pet.name + "..."} />
            <button aria-label="Wyślij" type="submit"><Icon name="send" /></button>
          </form>
          <p className="ai-disclaimer">AI nie zastępuje diagnozy weterynaryjnej. W nagłych przypadkach skontaktuj się z kliniką.</p>
        </article>
        <aside className="ai-side">
          <article className="context-card card">
            <PetAvatar pet={pet} className="medium" />
            <span className="section-kicker">Kontekst rozmowy</span><h3>{pet.name}</h3>
            <div><span>Wiek</span><strong>{pet.age}</strong></div>
            <div><span>Waga</span><strong>{pet.weight}</strong></div>
            <div><span>Alergie</span><strong>{pet.allergies}</strong></div>
          </article>
          <article className="vet-urgent">
            <span className="card-icon coral"><Icon name="cross" /></span>
            <h3>Potrzebujesz lekarza?</h3><p>Wyślij zgłoszenie do Vet24 i opisz objawy.</p>
            <button onClick={onVet}>Przejdź do Vet24 <Icon name="arrow" /></button>
          </article>
        </aside>
      </section>
    </div>
  );
}

function Vet24({
  pet,
  isPremium,
  onFinish,
  onHistory,
}: {
  pet: Pet;
  isPremium: boolean;
  onFinish: (summary: string) => void;
  onHistory: () => void;
}) {
  const [step, setStep] = useState<"intro" | "intake" | "payment" | "waiting" | "call" | "summary">("intro");
  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("");
  const [summarySaved, setSummarySaved] = useState(false);
  const price = isPremium ? "49,99 zł" : "89,99 zł";

  const saveSummary = () => {
    if (!summarySaved) {
      onFinish("Zalecenia po konsultacji online zapisane w PupilCare");
      setSummarySaved(true);
    }
    setStep("summary");
  };

  return (
    <div className="page vet24-page">
      <PageTitle
        eyebrow="Własny lekarz PupilCare"
        title="Vet 24/7"
        description={"Pomoc online dla " + pet.name + " — od krótkiego wywiadu do rozmowy wideo."}
      />

      <div className="vet24-status-line">
        {["Wywiad", "Potwierdzenie", "Lekarz", "Podsumowanie"].map((label, index) => {
          const activeIndex = step === "intro" || step === "intake" ? 0 : step === "payment" ? 1 : step === "waiting" || step === "call" ? 2 : 3;
          return <span key={label} className={index <= activeIndex ? "active" : ""}><i>{index + 1}</i>{label}</span>;
        })}
      </div>

      {step === "intro" && (
        <section className="vet24-intro-grid">
          <article className="vet24-intro-main card">
            <span className="online-chip"><i /> Lekarz PupilCare dostępny</span>
            <div className="vet24-doctor-visual"><span>👩‍⚕️</span><i>{pet.emoji}</i></div>
            <h2>Połączymy Cię z weterynarzem</h2>
            <p>Najpierw zbierzemy najważniejsze informacje. Lekarz zobaczy profil {pet.name}, opis objawów i dokumenty jeszcze przed rozmową.</p>
            <button className="primary-button" onClick={() => setStep("intake")}>Rozpocznij konsultację <Icon name="arrow" /></button>
          </article>
          <aside className="vet24-price-card card">
            <span className="section-kicker">Twoja konsultacja</span>
            <h3>{price}</h3>
            <p>{isPremium ? "Cena dla użytkowników Premium." : "Bez abonamentu i ukrytych opłat."}</p>
            <div><Icon name="clock" /><span><strong>około 10–15 min</strong><small>czas rozmowy wideo</small></span></div>
            <div><Icon name="file" /><span><strong>Podsumowanie wizyty</strong><small>zapisane w historii pupila</small></span></div>
            <div><Icon name="shield" /><span><strong>Bez powtarzania danych</strong><small>lekarz dostaje gotowy wywiad</small></span></div>
          </aside>
        </section>
      )}

      {step === "intake" && (
        <section className="vet24-flow-card card">
          <span className="section-kicker">Krótki wywiad · około 60 sekund</span>
          <h2>Co dzieje się z {pet.name}?</h2>
          <label className="flow-field"><span>Opisz objawy</span><textarea value={symptoms} onChange={(event) => setSymptoms(event.target.value)} placeholder="Co zauważyłeś? Jak zmieniło się zachowanie pupila?" /></label>
          <label className="flow-field"><span>Jak długo to trwa?</span><input value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="np. od rana, od dwóch dni" /></label>
          <div className="intake-profile">
            <PetAvatar pet={pet} className="small" />
            <div><strong>{pet.name}</strong><small>{pet.species} · {pet.age} · {pet.weight}</small></div>
            <em>Profil dołączony</em>
          </div>
          <div className="flow-actions"><button className="secondary-button" onClick={() => setStep("intro")}>Wstecz</button><button className="primary-button" disabled={!symptoms.trim()} onClick={() => setStep("payment")}>Dalej <Icon name="arrow" /></button></div>
        </section>
      )}

      {step === "payment" && (
        <section className="vet24-flow-card payment-confirm card">
          <span className="card-icon mint"><Icon name="shield" /></span>
          <span className="section-kicker">Potwierdzenie przed połączeniem</span>
          <h2>Konsultacja Vet 24/7 · {price}</h2>
          <p>{isPremium ? "Uwzględniliśmy cenę Premium. Płatność będzie obsługiwana bezpiecznie online." : "To pełna cena konsultacji bez obowiązkowej subskrypcji."}</p>
          <div className="doctor-brief">
            <span>{pet.emoji}</span><div><small>Informacja dla lekarza</small><strong>{symptoms}</strong><em>{duration || "Czas trwania niepodany"}</em></div>
          </div>
          <label className="consent-row"><input type="checkbox" defaultChecked /><span>Zgadzam się na przekazanie lekarzowi danych profilu i opisu objawów.</span></label>
          <div className="flow-actions"><button className="secondary-button" onClick={() => setStep("intake")}>Wstecz</button><button className="primary-button" onClick={() => setStep("waiting")}>Przejdź do płatności · {price} <Icon name="arrow" /></button></div>
        </section>
      )}

      {step === "waiting" && (
        <section className="vet24-flow-card waiting-card card">
          <span className="waiting-pulse"><Icon name="cross" /></span>
          <span className="online-chip"><i /> Lekarz zaakceptował zgłoszenie</span>
          <h2>lek. wet. Anna Kowalska jest gotowa</h2>
          <p>Lekarz otrzymał profil {pet.name} i opis: „{symptoms}”. Możesz rozpocząć bezpieczną rozmowę wideo.</p>
          <button className="primary-button" onClick={() => setStep("call")}>Rozpocznij rozmowę wideo <Icon name="arrow" /></button>
        </section>
      )}

      {step === "call" && (
        <section className="video-consultation">
          <div className="doctor-video"><span>👩‍⚕️</span><div><strong>lek. wet. Anna Kowalska</strong><small>Weterynarz PupilCare · połączono</small></div></div>
          <div className="pet-video" style={{ background: pet.color }}>{pet.photoUrl ? <img src={pet.photoUrl} alt={pet.name} /> : <span>{pet.emoji}</span>}<small>Ty i {pet.name}</small></div>
          <div className="video-controls"><button>🎙️</button><button>📹</button><button className="hangup" onClick={saveSummary}>Zakończ rozmowę</button></div>
        </section>
      )}

      {step === "summary" && (
        <section className="vet24-flow-card summary-card card">
          <span className="summary-check">✓</span>
          <span className="section-kicker">Konsultacja zakończona</span>
          <h2>Zalecenia zapisane w profilu {pet.name}</h2>
          <div className="consultation-summary">
            <div><span>Powód konsultacji</span><strong>{symptoms}</strong></div>
            <div><span>Zalecenie demonstracyjne</span><strong>Obserwuj samopoczucie i umów badanie stacjonarne, jeżeli objawy nie ustąpią lub się nasilą.</strong></div>
          </div>
          <button className="primary-button" onClick={onHistory}>Zobacz historię wizyt <Icon name="arrow" /></button>
        </section>
      )}
    </div>
  );
}

function Services({ pet, onVet24 }: { pet: Pet; onVet24: () => void }) {
  const services = [
    { icon: "cross" as IconName, title: "Weterynarz 24/7", text: "Własny lekarz PupilCare, krótki wywiad i konsultacja wideo.", tone: "coral", tag: "Dostępny", action: "vet24" },
    { icon: "calendar" as IconName, title: "Wizyta w klinice", text: "Sprawdź terminy weterynarzy w Gdańsku przez WetTermin.", tone: "blue", tag: "WetTermin", action: "wettermin" },
    { icon: "spark" as IconName, title: "Groomer", text: "Znajdź salon, porównaj terminy i umów pielęgnację.", tone: "purple", tag: "Wkrótce" },
    { icon: "shop" as IconName, title: "Sklep dla pupila", text: "Karma, akcesoria i produkty dobrane do profilu pupila.", tone: "yellow", tag: "Wkrótce" },
    { icon: "paw" as IconName, title: "Opiekun i hotel", text: "Sprawdzona opieka podczas wyjazdu lub długiego dnia.", tone: "mint", tag: "Wkrótce" },
  ];
  return (
    <div className="page">
      <PageTitle eyebrow="Specjaliści" title={"Opieka dla " + pet.name} description="Jedno miejsce do znalezienia pomocy i umówienia usługi." />
      <section className="service-grid">
        {services.map((service) => (
          <article className="service-card card" key={service.title}>
            <div className={"service-visual " + service.tone}><Icon name={service.icon} /><span>{service.tag}</span></div>
            <h2>{service.title}</h2><p>{service.text}</p>
            {service.action === "vet24" ? (
              <button onClick={onVet24}>Rozpocznij konsultację <Icon name="arrow" /></button>
            ) : service.action === "wettermin" ? (
              <a href="https://www.wettermin.pl/miasto/gdansk" target="_blank" rel="noreferrer">Sprawdź wolne terminy <Icon name="arrow" /></a>
            ) : (
              <button>Powiadom mnie <Icon name="arrow" /></button>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}

function PageTitle({
  eyebrow,
  title,
  description,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="page-heading">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
      {action && <button className="primary-button" onClick={onAction}><Icon name="plus" /> {action}</button>}
    </div>
  );
}

function PetAvatar({ pet, className = "" }: { pet: Pet; className?: string }) {
  return (
    <span className={`pet-avatar ${className}`.trim()} style={{ background: pet.color }}>
      {pet.photoUrl ? <img src={pet.photoUrl} alt={pet.name} /> : pet.emoji}
    </span>
  );
}

function HealthFact({ icon, label, value, tone }: { icon: IconName; label: string; value: string; tone: string }) {
  return <article className="card health-fact"><span className={"action-icon " + tone}><Icon name={icon} /></span><span>{label}</span><strong>{value}</strong></article>;
}

function EmptyState({ icon, title, action, onAction }: { icon: IconName; title: string; action: string; onAction: () => void }) {
  return <div className="empty-state"><span><Icon name={icon} /></span><strong>{title}</strong><button onClick={onAction}>{action}</button></div>;
}

function ModalShell({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-card">
        <div className="modal-header"><div><span className="section-kicker">PupilCare</span><h2>{title}</h2><p>{subtitle}</p></div><button aria-label="Zamknij" onClick={onClose}><Icon name="close" /></button></div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, name, placeholder, type = "text", required = false, full = false }: { label: string; name: string; placeholder?: string; type?: string; required?: boolean; full?: boolean }) {
  return <label className={full ? "field full" : "field"}><span>{label}</span><input name={name} type={type} placeholder={placeholder} required={required} /></label>;
}

function SelectField({ label, name, options, full = false }: { label: string; name: string; options: string[]; full?: boolean }) {
  return <label className={full ? "field full" : "field"}><span>{label}</span><select name={name}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5" /><path d="M9.5 20v-5h5v5" /></>,
    paw: <><path d="M12 13c-3.2 0-5.8 2.2-5.8 4.7 0 1.6 1.2 2.8 2.9 2.8 1.1 0 1.9-.5 2.9-.5s1.8.5 2.9.5c1.7 0 2.9-1.2 2.9-2.8C17.8 15.2 15.2 13 12 13Z" /><path d="M6.3 11c1.1-.3 1.6-1.8 1.2-3.3C7.1 6.2 5.9 5.2 4.8 5.5S3.2 7.3 3.6 8.8 5.2 11.3 6.3 11Z" /><path d="M17.7 11c-1.1-.3-1.6-1.8-1.2-3.3.4-1.5 1.6-2.5 2.7-2.2s1.6 1.8 1.2 3.3-1.6 2.5-2.7 2.2Z" /><path d="M10.3 9.3c1.1-.2 1.8-1.7 1.5-3.2-.3-1.6-1.4-2.7-2.5-2.5S7.5 5.3 7.8 6.9s1.4 2.6 2.5 2.4Z" /><path d="M13.7 9.3c-1.1-.2-1.8-1.7-1.5-3.2.3-1.6 1.4-2.7 2.5-2.5s1.8 1.7 1.5 3.3-1.4 2.6-2.5 2.4Z" /></>,
    heart: <path d="M20.8 5.7a5.5 5.5 0 0 0-7.8 0L12 6.8l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    file: <><path d="M6 2h8l4 4v16H6z" /><path d="M14 2v5h5M9 13h6M9 17h6" /></>,
    spark: <><path d="m12 3 1.3 4.2L17.5 8.5l-4.2 1.3L12 14l-1.3-4.2-4.2-1.3 4.2-1.3L12 3Z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /><path d="m5 13 .8 2.2L8 16l-2.2.8L5 19l-.8-2.2L2 16l2.2-.8L5 13Z" /></>,
    cross: <><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" /><path d="M10 21h4" /></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    shield: <><path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z" /><path d="m9 12 2 2 4-5" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4 20-7Z" /><path d="m22 2-11 11" /></>,
    shop: <><path d="M5 9h14l-1 12H6L5 9Z" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M3 9h18" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
