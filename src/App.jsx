import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import {
  BookOpen,
  Check,
  Plus,
  X,
  Bell,
  Search,
  Pencil,
  Download,
  Upload,
  AlertTriangle,
} from "lucide-react";

const storage = {
  set: async (key, value) => {
    localStorage.setItem(key, value);
  },
  get: async (key) => {
    const value = localStorage.getItem(key);
    return value ? { value } : null;
  },
  delete: async (key) => {
    localStorage.removeItem(key);
  },
  list: async (prefix) => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(prefix)) keys.push(key);
    }
    return { keys };
  },
};

if (typeof window !== "undefined" && !window.storage) {
  window.storage = storage;
}

const DAY_IN_MS = 1000 * 60 * 60 * 24;

const normalizeDate = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const todayISO = () => new Date().toISOString().split("T")[0];

// Bare-bones pace math: pages remaining / days until the deadline (calendar days).
// If the deadline is today or in the past, all remaining pages are "today's target."
const dailyTarget = (book) => {
  const remaining = Math.max(0, book.totalPages - book.pagesRead);
  if (remaining === 0) return 0;
  const today = normalizeDate(new Date());
  const target = normalizeDate(book.targetDate);
  const daysLeft = Math.max(1, Math.round((target - today) / DAY_IN_MS));
  return Math.ceil(remaining / daysLeft);
};

const daysUntil = (date) => {
  const today = normalizeDate(new Date());
  const t = normalizeDate(date);
  return Math.round((t - today) / DAY_IN_MS);
};

const NOTIFICATION_PREF_KEY = "finishby:notifications";
const NOTIFICATION_HOUR = 19; // 7 PM evening reminder

