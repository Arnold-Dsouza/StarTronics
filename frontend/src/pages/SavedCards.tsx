import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

interface SavedCard {
  id: string;
  card_last4: string;
  card_brand: string;
  card_holder_name: string;
  expiry_month: string;
  expiry_year: string;
  is_default: boolean;
  created_at: string;
}

export default function SavedCards() {
  const { user } = useAuth();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadCards();
    }
  }, [user]);

  async function loadCards() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('saved_cards')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setCards(data as SavedCard[]);
    }
    setLoading(false);
  }

  async function handleSetDefault(cardId: string) {
    if (!user) return;
    
    // Remove default from all cards, then set selected as default
    await supabase
      .from('saved_cards')
      .update({ is_default: false })
      .eq('user_id', user.id);

    const { error } = await supabase
      .from('saved_cards')
      .update({ is_default: true })
      .eq('id', cardId)
      .eq('user_id', user.id);

    if (!error) {
      await loadCards();
    } else {
      setError(error.message);
    }
  }

  async function handleDelete(cardId: string) {
    if (!window.confirm('Are you sure you want to delete this card?')) {
      return;
    }

    setDeletingId(cardId);
    const { error } = await supabase
      .from('saved_cards')
      .delete()
      .eq('id', cardId)
      .eq('user_id', user!.id);

    if (!error) {
      await loadCards();
    } else {
      setError(error.message);
    }
    setDeletingId(null);
  }

  const cardBrandIcons: Record<string, string> = {
    visa: '💳',
    mastercard: '💳',
    amex: '💳',
    unknown: '💳'
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Saved Cards</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Manage your saved payment methods for faster checkout
        </p>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin text-4xl mb-4">💳</div>
          <p className="text-gray-600 dark:text-gray-300">Loading your cards...</p>
        </div>
      )}

      {error && (
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        </div>
      )}

      {!loading && !error && cards.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">💳</div>
          <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            No saved cards yet
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Save cards during checkout for faster payments in the future
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>Tip:</strong> When making a payment, check the "Save this card for faster checkout" option to add it here.
            </p>
          </div>
        </div>
      )}

      {!loading && cards.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map(card => (
            <div
              key={card.id}
              className={`card-hover group ${
                card.is_default ? 'ring-2 ring-brand-500' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">
                    {cardBrandIcons[card.card_brand] || cardBrandIcons.unknown}
                  </div>
                  <div>
                    <div className="font-semibold capitalize">
                      {card.card_brand} •••• {card.card_last4}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {card.card_holder_name}
                    </div>
                  </div>
                </div>
                {card.is_default && (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    Default
                  </span>
                )}
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Expires {card.expiry_month}/{card.expiry_year}
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                {!card.is_default && (
                  <button
                    onClick={() => handleSetDefault(card.id)}
                    className="btn btn-outline flex-1 text-sm py-2"
                  >
                    Set as Default
                  </button>
                )}
                <button
                  onClick={() => handleDelete(card.id)}
                  disabled={deletingId === card.id}
                  className="btn bg-red-500 hover:bg-red-600 text-white flex-1 text-sm py-2"
                >
                  {deletingId === card.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>

              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Added {new Date(card.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Security Notice */}
      {cards.length > 0 && (
        <div className="card bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">
                Your cards are secure
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                We never store your full card number or CVV. All sensitive data is encrypted and tokenized for your protection.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
