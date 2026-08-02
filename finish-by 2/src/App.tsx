import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Calendar, 
  Settings, 
  Plus, 
  ChevronRight, 
  Check, 
  Clock,
  X,
  TrendingUp,
  AlertCircle,
  Archive,
  Zap,
  Bell,
  BellOff,
  Compass,
  Search,
  Loader2
} from 'lucide-react';

interface SearchResultBook {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  coverUrl?: string | null;
}

async function fetchBookResults(query: string): Promise<SearchResultBook[]> {
  if (!query.trim() || query.length < 2) return [];
  
  // Try Open Library first
  try {
    const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=7`);
    if (res.ok) {
      const data = await res.json();
      if (data.docs && data.docs.length > 0) {
        return data.docs.map((doc: any) => ({
          id: doc.key || Math.random().toString(),
          title: doc.title || 'Untitled',
          author: doc.author_name ? doc.author_name.slice(0, 2).join(', ') : 'Unknown Author',
          totalPages: doc.number_of_pages_median || (doc.number_of_pages ? doc.number_of_pages[0] : null) || 300,
          coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-S.jpg` : null,
        }));
      }
    }
  } catch (e) {
    console.warn('Open Library search failed, trying fallback', e);
  }

  // Fallback to Google Books API
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=7`);
    if (res.ok) {
      const data = await res.json();
      if (data.items) {
        return data.items.map((item: any) => ({
          id: item.id,
          title: item.volumeInfo.title || 'Untitled',
          author: item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Unknown Author',
          totalPages: item.volumeInfo.pageCount || 300,
          coverUrl: item.volumeInfo.imageLinks?.smallThumbnail || item.volumeInfo.imageLinks?.thumbnail || null,
        }));
      }
    }
  } catch (e) {
    console.warn('Google Books API search failed', e);
  }

  return [];
}
import { 
  Book, 
  BookStatus, 
  ReadingPace, 
  ReadingSchedule, 
  generateReadingPlan, 
  logReadingProgress, 
  editBook,
  checkFeasibility,
  checkInactivityNudge,
  extendDeadline,
  startOfDay,
  daysBetween,
} from './lib/readingPlan';
import { NotificationModal } from './components/NotificationModal';
import {
  getNotificationPermissionStatus,
  getStoredNotificationSettings,
  triggerDailyReminder,
  getTodayKey,
  getUnreadBooksForToday,
} from './lib/notifications';

// --- Utilities ---

export const triggerHaptic = (type: 'success' | 'delete' | 'light' = 'light') => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'success') {
        navigator.vibrate([15, 30, 15]);
      } else if (type === 'delete') {
        navigator.vibrate([25, 40, 15]);
      } else {
        navigator.vibrate(15);
      }
    } catch {
      // Ignore vibration errors on non-supported environments
    }
  }
};

// --- Components ---

interface BookCardProps {
  book: Book;
  onProgress: (id: string, pages: number) => void;
  onDelete: (id: string) => void;
  onEdit: (book: Book) => void;
  onExtend: (id: string) => void;
}

const BookCard: React.FC<BookCardProps> = ({ book, onProgress, onDelete, onEdit, onExtend }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [pagesInput, setPagesInput] = useState(book.pagesRead.toString());
  
  useEffect(() => {
    setPagesInput(book.pagesRead.toString());
  }, [book.pagesRead]);
  
  const progress = (book.pagesRead / book.totalPages) * 100;
  const feasibility = checkFeasibility(book);
  const todayDate = startOfDay(new Date()).getTime();
  const todayKey = new Date().toISOString().split('T')[0];
  const todaysTarget = book.dailyPlan.find(d => startOfDay(d.date).getTime() === todayDate)?.pagesTarget || 0;
  
  const readToday = book.lastProgressUpdate === todayKey ? book.pagesReadToday : 0;
  
  const daysLeft = daysBetween(new Date(), book.targetEndDate);
  const inactivity = checkInactivityNudge(book);

  const handleProgressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(pagesInput);
    if (!isNaN(val)) {
      onProgress(book.id, val);
      setIsUpdating(false);
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-[#F9F8F6] border border-[#E5E3DF] rounded-[40px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_40px_80px_rgba(15,23,42,0.08)] transition-all duration-700 overflow-hidden flex flex-col"
    >
      <div className="h-2 w-full bg-[#D97706]" />
      
      <div className="p-10 space-y-8 flex-1 flex flex-col bg-white">
        <div className="flex justify-between items-start">
          <button 
            onClick={() => onEdit(book)}
            className="text-left group/label"
          >
            <h2 className="text-3xl font-serif font-bold tracking-tight text-[#0F172A] mb-2 group-hover/label:text-[#D97706] transition-colors">{book.title}</h2>
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#0F172A]/30 uppercase">{book.totalPages} pages</p>
              <div className="w-1.5 h-1.5 rounded-full bg-[#E5E3DF]" />
              <p className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#D97706] uppercase">{book.pace} intensive</p>
            </div>
          </button>
          <button 
            onClick={() => onDelete(book.id)}
            className="p-2 text-[#0F172A]/10 hover:text-red-400 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {inactivity?.needsNudge && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="p-6 bg-white border border-[#E5E3DF] rounded-[24px] space-y-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Compass size={14} className="text-[#D97706]" />
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#0F172A]/40">System Recalibration</p>
            </div>
            <p className="text-sm text-[#0F172A]/70 leading-relaxed font-serif italic">
              "We've detected a lapse. Don't worry—the path has been cleared. To finish on time, {inactivity.newPace} pages/day is your new steady."
            </p>
            <button 
              onClick={() => onExtend(book.id)}
              className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] bg-[#0F172A] text-white px-6 py-3 rounded-xl hover:bg-[#1E293B] transition-all"
            >
              Extend Deadline
            </button>
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white border border-[#E5E3DF] p-8 rounded-[32px] flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/10" />
            <span className="text-4xl font-display font-bold text-[#0F172A] mb-2">{readToday} / {todaysTarget === 0 ? '?' : todaysTarget}</span>
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.3em] text-[#0F172A]/30">Today's Absorption</span>
          </div>
          <div className="bg-white border border-[#E5E3DF] p-8 rounded-[32px] flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#D97706]/10" />
            <span className="text-4xl font-display font-bold text-[#0F172A] mb-2">{daysLeft}</span>
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.3em] text-[#0F172A]/30">Remaining</span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-end text-[10px] font-mono uppercase font-bold tracking-[0.3em]">
            <span className="text-[#0F172A]/40 text-[9px]">Absorbed</span>
            <span className="text-[#0F172A]">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-[#F1F0ED] rounded-full overflow-hidden border border-[#E5E3DF]">
            <motion.div 
              className="h-full bg-[#0F172A]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <p className="text-[10px] font-mono text-center text-[#0F172A]/20 uppercase tracking-[0.2em]">
            {book.pagesRead} / {book.totalPages} folios
          </p>
        </div>

        <div className="mt-auto pt-10 flex flex-col gap-6 border-t border-[#F1F0ED]">
          <AnimatePresence mode="wait">
            {isUpdating ? (
              <motion.form 
                key="updating"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleProgressSubmit}
                className="flex items-center gap-3 w-full"
              >
                <div className="relative flex-1">
                  <input 
                    type="number"
                    autoFocus
                    value={pagesInput}
                    onChange={(e) => setPagesInput(e.target.value)}
                    className="w-full bg-[#F9F8F6] border border-[#E5E3DF] rounded-2xl px-6 py-4 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="New page total..."
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-mono text-black/20 uppercase">Total Pages</span>
                </div>
                <button 
                  type="submit"
                  className="bg-indigo-600 text-white p-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Check size={20} />
                </button>
                <button 
                  type="button"
                  onClick={() => setIsUpdating(false)}
                  className="bg-[#F1F0ED] text-[#0F172A] p-4 rounded-2xl hover:bg-[#E5E3DF] transition-all"
                >
                  <X size={20} />
                </button>
              </motion.form>
            ) : (
              <motion.div 
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 flex items-center justify-center rounded-2xl shadow-sm">
                     <Calendar size={18} className="text-indigo-600" />
                   </div>
                   <div>
                     <p className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-[#0F172A]/20">Target</p>
                     <p className="text-[11px] font-mono font-bold uppercase text-[#0F172A]">
                       {new Date(book.targetEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                     </p>
                   </div>
                </div>

                <button 
                  onClick={() => setIsUpdating(true)}
                  className="flex items-center gap-3 px-8 py-5 bg-[#0F172A] text-white rounded-2xl text-[10px] font-mono font-bold uppercase tracking-[0.4em] hover:bg-indigo-900 transition-all shadow-xl shadow-indigo-900/10"
                >
                  Log Volume
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function BookForm({ book, onSave, onCancel }: { book?: Book, onSave: (data: any) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState({
    title: book?.title || '',
    totalPages: book?.totalPages.toString() || '',
    pagesRead: book?.pagesRead.toString() || '',
    targetDate: book ? new Date(book.targetEndDate).toISOString().split('T')[0] : '',
    pace: book?.pace || 'steady' as ReadingPace,
    schedule: book?.schedule || 'daily' as ReadingSchedule
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultBook[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await fetchBookResults(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
      setShowResults(true);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectBook = (selected: SearchResultBook) => {
    setFormData(prev => ({
      ...prev,
      title: selected.title,
      totalPages: selected.totalPages ? selected.totalPages.toString() : prev.totalPages,
    }));
    setShowResults(false);
    setSearchQuery('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.totalPages || !formData.targetDate) return;
    
    onSave({
      title: formData.title,
      totalPages: parseInt(formData.totalPages),
      pagesRead: formData.pagesRead ? parseInt(formData.pagesRead) : 0,
      targetEndDate: new Date(formData.targetDate),
      pace: formData.pace,
      schedule: formData.schedule
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white border border-[#E2E8F0] rounded-[28px] p-6 sm:p-8 w-full max-w-md shadow-2xl relative my-auto"
      >
        <div className="mb-6">
          <h2 className="text-2xl font-serif font-bold text-[#0F172A]">
            {book ? 'Edit Book' : 'Add a Book'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Search for a book */}
          <div className="relative">
            <label className="text-xs font-medium text-[#334155] mb-1.5 block">
              Search for a book
            </label>
            <div className="relative flex items-center">
              <Search size={18} className="absolute left-3.5 text-[#94A3B8] pointer-events-none" />
              <input 
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                className="w-full bg-white border border-[#CBD5E1] rounded-xl pl-10 pr-9 py-2.5 text-sm text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-[#475569] focus:ring-1 focus:ring-[#475569] transition-all"
                placeholder="Title or author..."
              />
              {isSearching && (
                <Loader2 size={16} className="absolute right-3 text-[#94A3B8] animate-spin" />
              )}
            </div>

            {/* Search Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#CBD5E1] rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-[#F1F5F9]">
                {searchResults.map(result => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => handleSelectBook(result)}
                    className="w-full text-left p-3 hover:bg-[#F8FAFC] flex items-center gap-3 transition-colors group"
                  >
                    {result.coverUrl ? (
                      <img 
                        src={result.coverUrl} 
                        alt={result.title} 
                        className="w-10 h-13 object-cover rounded bg-[#F1F5F9] shrink-0 border border-[#E2E8F0]"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-13 bg-[#F1F5F9] rounded border border-[#E2E8F0] shrink-0 flex items-center justify-center text-[#94A3B8]">
                        <BookOpen size={16} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#0F172A] truncate group-hover:text-indigo-600">
                        {result.title}
                      </p>
                      <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                        {result.author}
                      </p>
                      <p className="text-[10px] font-mono text-[#94A3B8] mt-0.5">
                        {result.totalPages} pages
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Book Title */}
          <div>
            <label className="text-xs font-medium text-[#334155] mb-1.5 block">
              Book Title
            </label>
            <input 
              required
              type="text"
              value={formData.title}
              onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-white border border-[#CBD5E1] rounded-xl px-4 py-2.5 text-sm text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-[#475569] transition-all"
              placeholder="What are you reading?"
            />
          </div>
          
          {/* Total Pages */}
          <div>
            <label className="text-xs font-medium text-[#334155] mb-1.5 block">
              Total Pages
            </label>
            <input 
              required
              type="number"
              value={formData.totalPages}
              onChange={e => setFormData(f => ({ ...f, totalPages: e.target.value }))}
              className="w-full bg-white border border-[#CBD5E1] rounded-xl px-4 py-2.5 text-sm font-mono text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-[#475569] transition-all"
              placeholder="320"
            />
          </div>

          {/* Pages Already Read */}
          <div>
            <label className="text-xs font-medium text-[#334155] mb-1.5 block">
              Pages Already Read
            </label>
            <input 
              type="number"
              value={formData.pagesRead}
              onChange={e => setFormData(f => ({ ...f, pagesRead: e.target.value }))}
              className="w-full bg-white border border-[#CBD5E1] rounded-xl px-4 py-2.5 text-sm font-mono text-[#0F172A] placeholder-[#94A3B8] outline-none focus:border-[#475569] transition-all"
              placeholder="e.g. 50"
            />
            <span className="text-[11px] text-[#94A3B8] mt-1 block font-sans">
              Leave blank if starting fresh
            </span>
          </div>

          {/* Finish By */}
          <div>
            <label className="text-xs font-medium text-[#334155] mb-1.5 block">
              Finish By
            </label>
            <div className="relative flex items-center">
              <input 
                required
                type="date"
                value={formData.targetDate}
                onChange={e => setFormData(f => ({ ...f, targetDate: e.target.value }))}
                className="w-full bg-white border border-[#CBD5E1] rounded-xl px-4 py-2.5 text-sm font-mono text-[#0F172A] outline-none focus:border-[#475569] transition-all"
              />
              <Calendar size={18} className="absolute right-3.5 text-[#334155] pointer-events-none" />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-3">
            <button 
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 px-5 bg-white border border-[#CBD5E1] rounded-xl text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 px-5 bg-[#1E293B] text-white rounded-xl text-sm font-semibold hover:bg-[#0F172A] transition-colors shadow-md"
            >
              {book ? 'Update Book' : 'Add Book'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function ArchiveModal({ books, onCancel, onDelete }: { books: Book[], onCancel: () => void, onDelete: (id: string) => void }) {
  const finished = books.filter(b => b.status === 'completed');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#F9F8F6] border border-[#E5E3DF] rounded-[48px] p-12 w-full max-w-2xl h-[80vh] flex flex-col shadow-[0_40px_120px_rgba(0,0,0,0.2)] relative overflow-hidden"
      >
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-4xl font-serif font-bold text-[#0F172A]">The Library</h2>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#0F172A]/40 font-bold uppercase">Archived Volumes</p>
          </div>
          <button onClick={onCancel} className="p-3 hover:bg-[#0F172A]/5 rounded-full transition-all text-[#0F172A]/20 hover:text-[#0F172A]">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar">
          {finished.length === 0 ? (
            <div className="py-32 text-center text-[#0F172A]/20 italic font-serif text-xl border border-dashed border-[#E5E3DF] rounded-[32px]">
              "The shelves are empty. Complete a journey to start your collection."
            </div>
          ) : (
            finished.map(book => (
              <div key={book.id} className="p-8 bg-white border border-[#E5E3DF] rounded-[32px] flex justify-between items-center group transition-all hover:shadow-xl">
                <div>
                  <h4 className="font-serif font-bold text-2xl mb-1 text-[#0F172A]">{book.title}</h4>
                  <p className="text-[10px] font-mono uppercase text-[#0F172A]/30 tracking-[0.2em]">
                    Completed {book.completedAt ? new Date(book.completedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently'}
                  </p>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-[10px] font-mono font-bold text-emerald-600 uppercase tracking-widest mb-1">Archived</p>
                    <p className="text-[9px] font-mono text-[#0F172A]/20 uppercase tracking-[0.1em]">{book.totalPages} Pages</p>
                  </div>
                  <button onClick={() => onDelete(book.id)} className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all text-[#0F172A]/10">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Main App ---

export default function App() {
  const [isUnfolded, setIsUnfolded] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [books, setBooks] = useState<Book[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  // Register Service Worker for Web Notifications & Offline support
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.log('SW Registration Note:', err);
      });
    }
  }, []);

  // Sync notification permissions & settings
  useEffect(() => {
    const perm = getNotificationPermissionStatus();
    setNotificationPermission(perm);
    const settings = getStoredNotificationSettings();
    setNotificationsEnabled(settings.enabled && perm === 'granted');
  }, [isNotificationModalOpen]);

  // Automated daily reading check
  useEffect(() => {
    if (books.length === 0) return;

    const runDailyCheck = () => {
      const settings = getStoredNotificationSettings();
      const perm = getNotificationPermissionStatus();
      if (!settings.enabled || perm !== 'granted') return;

      const today = getTodayKey();
      if (settings.lastNotifiedDate === today) return; // Already sent today

      const { unreadBooks } = getUnreadBooksForToday(books);
      if (unreadBooks.length === 0) return; // User already completed reading today!

      // Check configured reminder time
      const now = new Date();
      const [targetHours, targetMinutes] = settings.reminderTime.split(':').map(Number);
      const targetTime = new Date();
      targetTime.setHours(targetHours || 20, targetMinutes || 0, 0, 0);

      if (now >= targetTime) {
        triggerDailyReminder(books, false);
      }
    };

    runDailyCheck();
    const interval = setInterval(runDailyCheck, 60000);
    window.addEventListener('visibilitychange', runDailyCheck);
    window.addEventListener('focus', runDailyCheck);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', runDailyCheck);
      window.removeEventListener('focus', runDailyCheck);
    };
  }, [books]);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('finishby-books');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const revived = parsed.map((b: any) => ({
          ...b,
          startDate: new Date(b.startDate),
          targetEndDate: new Date(b.targetEndDate),
          lastRecalculatedAt: new Date(b.lastRecalculatedAt),
          completedAt: b.completedAt ? new Date(b.completedAt) : undefined,
          dailyPlan: b.dailyPlan.map((d: any) => ({ ...d, date: new Date(d.date) }))
        }));
        setBooks(revived);
      } catch (e) {
        console.error('Failed to parse books', e);
      }
    }
  }, []);

  const saveBooks = useCallback((newBooks: Book[]) => {
    localStorage.setItem('finishby-books', JSON.stringify(newBooks));
    setBooks(newBooks);
  }, []);

  const handleUnfold = () => {
    setIsUnfolded(true);
  };

  const handleAddBook = (data: any) => {
    const newBook: Book = {
      id: Math.random().toString(36).substring(7),
      title: data.title,
      totalPages: data.totalPages,
      pagesRead: data.pagesRead,
      startDate: new Date(),
      targetEndDate: data.targetEndDate,
      pace: data.pace,
      schedule: data.schedule,
      status: data.pagesRead >= data.totalPages ? 'completed' : 'active',
      dailyPlan: [],
      lastRecalculatedAt: new Date(),
      pagesReadToday: 0,
      lastProgressUpdate: new Date().toISOString().split('T')[0]
    };
    
    newBook.dailyPlan = generateReadingPlan(newBook);
    saveBooks([...books, newBook]);
    setIsAdding(false);
    triggerHaptic('success');
  };

  const handleEditBook = (data: any) => {
    if (!editingBook) return;
    const updated = editBook(editingBook, data);
    saveBooks(books.map(b => b.id === editingBook.id ? updated : b));
    setEditingBook(null);
    triggerHaptic('light');
  };

  const handleUpdateProgress = (id: string, totalPagesRead: number) => {
    const book = books.find(b => b.id === id);
    if (!book) return;

    const updated = logReadingProgress(book, totalPagesRead);
    
    saveBooks(books.map(b => b.id === id ? updated : b));
    triggerHaptic('success');
  };

  const handleDeleteBook = (id: string) => {
    saveBooks(books.filter(b => b.id !== id));
    triggerHaptic('delete');
  };

  const handleExtendDeadline = (id: string) => {
    const book = books.find(b => b.id === id);
    if (!book) return;
    const updated = extendDeadline(book, 7);
    saveBooks(books.map(b => b.id === id ? updated : b));
    triggerHaptic('light');
  };

  const activeBooks = books.filter(b => b.status === 'active');
  const streak = books.reduce((acc, b) => acc + (b.pagesRead > 0 ? 1 : 0), 0); // Simplified streak

  return (
    <div className={`min-h-screen font-sans selection:bg-black selection:text-white transition-colors duration-1000 ${isUnfolded ? 'bg-[#FBF9F4]' : 'bg-[#F2EFE8]'}`}>
      <AnimatePresence mode="wait">
        {!isUnfolded ? (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.2, filter: 'blur(10px)' }}
            transition={{ duration: 1 }}
            className="fixed inset-0 flex flex-col items-center justify-center z-50 p-6 overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-multiply paper-texture" />
            
            <motion.div 
              className="relative cursor-pointer group"
              onClick={handleUnfold}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
                <motion.div 
                  className="absolute inset-0 bg-white shadow-2xl rounded-full mix-blend-multiply opacity-40"
                  animate={{ 
                    scale: [1, 1.04, 1],
                    rotate: [0, 3, -3, 0]
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />
                <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_25px_50px_rgba(0,0,0,0.06)]">
                  <defs>
                    <filter id="crumple" x="-20%" y="-20%" width="140%" height="140%">
                      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="5" result="noise" />
                      <feDisplacementMap in="SourceGraphic" in2="noise" scale="35" />
                    </filter>
                  </defs>
                  <motion.path
                    d="M100,20 C130,20 180,60 180,100 C180,140 140,180 100,180 C60,180 20,140 20,100 C20,60 70,20 100,20"
                    fill="#FFFFFF"
                    filter="url(#crumple)"
                  />
                  <path
                    d="M100,35 C145,35 165,75 165,100 C165,125 125,165 100,165 C75,165 35,125 35,100 C35,75 55,35 100,35"
                    fill="none"
                    stroke="rgba(15,23,42,0.25)"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                    filter="url(#crumple)"
                  />
                  <path
                    d="M80,80 Q100,60 120,80 T120,120 Q100,140 80,120 T80,80"
                    fill="none"
                    stroke="rgba(15,23,42,0.15)"
                    strokeWidth="1"
                    filter="url(#crumple)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[#0F172A]/60 font-mono font-medium tracking-[0.35em] text-[11px] uppercase">UNFOLD</span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-12 text-center"
            >
              <h1 className="text-6xl md:text-7xl font-serif font-bold tracking-tight mb-4 text-[#0F172A]">
                Finish By
              </h1>
              <p className="text-[#0F172A]/60 font-sans text-base md:text-lg font-normal max-w-md mx-auto leading-relaxed">
                For people who buy books but don't finish them
              </p>
              <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-[#0F172A]/30 mt-8">
                TAP THE PAPER TO BEGIN
              </p>
            </motion.div>
          </motion.div>
        ) : (
          <motion.main
            key="interface"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="max-w-6xl mx-auto px-6 py-12 md:py-24"
          >
            {/* Nav */}
            <nav className="flex justify-between items-center mb-32">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#0F172A] flex items-center justify-center rounded-2xl shadow-xl shadow-[#0F172A]/20">
                  <BookOpen className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="font-serif font-bold text-2xl tracking-tight text-[#0F172A] leading-none mb-1">Finish By</h1>
                  <span className="text-[10px] font-mono font-bold text-[#0F172A]/30 uppercase tracking-[0.2em]">v2.0 System</span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setIsNotificationModalOpen(true)}
                  className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#0F172A]/40 hover:text-[#0F172A] transition-colors"
                >
                  {notificationsEnabled ? <Bell size={16} className="text-[#D97706]" /> : <BellOff size={16} />}
                  <span className="hidden sm:inline">Alerts</span>
                </button>
                <div className="w-px h-6 bg-[#0F172A]/10 mx-2" />
                <button 
                  onClick={() => setIsArchiveOpen(true)}
                  className="p-3 text-[#0F172A]/40 hover:text-[#0F172A] hover:bg-[#0F172A]/5 rounded-2xl transition-all"
                >
                  <Archive size={20} />
                </button>
              </div>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-1 space-y-20">
              <div className="space-y-16">
                <div>
                  <h2 className="text-5xl md:text-6xl font-serif font-bold text-[#0F172A] mb-4 tracking-tight">The Reading Desk</h2>
                  <p className="text-[#0F172A]/40 font-mono text-xs uppercase tracking-[0.2em]">
                    {activeBooks.length === 0 ? "Empty table. Begin a new journey?" : `Currently observing ${activeBooks.length} active volumes.`}
                  </p>
                </div>

                {activeBooks.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-32 flex flex-col items-center justify-center bg-[#0F172A]/[0.02] border border-dashed border-[#0F172A]/10 rounded-[40px]"
                  >
                    <div className="w-16 h-16 bg-white flex items-center justify-center rounded-full mb-6 shadow-sm border border-[#E5E3DF]">
                      <BookOpen size={24} className="text-[#0F172A]/10" />
                    </div>
                    <p className="text-[#0F172A]/30 font-serif text-xl italic mb-8">No volumes in progress.</p>
                    <button 
                      onClick={() => setIsAdding(true)}
                      className="flex items-center gap-4 bg-[#0F172A] text-white px-10 py-5 rounded-2xl text-[10px] font-mono font-bold uppercase tracking-[0.3em] hover:bg-[#1E293B] transition-all shadow-xl shadow-[#0F172A]/10"
                    >
                      <Plus size={16} /> Add Volume
                    </button>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {activeBooks.map(book => (
                      <BookCard 
                        key={book.id} 
                        book={book} 
                        onProgress={handleUpdateProgress}
                        onDelete={handleDeleteBook}
                        onEdit={setEditingBook}
                        onExtend={handleExtendDeadline}
                      />
                    ))}
                    
                    <button 
                      onClick={() => setIsAdding(true)}
                      className="group flex flex-col items-center justify-center gap-4 p-8 border border-dashed border-[#0F172A]/10 rounded-[32px] hover:bg-[#0F172A]/[0.02] hover:border-[#0F172A]/20 transition-all min-h-[300px]"
                    >
                      <div className="w-12 h-12 bg-[#0F172A]/[0.04] flex items-center justify-center rounded-full group-hover:scale-110 transition-transform">
                        <Plus className="text-[#0F172A]/20 group-hover:text-[#0F172A]/40" size={24} />
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#0F172A]/20 group-hover:text-[#0F172A]/40">New Journey</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <footer className="mt-40 pt-12 border-t border-[#0F172A]/5 flex flex-col md:flex-row justify-between items-center gap-8 opacity-30">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] leading-none">High-Fidelity Reading Engines</span>
              </div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-[0.2em]">© 2026 finish by system</div>
            </footer>
          </motion.main>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdding && (
          <BookForm onSave={handleAddBook} onCancel={() => setIsAdding(false)} />
        )}
        {editingBook && (
          <BookForm book={editingBook} onSave={handleEditBook} onCancel={() => setEditingBook(null)} />
        )}
        {isArchiveOpen && (
          <ArchiveModal books={books} onCancel={() => setIsArchiveOpen(false)} onDelete={handleDeleteBook} />
        )}
        {isNotificationModalOpen && (
          <NotificationModal
            books={books}
            isOpen={isNotificationModalOpen}
            onClose={() => setIsNotificationModalOpen(false)}
            onStatusChange={(enabled) => setNotificationsEnabled(enabled)}
          />
        )}
      </AnimatePresence>

      {/* Global Grainy Texture */}
      <div 
        className="fixed inset-0 pointer-events-none mix-blend-soft-light z-[200] opacity-[0.08]"
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