export default function FinishBy() {
  const [books, setBooks] = useState([]);
  const [showAddBook, setShowAddBook] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [importMessage, setImportMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(NOTIFICATION_PREF_KEY) === "true";
  });
  const [isUnfolded, setIsUnfolded] = useState(false);
  const reminderTimerRef = useRef(null);

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    if (isUnfolded) return;
    const handleKey = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsUnfolded(true);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isUnfolded]);

  // Daily-reminder scheduling. Only fires while a tab is open; if the tab is
  // closed we rely on the next visit to re-schedule. Honest tradeoff for a
  // backend-less app — documented in the toggle's helper text.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (reminderTimerRef.current) {
      clearTimeout(reminderTimerRef.current);
      reminderTimerRef.current = null;
    }
    if (!notifications) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    const scheduleNext = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(NOTIFICATION_HOUR, 0, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      const delay = next.getTime() - now.getTime();
      reminderTimerRef.current = setTimeout(() => {
        const active = books.find((b) => b.pagesRead < b.totalPages);
        if (active) {
          const target = dailyTarget(active);
          new Notification("Time to read", {
            body: target > 0
              ? `${target} pages of ${active.title} today`
              : `Pick up ${active.title}`,
            icon: "/icon-192.png",
          });
        }
        scheduleNext();
      }, delay);
    };

    scheduleNext();
    return () => {
      if (reminderTimerRef.current) {
        clearTimeout(reminderTimerRef.current);
        reminderTimerRef.current = null;
      }
    };
  }, [notifications, books]);

  const handleNotificationsToggle = async () => {
    if (notifications) {
      setNotifications(false);
      localStorage.setItem(NOTIFICATION_PREF_KEY, "false");
      return;
    }
    if (typeof Notification === "undefined") {
      alert("This browser doesn't support notifications.");
      return;
    }
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      alert(
        "Notifications were blocked. Enable them in your browser settings to get daily reminders.",
      );
      return;
    }
    setNotifications(true);
    localStorage.setItem(NOTIFICATION_PREF_KEY, "true");
    new Notification("Reminders on", {
      body: "We'll nudge you each evening to keep reading.",
      icon: "/icon-192.png",
    });
  };

  const sendTestNotification = () => {
    if (typeof Notification === "undefined") {
      alert("This browser doesn't support notifications.");
      return;
    }
    if (Notification.permission !== "granted") {
      alert("Turn on Daily reminders first to grant permission.");
      return;
    }
    const active = books.find((b) => b.pagesRead < b.totalPages);
    const target = active ? dailyTarget(active) : 0;
    new Notification("Time to read", {
      body: active
        ? target > 0
          ? `${target} pages of ${active.title} today`
          : `Pick up ${active.title}`
        : "Add a book to start tracking",
      icon: "/icon-192.png",
    });
  };

  const loadBooks = async () => {
    try {
      const keys = await window.storage.list("book:");
      if (keys && keys.keys) {
        const bookPromises = keys.keys.map(async (key) => {
          const result = await window.storage.get(key);
          return result ? JSON.parse(result.value) : null;
        });
        const loadedBooks = (await Promise.all(bookPromises)).filter(Boolean);
        setBooks(loadedBooks);
      }
    } catch (error) {
      console.error("Failed to load books:", error);
    } finally {
      setLoading(false);
    }
  };

  const addBook = async (bookData) => {
    try {
      const today = todayISO();
      const totalPagesValue = bookData.totalPages || 0;
      const sanitizedPagesRead = Math.min(
        Math.max(bookData.pagesRead || 0, 0),
        totalPagesValue,
      );

      const book = {
        id: Date.now().toString(),
        title: bookData.title,
        totalPages: totalPagesValue,
        pagesRead: sanitizedPagesRead,
        targetDate: bookData.targetDate,
        startDate: today,
        lastRead: today,
        readingSessions: [],
        completedAt:
          sanitizedPagesRead >= totalPagesValue ? today : undefined,
      };

      await window.storage.set(`book:${book.id}`, JSON.stringify(book));
      setBooks([...books, book]);
      setShowAddBook(false);
    } catch (error) {
      console.error("Failed to save book:", error);
      alert("Failed to save book. Please try again.");
    }
  };

  const editBook = async (bookId, updates) => {
    const totalPages = Math.max(1, updates.totalPages || 0);
    const pagesRead = Math.min(Math.max(updates.pagesRead || 0, 0), totalPages);
    const updatedBooks = books.map((b) =>
      b.id === bookId
        ? {
            ...b,
            title: updates.title,
            totalPages,
            pagesRead,
            targetDate: updates.targetDate,
            completedAt:
              pagesRead >= totalPages
                ? b.completedAt || todayISO()
                : undefined,
          }
        : b,
    );
    setBooks(updatedBooks);
    const updated = updatedBooks.find((b) => b.id === bookId);
    try {
      await window.storage.set(`book:${bookId}`, JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to save book:", error);
    }
    setEditingBook(null);
  };

  const exportBooks = () => {
    const data = JSON.stringify({ version: 1, books }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finishby-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importBooks = async (file) => {
    setImportMessage("");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const incoming = Array.isArray(parsed) ? parsed : parsed?.books;
      if (!Array.isArray(incoming)) {
        throw new Error("File doesn't look like a Finish By export.");
      }
      const valid = incoming.filter(
        (b) =>
          b &&
          typeof b.id === "string" &&
          typeof b.title === "string" &&
          typeof b.totalPages === "number" &&
          typeof b.pagesRead === "number" &&
          typeof b.targetDate === "string",
      );
      if (valid.length === 0) {
        throw new Error("No valid books found in that file.");
      }
      const existingIds = new Set(books.map((b) => b.id));
      const merged = [...books];
      let added = 0;
      for (const book of valid) {
        if (existingIds.has(book.id)) continue;
        merged.push(book);
        await window.storage.set(`book:${book.id}`, JSON.stringify(book));
        added += 1;
      }
      setBooks(merged);
      setImportMessage(
        added === 0
          ? "Nothing new to import — those books are already here."
          : `Imported ${added} book${added === 1 ? "" : "s"}.`,
      );
      setTimeout(() => setImportMessage(""), 4000);
    } catch (error) {
      console.error("Import failed:", error);
      setImportMessage(`Import failed: ${error.message}`);
      setTimeout(() => setImportMessage(""), 5000);
    }
  };

  const updateProgress = async (bookId, newPagesRead) => {
    const updatedBooks = books.map((book) => {
      if (book.id !== bookId) return book;
      const today = todayISO();
      const clamped = Math.min(
        Math.max(newPagesRead, 0),
        book.totalPages,
      );
      const session = {
        date: today,
        pagesRead: clamped - book.pagesRead,
        endingPage: clamped,
      };
      return {
        ...book,
        pagesRead: clamped,
        lastRead: today,
        readingSessions: [...(book.readingSessions || []), session],
        completedAt:
          clamped >= book.totalPages ? today : book.completedAt,
      };
    });

    setBooks(updatedBooks);
    const book = updatedBooks.find((b) => b.id === bookId);
    try {
      await window.storage.set(`book:${bookId}`, JSON.stringify(book));
    } catch (error) {
      console.error("Failed to update book:", error);
    }
  };

  const deleteBook = async (bookId) => {
    try {
      await window.storage.delete(`book:${bookId}`);
      setBooks(books.filter((b) => b.id !== bookId));
    } catch (error) {
      console.error("Failed to delete book:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-stone-100">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600&family=Work+Sans:wght@400;500;600&display=swap');

        * {
          font-family: 'Work Sans', sans-serif;
        }

        .serif {
          font-family: 'Crimson Pro', serif;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        @keyframes paperBallFloat {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.04) rotate(1.5deg); }
        }

        @keyframes splashRise {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in-up { animation: fadeInUp 0.6s ease-out; }
        .animate-slide-in { animation: slideIn 0.4s ease-out; }
        .animate-pulse-slow { animation: pulse 2s ease-in-out infinite; }

        .paper-ball-float { animation: paperBallFloat 5s ease-in-out infinite; }
        .splash-rise { animation: splashRise 0.8s 0.3s ease-out both; }

        .splash-overlay {
          transition: opacity 900ms ease, transform 900ms ease, filter 900ms ease;
        }

        .paper-ball-button {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .paper-ball-button:hover { transform: scale(1.04); }
        .paper-ball-button:active { transform: scale(0.96); }

        .book-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .book-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
        }

        .progress-bar {
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      {/* Paper-ball splash overlay */}
      <div
        className={`splash-overlay fixed inset-0 z-50 flex flex-col items-center justify-center px-6 bg-gradient-to-br from-stone-100 via-stone-50 to-stone-200 ${
          isUnfolded
            ? "opacity-0 scale-110 pointer-events-none"
            : "opacity-100"
        }`}
        style={{ filter: isUnfolded ? "blur(8px)" : "blur(0px)" }}
        onClick={() => setIsUnfolded(true)}
        role="button"
        tabIndex={isUnfolded ? -1 : 0}
        aria-label="Reveal Finish By"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsUnfolded(true);
          }}
          className="paper-ball-button group relative cursor-pointer focus:outline-none"
          aria-label="Unfold paper to reveal Finish By"
        >
          <div className="paper-ball-float relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full drop-shadow-[0_20px_40px_rgba(15,23,42,0.12)]"
            >
              <defs>
                <filter id="paper-crumple" x="-20%" y="-20%" width="140%" height="140%">
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.04"
                    numOctaves="5"
                    result="noise"
                  />
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="40" />
                </filter>
              </defs>
              <path
                d="M100,20 C130,20 180,60 180,100 C180,140 140,180 100,180 C60,180 20,140 20,100 C20,60 70,20 100,20"
                fill="#FFFFFF"
                filter="url(#paper-crumple)"
              />
              <path
                d="M100,40 C140,40 160,80 160,100 C160,120 120,160 100,160 C80,160 40,120 40,100 C40,80 60,40 100,40"
                fill="none"
                stroke="rgba(15,23,42,0.35)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                filter="url(#paper-crumple)"
              />
              <path
                d="M80,80 Q100,60 120,80 T120,120 Q100,140 80,120 T80,80"
                fill="none"
                stroke="rgba(15,23,42,0.2)"
                strokeWidth="1"
                filter="url(#paper-crumple)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-slate-700/60 font-medium tracking-[0.3em] text-[10px] uppercase group-hover:text-slate-800 transition-colors">
                Unfold
              </span>
            </div>
          </div>
        </button>

        <div className="splash-rise mt-12 text-center max-w-md">
          <h1 className="text-6xl md:text-7xl serif font-light tracking-tight text-slate-800 mb-4">
            Finish By
          </h1>
          <p className="text-slate-500 text-base md:text-lg mb-6 font-light">
            For people who buy books but don&apos;t finish them
          </p>
          <p className="text-slate-400 font-medium tracking-[0.3em] text-[10px] uppercase">
            Tap the paper to begin
          </p>
        </div>
      </div>

      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-slate-600">Loading...</div>
        </div>
      ) : (
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-16 text-center animate-fade-in-up">
          <div className="flex justify-center items-center gap-3 mb-3">
            <h1 className="text-6xl serif font-light text-slate-800">
              Finish By
            </h1>
          </div>
          <p className="text-slate-500 text-lg mb-4">
            For people who buy books but don&apos;t finish them
          </p>

          {/* Notification Toggle */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-200">
            <Bell
              className={`w-4 h-4 ${notifications ? "text-slate-800" : "text-slate-400"}`}
            />
            <span className="text-sm text-slate-600">Daily reminders</span>
            <button
              onClick={handleNotificationsToggle}
              className={`w-10 h-6 rounded-full transition-colors ${
                notifications ? "bg-slate-800" : "bg-slate-300"
              }`}
              aria-label="Toggle daily reminders"
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  notifications ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
            {notifications && (
              <button
                onClick={sendTestNotification}
                className="text-xs text-slate-500 hover:text-slate-800 underline ml-1"
              >
                Send test
              </button>
            )}
          </div>

          {/* Data tools: export / import JSON */}
          <div className="mt-4 flex justify-center items-center gap-2 text-xs">
            <button
              onClick={exportBooks}
              disabled={books.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <span className="text-slate-300">·</span>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-800 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              Import
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importBooks(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {importMessage && (
            <p className="mt-2 text-xs text-slate-500">{importMessage}</p>
          )}
        </header>

        {/* Empty State */}
        {books.length === 0 && !showAddBook && (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="w-20 h-20 bg-slate-200 rounded-full mx-auto mb-6 flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-2xl serif text-slate-700 mb-3">No books yet</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Start your reading journey. We&apos;ll help you finish what you
              start—no guilt, no pressure.
            </p>
            <button
              onClick={() => setShowAddBook(true)}
              className="px-8 py-3 bg-slate-800 text-white rounded-full hover:bg-slate-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add your first book
            </button>
          </div>
        )}

        {/* Books Grid */}
        {books.length > 0 && (
          <>
            <div className="mb-8 flex justify-between items-center">
              <h2 className="text-2xl serif text-slate-700">
                Your Reading Journey
              </h2>
              <button
                onClick={() => setShowAddBook(true)}
                className="px-6 py-2 bg-slate-800 text-white rounded-full hover:bg-slate-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Book
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {books.map((book, index) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onUpdate={updateProgress}
                  onDelete={deleteBook}
                  onEdit={setEditingBook}
                  delay={index * 0.1}
                />
              ))}
            </div>
          </>
        )}

        {/* Add Book Modal */}
        {showAddBook && (
          <AddBookForm onAdd={addBook} onCancel={() => setShowAddBook(false)} />
        )}

        {/* Edit Book Modal */}
        {editingBook && (
          <AddBookForm
            existingBook={editingBook}
            onAdd={(updates) => editBook(editingBook.id, updates)}
            onCancel={() => setEditingBook(null)}
          />
        )}
      </div>
      )}
    </div>
  );
}

function BookCard({ book, onUpdate, onDelete, onEdit, delay }) {
  const [isEditing, setIsEditing] = useState(false);
  const [endingPageInput, setEndingPageInput] = useState(String(book.pagesRead));

  useEffect(() => {
    setEndingPageInput(String(book.pagesRead));
  }, [book.pagesRead]);

  const isComplete = book.pagesRead >= book.totalPages;
  const progress = (book.pagesRead / book.totalPages) * 100;
  const target = dailyTarget(book);
  const daysLeft = daysUntil(book.targetDate);
  const isPastDeadline = !isComplete && daysLeft < 0;

  const sanitizePageInput = (value) => {
    if (value === "") {
      setEndingPageInput("");
      return;
    }
    const cleaned = value.replace(/^0+(?=\d)/, "");
    const parsed = parseInt(cleaned, 10);
    if (Number.isNaN(parsed)) return;
    const limited = Math.min(Math.max(parsed, 0), book.totalPages);
    setEndingPageInput(String(limited));
  };

  const resolveEndingPage = () => {
    if (endingPageInput === "") return book.pagesRead;
    const parsed = parseInt(endingPageInput, 10);
    if (Number.isNaN(parsed)) return book.pagesRead;
    return Math.min(Math.max(parsed, 0), book.totalPages);
  };

  const handleSaveProgress = () => {
    onUpdate(book.id, resolveEndingPage());
    setIsEditing(false);
  };

  return (
    <div
      className="book-card bg-white rounded-2xl p-6 shadow-sm border border-slate-200 animate-slide-in"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex justify-between items-start mb-5">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl serif font-semibold text-slate-800 truncate">
            {book.title}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {book.pagesRead} of {book.totalPages} pages
          </p>
        </div>
        <div className="flex items-center gap-1 ml-3">
          <button
            onClick={() => onEdit(book)}
            className="p-1 text-slate-300 hover:text-slate-600 transition-colors"
            aria-label="Edit book"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(book.id)}
            className="p-1 text-slate-300 hover:text-slate-600 transition-colors"
            aria-label="Delete book"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isComplete ? (
        <div className="text-center py-6">
          <p className="text-2xl serif font-semibold text-slate-800 mb-1">
            You finished.
          </p>
          <p className="text-sm text-slate-500">Nice work.</p>
        </div>
      ) : isPastDeadline ? (
        <div className="text-center py-4">
          <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
          <p className="text-base serif font-semibold text-slate-800 mb-1">
            Deadline passed
          </p>
          <p className="text-xs text-slate-500 mb-4">
            {Math.abs(daysLeft)} day{Math.abs(daysLeft) === 1 ? "" : "s"} ago ·{" "}
            {book.totalPages - book.pagesRead} pages still to go
          </p>
          <button
            onClick={() => onEdit(book)}
            className="px-5 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
          >
            Extend deadline
          </button>
        </div>
      ) : (
        <>
          <div className="text-center mb-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">
              Today
            </p>
            <p className="serif text-5xl font-light text-slate-800 leading-none">
              {target}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              pages to finish by{" "}
              {new Date(book.targetDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
              {daysLeft > 0 && ` · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
            </p>
          </div>

          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-5">
            <div
              className="progress-bar h-full bg-slate-800 rounded-full"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          {isEditing ? (
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={endingPageInput}
                onChange={(e) => sanitizePageInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveProgress()}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="What page did you end on?"
                aria-label="Ending page"
                autoFocus
              />
              <button
                onClick={handleSaveProgress}
                className="px-5 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setEndingPageInput(String(book.pagesRead));
                setIsEditing(true);
              }}
              className="w-full py-2 border-2 border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              I read up to page…
            </button>
          )}
        </>
      )}
    </div>
  );
}

BookCard.propTypes = {
  book: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    totalPages: PropTypes.number.isRequired,
    pagesRead: PropTypes.number.isRequired,
    targetDate: PropTypes.string.isRequired,
    startDate: PropTypes.string,
    lastRead: PropTypes.string,
    readingSessions: PropTypes.array,
  }).isRequired,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  delay: PropTypes.number,
};

function BookSearch({ onPick }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=5&fields=title,author_name,number_of_pages_median,cover_i,key`,
        );
        const data = await res.json();
        const items = (data.docs || [])
          .map((doc) => ({
            id: doc.key,
            title: doc.title,
            authors: doc.author_name || [],
            pageCount: doc.number_of_pages_median || 0,
            thumbnail: doc.cover_i
              ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-S.jpg`
              : null,
          }))
          .filter((b) => b.title && b.pageCount > 0);
        setResults(items);
        setOpen(true);
      } catch (e) {
        console.error("Book search failed:", e);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Search for a book
      </label>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
          placeholder="Title or author…"
        />
      </div>
      {open && (results.length > 0 || searching) && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {searching && results.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-400">Searching…</li>
          )}
          {results.map((book) => (
            <li key={book.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(book);
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 flex gap-3 items-start"
              >
                {book.thumbnail ? (
                  <img
                    src={book.thumbnail}
                    alt=""
                    className="w-10 h-14 object-cover rounded shadow-sm flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-14 bg-slate-100 rounded flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {book.title}
                  </p>
                  {book.authors.length > 0 && (
                    <p className="text-xs text-slate-500 truncate">
                      {book.authors.join(", ")}
                    </p>
                  )}
                  <p className="text-xs text-slate-400">{book.pageCount} pages</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

BookSearch.propTypes = {
  onPick: PropTypes.func.isRequired,
};

function AddBookForm({ onAdd, onCancel, existingBook }) {
  const isEdit = !!existingBook;
  const [formData, setFormData] = useState({
    title: existingBook?.title || "",
    totalPages: existingBook ? String(existingBook.totalPages) : "",
    pagesRead: existingBook ? String(existingBook.pagesRead) : "",
    targetDate: existingBook?.targetDate || "",
  });
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!formData.title || !formData.totalPages || !formData.targetDate) {
      setError("Please add a title, total pages, and a finish-by date.");
      return;
    }

    const totalPages = parseInt(formData.totalPages, 10);
    if (Number.isNaN(totalPages) || totalPages <= 0) {
      setError("Total pages must be a number greater than 0.");
      return;
    }

    const pagesRead = formData.pagesRead ? parseInt(formData.pagesRead, 10) : 0;
    if (Number.isNaN(pagesRead) || pagesRead < 0) {
      setError("Pages already read must be a non-negative number.");
      return;
    }

    if (pagesRead > totalPages) {
      setError("Pages already read can't exceed total pages.");
      return;
    }

    onAdd({
      title: formData.title.trim(),
      totalPages,
      pagesRead,
      targetDate: formData.targetDate,
    });
  };

  const previewBook = {
    totalPages: parseInt(formData.totalPages, 10) || 0,
    pagesRead: formData.pagesRead === "" ? 0 : parseInt(formData.pagesRead, 10) || 0,
    targetDate: formData.targetDate,
  };
  const showPreview =
    previewBook.totalPages > 0 &&
    !!formData.targetDate &&
    previewBook.pagesRead <= previewBook.totalPages;
  const previewTarget = showPreview ? dailyTarget(previewBook) : 0;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-3xl serif font-semibold text-slate-800 mb-6">
          {isEdit ? "Edit Book" : "Add a Book"}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isEdit && (
            <BookSearch
              onPick={(book) =>
                setFormData((f) => ({
                  ...f,
                  title: book.title,
                  totalPages: String(book.pageCount),
                }))
              }
            />
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Book Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="What are you reading?"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Total Pages
            </label>
            <input
              type="number"
              value={formData.totalPages}
              onChange={(e) =>
                setFormData({ ...formData, totalPages: e.target.value })
              }
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="320"
              required
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Pages Already Read
            </label>
            <input
              type="number"
              value={formData.pagesRead === "" ? "" : String(formData.pagesRead)}
              onChange={(e) => {
                const rawValue = e.target.value;
                if (rawValue === "") {
                  setFormData({ ...formData, pagesRead: "" });
                  return;
                }
                const cleaned = rawValue.replace(/^0+(?=\d)/, "");
                const parsed = parseInt(cleaned, 10);
                if (Number.isNaN(parsed)) {
                  setFormData({ ...formData, pagesRead: "" });
                  return;
                }
                const totalPagesValue = parseInt(formData.totalPages, 10);
                const hasMax =
                  !Number.isNaN(totalPagesValue) && totalPagesValue > 0;
                const limited = hasMax
                  ? Math.min(parsed, totalPagesValue)
                  : parsed;
                setFormData({ ...formData, pagesRead: limited });
              }}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="e.g. 50"
              min="0"
              max={formData.totalPages || undefined}
            />
            <p className="text-xs text-slate-500 mt-1">
              Leave blank if starting fresh
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Finish By
            </label>
            <div className="rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-slate-400 overflow-hidden">
              <input
                type="date"
                value={formData.targetDate}
                onChange={(e) =>
                  setFormData({ ...formData, targetDate: e.target.value })
                }
                className="w-full px-4 py-3 bg-white text-slate-800 focus:outline-none text-base text-center"
                required
                min={isEdit ? undefined : new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          {showPreview && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">
                Your pace
              </p>
              <p className="serif text-4xl font-light text-slate-800 leading-none">
                {previewTarget}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                pages a day to finish by{" "}
                {new Date(formData.targetDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
            >
              {isEdit ? "Save Changes" : "Add Book"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

AddBookForm.propTypes = {
  onAdd: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  existingBook: PropTypes.object,
};
