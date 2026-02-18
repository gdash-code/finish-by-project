import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, TrendingUp, Check, Plus, X, Clock, Bell, Settings } from 'lucide-react';

export default function FinishBy() {
  const [books, setBooks] = useState([]);
  const [showAddBook, setShowAddBook] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      const keys = await window.storage.list('book:');
      if (keys && keys.keys) {
        const bookPromises = keys.keys.map(async (key) => {
          const result = await window.storage.get(key);
          return result ? JSON.parse(result.value) : null;
        });
        const loadedBooks = (await Promise.all(bookPromises)).filter(Boolean);
        setBooks(loadedBooks);
      }
    } catch (error) {
      console.log('No existing books');
    } finally {
      setLoading(false);
    }
  };

  const addBook = async (bookData) => {
    const book = {
      id: Date.now().toString(),
      ...bookData,
      startDate: new Date().toISOString().split('T')[0],
      lastRead: new Date().toISOString().split('T')[0],
      pagesRead: 0,
      missedDays: 0,
      readingSessions: []
    };

    try {
      await window.storage.set(`book:${book.id}`, JSON.stringify(book));
      setBooks([...books, book]);
      setShowAddBook(false);
    } catch (error) {
      console.error('Failed to save book:', error);
    }
  };

  const updateProgress = async (bookId, newPagesRead) => {
    const updatedBooks = books.map(book => {
      if (book.id === bookId) {
        const today = new Date().toISOString().split('T')[0];
        const lastReadDate = new Date(book.lastRead);
        const todayDate = new Date(today);
        const daysSinceLastRead = Math.floor((todayDate - lastReadDate) / (1000 * 60 * 60 * 24));
        
        const pagesReadToday = newPagesRead - book.pagesRead;
        const newSession = {
          date: today,
          pagesRead: pagesReadToday,
          totalPages: newPagesRead
        };

        return {
          ...book,
          pagesRead: newPagesRead,
          lastRead: today,
          missedDays: daysSinceLastRead > 1 ? book.missedDays + (daysSinceLastRead - 1) : book.missedDays,
          readingSessions: [...(book.readingSessions || []), newSession]
        };
      }
      return book;
    });

    setBooks(updatedBooks);
    const book = updatedBooks.find(b => b.id === bookId);
    try {
      await window.storage.set(`book:${bookId}`, JSON.stringify(book));
    } catch (error) {
      console.error('Failed to update book:', error);
    }
  };

  const deleteBook = async (bookId) => {
    try {
      await window.storage.delete(`book:${bookId}`);
      setBooks(books.filter(b => b.id !== bookId));
    } catch (error) {
      console.error('Failed to delete book:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-stone-100 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

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
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out;
        }
        
        .animate-slide-in {
          animation: slideIn 0.4s ease-out;
        }
        
        .animate-pulse-slow {
          animation: pulse 2s ease-in-out infinite;
        }
        
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

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-16 text-center animate-fade-in-up">
          <div className="flex justify-center items-center gap-3 mb-3">
            <h1 className="text-6xl serif font-light text-slate-800">Finish By</h1>
          </div>
          <p className="text-slate-500 text-lg mb-4">For people who buy books but don't finish them</p>
          
          {/* Notification Toggle */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-200">
            <Bell className={`w-4 h-4 ${notifications ? 'text-slate-800' : 'text-slate-400'}`} />
            <span className="text-sm text-slate-600">Daily reminders</span>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-10 h-6 rounded-full transition-colors ${
                notifications ? 'bg-slate-800' : 'bg-slate-300'
              }`}
            >
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                notifications ? 'translate-x-5' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </header>

        {/* Empty State */}
        {books.length === 0 && !showAddBook && (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="w-20 h-20 bg-slate-200 rounded-full mx-auto mb-6 flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-2xl serif text-slate-700 mb-3">No books yet</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Start your reading journey. We'll help you finish what you start—no guilt, no pressure.
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
              <h2 className="text-2xl serif text-slate-700">Your Reading Journey</h2>
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
                  delay={index * 0.1}
                />
              ))}
            </div>
          </>
        )}

        {/* Add Book Modal */}
        {showAddBook && (
          <AddBookForm
            onAdd={addBook}
            onCancel={() => setShowAddBook(false)}
          />
        )}
      </div>
    </div>
  );
}

function BookCard({ book, onUpdate, onDelete, delay }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState(book.pagesRead);

  // Calculate all the metrics
  const metrics = calculateBookMetrics(book);
  const message = getAdaptiveMessage(book, metrics);

  const handleSaveProgress = () => {
    onUpdate(book.id, currentPage);
    setIsEditing(false);
  };

  return (
    <div 
      className="book-card bg-white rounded-2xl p-6 shadow-sm border border-slate-200 animate-slide-in"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl serif font-semibold text-slate-800 mb-1">{book.title}</h3>
          <p className="text-sm text-slate-500">{book.totalPages} pages</p>
        </div>
        <button
          onClick={() => onDelete(book.id)}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="progress-bar h-full bg-gradient-to-r from-slate-600 to-slate-800 rounded-full"
            style={{ width: `${Math.min(metrics.progress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-slate-600">{book.pagesRead} of {book.totalPages}</span>
          <span className="text-sm font-medium text-slate-700">{Math.round(metrics.progress)}%</span>
        </div>
      </div>

      {/* Commitment Level Badge */}
      <div className="mb-4">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
          book.commitmentLevel === 'gentle' ? 'bg-emerald-50 text-emerald-700' :
          book.commitmentLevel === 'balanced' ? 'bg-blue-50 text-blue-700' :
          'bg-purple-50 text-purple-700'
        }`}>
          {book.commitmentLevel.charAt(0).toUpperCase() + book.commitmentLevel.slice(1)} pace
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center gap-1 text-slate-600 mb-1">
            <Calendar className="w-3 h-3" />
            <span className="text-xs">Finish By</span>
          </div>
          <p className="text-sm font-semibold text-slate-800">
            {new Date(book.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
        
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center gap-1 text-slate-600 mb-1">
            <TrendingUp className="w-3 h-3" />
            <span className="text-xs">Days Left</span>
          </div>
          <p className="text-sm font-semibold text-slate-800">
            {metrics.daysRemaining > 0 ? metrics.daysRemaining : 0}
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center gap-1 text-slate-600 mb-1">
            <Clock className="w-3 h-3" />
            <span className="text-xs">Buffer</span>
          </div>
          <p className="text-sm font-semibold text-slate-800">
            {metrics.bufferDays}d
          </p>
        </div>
      </div>

      {/* Adaptive Message */}
      <div className={`mb-4 p-3 rounded-lg ${
        message.type === 'success' ? 'bg-green-50 border border-green-200' :
        message.type === 'adjusted' ? 'bg-amber-50 border border-amber-200' :
        message.type === 'gentle' ? 'bg-blue-50 border border-blue-200' :
        message.type === 'warning' ? 'bg-rose-50 border border-rose-200' :
        'bg-slate-50 border border-slate-200'
      }`}>
        <p className={`text-sm ${
          message.type === 'success' ? 'text-green-800' :
          message.type === 'adjusted' ? 'text-amber-800' :
          message.type === 'gentle' ? 'text-blue-800' :
          message.type === 'warning' ? 'text-rose-800' :
          'text-slate-700'
        }`}>
          {message.text}
        </p>
      </div>

      {/* Reading Window */}
      {!metrics.isComplete && metrics.readingWindow && (
        <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
          <p className="text-xs text-indigo-600 mb-1">Suggested reading window</p>
          <p className="text-sm font-medium text-indigo-900">{metrics.readingWindow}</p>
        </div>
      )}

      {/* Pages per day breakdown */}
      {!metrics.isComplete && (
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="text-slate-600">Daily target:</span>
          <span className="font-semibold text-slate-800">
            {metrics.adjustedPagesPerDay} pages/day
            {metrics.needsAdjustment && (
              <span className="text-amber-600 text-xs ml-2">(adjusted)</span>
            )}
          </span>
        </div>
      )}

      {/* Update Progress */}
      {!metrics.isComplete && (
        <div>
          {isEditing ? (
            <div className="flex gap-2">
              <input
                type="number"
                value={currentPage}
                onChange={(e) => setCurrentPage(Math.min(Math.max(0, parseInt(e.target.value) || 0), book.totalPages))}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Current page"
                min="0"
                max={book.totalPages}
              />
              <button
                onClick={handleSaveProgress}
                className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setCurrentPage(book.pagesRead);
                setIsEditing(true);
              }}
              className="w-full py-2 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Update Progress
            </button>
          )}
        </div>
      )}

      {/* Completion celebration */}
      {metrics.isComplete && (
        <div className="text-center py-4">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-lg serif font-semibold text-slate-800">You finished!</p>
          <p className="text-sm text-slate-600 mt-1">
            Completed in {metrics.daysElapsed} days
          </p>
        </div>
      )}
    </div>
  );
}

function AddBookForm({ onAdd, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    totalPages: '',
    targetDate: '',
    commitmentLevel: 'balanced',
    readingSpeed: 'moderate'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.title && formData.totalPages && formData.targetDate) {
      onAdd({
        ...formData,
        totalPages: parseInt(formData.totalPages)
      });
    }
  };

  const getCommitmentDetails = (level) => {
    const details = {
      gentle: { days: 4, description: '4 days/week • Flexible & forgiving' },
      balanced: { days: 6, description: '6 days/week • Steady progress' },
      intense: { days: 7, description: 'Daily • Maximum momentum' }
    };
    return details[level];
  };

  const getSuggestedDate = () => {
    const pages = parseInt(formData.totalPages);
    if (!pages) return '';
    
    const pagesPerDay = formData.readingSpeed === 'slow' ? 15 : 
                        formData.readingSpeed === 'moderate' ? 25 : 40;
    
    const commitment = getCommitmentDetails(formData.commitmentLevel);
    const effectiveDays = Math.ceil((pages / pagesPerDay) * (7 / commitment.days));
    
    const date = new Date();
    date.setDate(date.getDate() + effectiveDays);
    return date.toISOString().split('T')[0];
  };

  const calculatePreview = () => {
    const pages = parseInt(formData.totalPages);
    if (!pages || !formData.targetDate) return null;

    const today = new Date();
    const target = new Date(formData.targetDate);
    const totalDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    
    const commitment = getCommitmentDetails(formData.commitmentLevel);
    const readingDays = Math.floor(totalDays * (commitment.days / 7));
    const pagesPerDay = Math.ceil(pages / readingDays);
    const bufferDays = totalDays - readingDays;

    return {
      pagesPerDay,
      readingDays,
      bufferDays,
      totalDays
    };
  };

  const preview = calculatePreview();

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-3xl serif font-semibold text-slate-800 mb-6">Add a Book</h2>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Book Title</label>
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
            <label className="block text-sm font-medium text-slate-700 mb-2">Total Pages</label>
            <input
              type="number"
              value={formData.totalPages}
              onChange={(e) => setFormData({ ...formData, totalPages: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="320"
              required
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Commitment Level</label>
            <div className="space-y-2">
              {['gentle', 'balanced', 'intense'].map((level) => {
                const details = getCommitmentDetails(level);
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFormData({ ...formData, commitmentLevel: level })}
                    className={`w-full text-left py-3 px-4 rounded-lg border-2 transition-all ${
                      formData.commitmentLevel === level
                        ? 'border-slate-800 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-medium text-slate-800 capitalize">{level}</div>
                    <div className="text-xs text-slate-600 mt-1">{details.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Reading Speed</label>
            <div className="grid grid-cols-3 gap-2">
              {['slow', 'moderate', 'fast'].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => setFormData({ ...formData, readingSpeed: speed })}
                  className={`py-2 px-4 rounded-lg border-2 transition-all ${
                    formData.readingSpeed === speed
                      ? 'border-slate-800 bg-slate-800 text-white'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {speed.charAt(0).toUpperCase() + speed.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {formData.readingSpeed === 'slow' && '~15 pages/day'}
              {formData.readingSpeed === 'moderate' && '~25 pages/day'}
              {formData.readingSpeed === 'fast' && '~40 pages/day'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Finish By</label>
            <input
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
              required
              min={new Date().toISOString().split('T')[0]}
            />
            {formData.totalPages && (
              <button
                type="button"
                onClick={() => setFormData({ ...formData, targetDate: getSuggestedDate() })}
                className="text-sm text-slate-600 hover:text-slate-800 mt-2 underline"
              >
                Use suggested date based on your pace
              </button>
            )}
          </div>

          {/* Preview */}
          {preview && (
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-xs font-medium text-slate-600 mb-2">Your reading plan:</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Daily target:</span>
                  <span className="font-medium text-slate-800">{preview.pagesPerDay} pages</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Reading days:</span>
                  <span className="font-medium text-slate-800">{preview.readingDays} of {preview.totalDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Buffer days:</span>
                  <span className="font-medium text-slate-800">{preview.bufferDays}</span>
                </div>
              </div>
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
              Add Book
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// CORE ALGORITHM LOGIC
function calculateBookMetrics(book) {
  const today = new Date().toISOString().split('T')[0];
  const startDate = new Date(book.startDate);
  const targetDate = new Date(book.targetDate);
  const todayDate = new Date(today);
  
  // Time calculations
  const totalDays = Math.ceil((targetDate - startDate) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.ceil((todayDate - startDate) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.ceil((targetDate - todayDate) / (1000 * 60 * 60 * 24));
  
  // Commitment level adjustments
  const commitmentMultipliers = {
    gentle: 4/7,    // 4 days per week
    balanced: 6/7,  // 6 days per week
    intense: 1      // 7 days per week
  };
  
  const commitmentMultiplier = commitmentMultipliers[book.commitmentLevel] || commitmentMultipliers.balanced;
  const effectiveReadingDays = Math.floor(totalDays * commitmentMultiplier);
  const effectiveRemainingDays = Math.floor(daysRemaining * commitmentMultiplier);
  
  // Buffer days (days you can skip)
  const bufferDays = totalDays - effectiveReadingDays;
  
  // Page calculations
  const pagesRemaining = book.totalPages - book.pagesRead;
  const originalPagesPerDay = Math.ceil(book.totalPages / effectiveReadingDays);
  const adjustedPagesPerDay = effectiveRemainingDays > 0 ? 
    Math.ceil(pagesRemaining / effectiveRemainingDays) : pagesRemaining;
  
  // Progress metrics
  const progress = (book.pagesRead / book.totalPages) * 100;
  const isComplete = book.pagesRead >= book.totalPages;
  const needsAdjustment = adjustedPagesPerDay > originalPagesPerDay * 1.2 && !isComplete;
  
  // Intensity calculation (for adaptive messaging)
  const intensityScore = adjustedPagesPerDay / originalPagesPerDay;
  
  // Reading window suggestion
  const readingWindow = getReadingWindow(book.commitmentLevel, adjustedPagesPerDay);
  
  // Average pace from reading sessions
  const avgPagesPerSession = book.readingSessions && book.readingSessions.length > 0
    ? book.readingSessions.reduce((sum, s) => sum + s.pagesRead, 0) / book.readingSessions.length
    : 0;
  
  return {
    totalDays,
    daysElapsed,
    daysRemaining,
    effectiveReadingDays,
    effectiveRemainingDays,
    bufferDays,
    pagesRemaining,
    originalPagesPerDay,
    adjustedPagesPerDay,
    progress,
    isComplete,
    needsAdjustment,
    intensityScore,
    readingWindow,
    avgPagesPerSession
  };
}

function getReadingWindow(commitmentLevel, pagesPerDay) {
  // Estimate minutes based on average reading speed (250 words/min, ~250 words/page)
  const estimatedMinutes = Math.ceil(pagesPerDay / 2.5);
  
  if (commitmentLevel === 'gentle') {
    return `${estimatedMinutes}-${estimatedMinutes + 15} min (when you feel like it)`;
  } else if (commitmentLevel === 'balanced') {
    return `${estimatedMinutes} min (morning or evening)`;
  } else {
    return `${estimatedMinutes} min daily (build the habit)`;
  }
}

function getAdaptiveMessage(book, metrics) {
  if (metrics.isComplete) {
    return { 
      text: `You finished! Completed in ${metrics.daysElapsed} days. 🎉`, 
      type: 'success' 
    };
  }
  
  if (metrics.daysRemaining < 0) {
    return { 
      text: "Want to extend your finish date? No pressure—just adjust when you're ready.", 
      type: 'gentle' 
    };
  }
  
  if (book.missedDays > 3 && metrics.needsAdjustment) {
    return { 
      text: "Life happens. We've recalculated your pace—you're still on track if you start today.", 
      type: 'adjusted' 
    };
  }
  
  if (metrics.intensityScore > 1.5) {
    return { 
      text: `Pace increased to ${metrics.adjustedPagesPerDay} pages/day. Consider extending your date or switching to a gentler commitment.`, 
      type: 'warning' 
    };
  }
  
  if (metrics.progress > 75) {
    return { 
      text: `You're in the home stretch! Just ${metrics.pagesRemaining} pages to go.`, 
      type: 'success' 
    };
  }
  
  if (metrics.progress > 50) {
    return { 
      text: `Halfway there! ${metrics.daysRemaining} days left at your current pace.`, 
      type: 'normal' 
    };
  }
  
  if (book.missedDays > 0) {
    return { 
      text: `Back at it! ${metrics.adjustedPagesPerDay} pages today gets you on track.`, 
      type: 'normal' 
    };
  }
  
  return { 
    text: `${metrics.adjustedPagesPerDay} pages/day to finish on ${new Date(book.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, 
    type: 'normal' 
  };
}
