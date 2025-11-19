import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function AddStory() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get('quote');
  const navigate = useNavigate();

  const [rating, setRating] = useState<number>(5);
  const [story, setStory] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !quoteId) return;
    // Optionally verify payment exists (RLS will enforce too)
  }, [user, quoteId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user || !quoteId) return;
    if (!story.trim()) {
      setError('Please write a short story.');
      return;
    }
    if (rating < 1 || rating > 5) {
      setError('Rating must be between 1 and 5.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('success_stories').insert({
      user_id: user.id,
      quote_id: quoteId,
      rating,
      story,
      image_url: imageUrl || null
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate('/');
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-3xl font-bold gradient-text mb-6">Share Your Success Story</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Tell others about your experience. 5-star stories are featured on the home screen.</p>
      {error && (
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 mb-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Rating</label>
          <div className="flex gap-1">
            {[1,2,3,4,5].map(star => (
              <button
                type="button"
                key={star}
                onClick={() => setRating(star)}
                className={"text-2xl " + (star <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600')}
                aria-label={`Rate ${star} star`}
              >★</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Story</label>
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            className="input h-32 resize-y w-full"
            placeholder="How did StarTronics help you?"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Photo URL (optional)</label>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="input w-full"
            placeholder="https://..."
          />
          <p className="text-xs text-gray-500 mt-1">You can paste a public image link for now.</p>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Submitting...' : 'Submit Story'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn btn-outline">Cancel</button>
        </div>
      </form>
    </div>
  );
}
