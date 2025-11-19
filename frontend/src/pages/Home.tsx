import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface StoryRow {
  id: string;
  rating: number;
  story: string;
  image_url?: string | null;
  created_at: string;
  name?: string;
  quotes?: { repair_request_id: string };
}

export default function Home() {
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [hovered, setHovered] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Toggle this to re-enable live data later
  const USE_DUMMY_STORIES = true;

  const DUMMY_STORIES: StoryRow[] = [
    {
      id: 's1',
      rating: 5,
      name: 'Aarav S.',
      story:
        'Lightning-fast diagnostics and a clean bill. My phone was back the same day — professional from end to end.',
      image_url:
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1200&auto=format&fit=crop',
      created_at: new Date().toISOString(),
    },
    {
      id: 's2',
      rating: 5,
      name: 'Mia R.',
      story:
        'Transparent pricing and great communication. The breakdown made it easy to approve and pay with confidence.',
      image_url:
        'https://images.unsplash.com/photo-1484788984921-03950022c9ef?q=80&w=1200&auto=format&fit=crop',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 's3',
      rating: 5,
      name: 'Daniel K.',
      story:
        'They rescued my laptop before a major client deadline. Super efficient workflow and excellent quality.',
      image_url:
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=1200&auto=format&fit=crop',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 's4',
      rating: 5,
      name: 'Priya N.',
      story:
        'Seamless experience — repair request, quote, payment, done. The quality check after repair was a nice touch.',
      image_url:
        'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1200&auto=format&fit=crop',
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: 's5',
      rating: 5,
      name: 'Lucas V.',
      story:
        'Technician notes were super clear. Parts quality feels premium and the device works like new.',
      image_url:
        'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=1200&auto=format&fit=crop',
      created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    {
      id: 's6',
      rating: 5,
      name: 'Sophia L.',
      story:
        'Loved the clear ETA and status updates. Payment was secure and quick — highly recommend.',
      image_url:
        'https://images.unsplash.com/photo-1593642532842-98d0fd5ebc1a?q=80&w=1200&auto=format&fit=crop',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
  ];


  useEffect(() => {
    async function loadStories() {
      if (USE_DUMMY_STORIES) {
        // Triple the stories for infinite loop effect
        setStories([...DUMMY_STORIES, ...DUMMY_STORIES, ...DUMMY_STORIES]);
        return;
      }
      const { data } = await supabase
        .from('success_stories')
        .select('id, rating, story, image_url, created_at')
        .eq('rating', 5)
        .order('created_at', { ascending: false })
        .limit(10);
      const rows = (data as any) || [];
      const base = rows.length > 0 ? rows : DUMMY_STORIES;
      // Triple for infinite loop
      setStories([...base, ...base, ...base]);
    }
    loadStories();
  }, []);

  function scrollToIndex(i: number) {
    const track = trackRef.current;
    if (!track) return;
    const items = Array.from(track.children) as HTMLElement[];
    if (!items.length) return;
    const clamped = (i + items.length) % items.length;
    const target = items[clamped];
    const first = items[0];
    const left = target.offsetLeft - first.offsetLeft; // account for padding
    track.scrollTo({ left, behavior: 'smooth' });
    setActiveIndex(clamped);
  }

  function next() { scrollToIndex(activeIndex + 1); }

  // Auto-scroll every 6s, pause on hover or drag
  useEffect(() => {
    const itemCount = stories.length;
    if (hovered || isDragging || itemCount <= 1) return;
    const t = setInterval(() => {
      next();
    }, 6000);
    return () => clearInterval(t);
  }, [hovered, isDragging, stories.length, activeIndex]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const track = trackRef.current;
    if (!track) return;
    setIsDragging(true);
    setStartX(e.pageX - track.offsetLeft);
    setScrollLeft(track.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const track = trackRef.current;
    if (!track) return;
    const x = e.pageX - track.offsetLeft;
    const walk = (x - startX) * 2; // scroll speed multiplier
    track.scrollLeft = scrollLeft - walk;
  };

  return (
    <div className="space-y-16 relative">
      {/* decorative background blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-400/30 blur-3xl animate-float" />
        <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-accent-400/30 blur-3xl animate-float" style={{animationDelay:'0.8s'}} />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-brand-300/20 blur-3xl animate-float" style={{animationDelay:'1.6s'}} />
      </div>

      <section className="text-center py-20">
        <div className="inline-block mb-6 px-4 py-2 rounded-full bg-gradient-to-r from-brand-100 to-accent-100 border border-brand-200">
          <span className="text-sm font-semibold gradient-text">Welcome to the Future of Repairs</span>
        </div>
        <h1 className="text-6xl md:text-7xl font-bold gradient-text mb-6 leading-tight">
          StarTronics
        </h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
          Professional electronics repair & consultation platform. Submit repair requests, receive quotes, pay securely, and consult with expert technicians—all in one place.
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Link to="/repairs/new" className="btn btn-primary text-lg px-8 py-4">
            Get Started 🚀
          </Link>
          <Link to="/dashboard" className="btn btn-outline text-lg px-8 py-4">
            View Dashboard
          </Link>
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-3">
        <div className="card-hover text-center group">
          <div className="text-5xl mb-4 group-hover:animate-float">📱</div>
          <h3 className="font-bold text-xl mb-3 text-brand-700">Submit Requests</h3>
          <p className="text-slate-600 mb-6 leading-relaxed">Describe your device issue and upload photos for quick assessment.</p>
          <Link to="/repairs/new" className="btn btn-primary w-full">Get Started</Link>
        </div>
        <div className="card-hover text-center group">
          <div className="text-5xl mb-4 group-hover:animate-float">💰</div>
          <h3 className="font-bold text-xl mb-3 text-brand-700">Receive Quotes</h3>
          <p className="text-slate-600 mb-6 leading-relaxed">Expert technicians review and provide detailed repair quotations.</p>
          <Link to="/quotes" className="btn btn-outline w-full">View Quotes</Link>
        </div>
        <div className="card-hover text-center group">
          <div className="text-5xl mb-4 group-hover:animate-float">🔒</div>
          <h3 className="font-bold text-xl mb-3 text-brand-700">Secure Payment</h3>
          <p className="text-slate-600 mb-6 leading-relaxed">Pay safely via Stripe and track your repair progress in real-time.</p>
          <Link to="/dashboard" className="btn btn-outline w-full">Dashboard</Link>
        </div>
      </section>

      <section className="card bg-gradient-to-br from-white/90 to-brand-50/50 dark:from-slate-800/80 dark:to-slate-900/60">
        <h2 className="text-3xl font-bold mb-8 gradient-text">How It Works</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">1</div>
            <div>
              <h4 className="font-semibold text-lg mb-1">Create Account</h4>
              <p className="text-slate-600 text-sm">Sign up as a customer or technician in seconds.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">2</div>
            <div>
              <h4 className="font-semibold text-lg mb-1">Submit Repair Request</h4>
              <p className="text-slate-600 text-sm">Provide device details and issue description.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">3</div>
            <div>
              <h4 className="font-semibold text-lg mb-1">Receive Quote</h4>
              <p className="text-slate-600 text-sm">Technician reviews and sends detailed estimate.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">4</div>
            <div>
              <h4 className="font-semibold text-lg mb-1">Accept & Pay</h4>
              <p className="text-slate-600 text-sm">Approve the quote and pay securely via Stripe.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">5</div>
            <div>
              <h4 className="font-semibold text-lg mb-1">Track Progress</h4>
              <p className="text-slate-600 text-sm">Monitor repair status and consult via chat.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">6</div>
            <div>
              <h4 className="font-semibold text-lg mb-1">Completion</h4>
              <p className="text-slate-600 text-sm">Receive your repaired device and share feedback.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories / Testimonials */}
      <section className="py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
            Success Stories
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
            Real experiences from our satisfied customers
          </p>
        </div>
        {/* Horizontal scroll track with equal-size cards */}
        <div
          className="relative select-none w-full max-w-none px-0"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div
            ref={trackRef}
            className="flex gap-8 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 cursor-grab active:cursor-grabbing scrollbar-hide w-full"
            style={{ scrollBehavior: isDragging ? 'auto' : 'smooth' }}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
          >
            {stories.map((s, i) => (
              <div
                key={`${s.id}-${i}`}
                className="card-hover p-0 overflow-hidden snap-start flex-shrink-0 w-[31vw] min-w-[400px] h-[28rem] select-none"
              >
                <div className="flex h-full">
                  <div className="relative w-2/5 h-full bg-gray-100 dark:bg-slate-700">
                    {s.image_url ? (
                      <>
                        <img src={s.image_url} alt="Story" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">📸</div>
                    )}
                  </div>
                  <div className="w-3/5 p-8 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-xl text-gray-900 dark:text-white truncate mr-2">{s.name || 'Happy Customer'}</div>
                      <div className="flex gap-0.5 flex-shrink-0">
                        {[...Array(s.rating)].map((_, i) => <span key={i} className="text-yellow-400 text-2xl">★</span>)}
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg flex-grow">{s.story}"</p>
                    <p className="mt-auto text-base text-gray-500 dark:text-gray-400">{new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            <span className="font-bold text-2xl gradient-text">100+</span> successful repairs completed
          </p>
          <Link
            to="/repairs/new"
            className="inline-flex items-center text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-semibold group"
          >
            Join our happy customers
            <svg
              className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12">
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 dark:from-brand-700 dark:to-brand-900 rounded-3xl p-12 md:p-16 shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-12 text-center">
            Get in Touch
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl mb-2">
                📞
              </div>
              <h3 className="font-semibold text-white text-lg">Phone</h3>
              <a href="tel:+1234567890" className="text-brand-100 hover:text-white transition-colors">
                +1 (234) 567-890
              </a>
            </div>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl mb-2">
                ✉️
              </div>
              <h3 className="font-semibold text-white text-lg">Email</h3>
              <a href="mailto:support@startronics.com" className="text-brand-100 hover:text-white transition-colors">
                support@startronics.com
              </a>
            </div>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl mb-2">
                📍
              </div>
              <h3 className="font-semibold text-white text-lg">Address</h3>
              <p className="text-brand-100">
                123 Tech Avenue<br />Cityville, Country
              </p>
            </div>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl mb-2">
                🕒
              </div>
              <h3 className="font-semibold text-white text-lg">Hours</h3>
              <p className="text-brand-100">
                Mon - Fri<br />9:00 AM - 6:00 PM
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
