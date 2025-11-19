import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

interface Quote {
  id: string;
  repair_request_id: string;
  amount: number;
  currency: string;
  breakdown: {
    items: Array<{ description: string; amount: number }>;
    notes?: string;
  };
  status: string;
  created_at: string;
  repair_requests?: {
    title?: string;
    description?: string;
    devices?: {
      type?: string;
      brand?: string;
      model?: string;
    };
  };
}

type PaymentMethod = 'card' | 'upi' | 'netbanking' | 'wallet';

interface SavedCard {
  id: string;
  card_last4: string;
  card_brand: string;
  card_holder_name: string;
  expiry_month: string;
  expiry_year: string;
  is_default: boolean;
}

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get('quote');
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Saved cards
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedSavedCard, setSelectedSavedCard] = useState<string | null>(null);
  const [saveCardForFuture, setSaveCardForFuture] = useState(false);

  // Card details (demo)
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');

  // UPI
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    if (!quoteId || !user) {
      setError('Invalid checkout session');
      setLoading(false);
      return;
    }
    loadQuote();
    loadSavedCards();
  }, [quoteId, user]);

  async function loadQuote() {
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        repair_requests (
          title,
          description,
          devices ( type, brand, model )
        )
      `)
      .eq('id', quoteId)
      .eq('status', 'sent')
      .single();

    if (error || !data) {
      setError('Quote not found or already paid');
      setLoading(false);
      return;
    }

    setQuote(data as Quote);
    setLoading(false);
  }

  async function loadSavedCards() {
    if (!user) return;
    const { data, error } = await supabase
      .from('saved_cards')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setSavedCards(data as SavedCard[]);
      // Auto-select default card if exists
      const defaultCard = data.find(c => c.is_default);
      if (defaultCard) {
        setSelectedSavedCard(defaultCard.id);
      }
    }
  }

  function validatePaymentDetails(): boolean {
    if (selectedMethod === 'card') {
      // If using saved card, skip validation
      if (selectedSavedCard) return true;
      
      if (!cardNumber || cardNumber.replace(/\s/g, '').length !== 16) {
        setError('Please enter a valid 16-digit card number');
        return false;
      }
      if (!cardName.trim()) {
        setError('Please enter cardholder name');
        return false;
      }
      if (!cardExpiry || !/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        setError('Please enter expiry as MM/YY');
        return false;
      }
      if (!cardCVV || cardCVV.length < 3) {
        setError('Please enter valid CVV');
        return false;
      }
    } else if (selectedMethod === 'upi') {
      if (!upiId || !upiId.includes('@')) {
        setError('Please enter a valid UPI ID');
        return false;
      }
    }
    return true;
  }

  function handleProceedToConfirm() {
    setError(null);
    if (!validatePaymentDetails()) return;
    setShowConfirmation(true);
  }

  async function saveNewCard() {
    if (!user || !cardNumber || !cardName || !cardExpiry) return;
    
    const last4 = cardNumber.replace(/\s/g, '').slice(-4);
    const [month, year] = cardExpiry.split('/');
    
    // Determine card brand from number (simple detection)
    let brand = 'unknown';
    const firstDigit = cardNumber.charAt(0);
    if (firstDigit === '4') brand = 'visa';
    else if (firstDigit === '5') brand = 'mastercard';
    else if (firstDigit === '3') brand = 'amex';
    
    const { error } = await supabase.from('saved_cards').insert({
      user_id: user.id,
      card_last4: last4,
      card_brand: brand,
      card_holder_name: cardName,
      expiry_month: month,
      expiry_year: year,
      is_default: savedCards.length === 0 // First card is default
    });
    
    if (!error) {
      await loadSavedCards();
    }
  }

  async function handleConfirmPayment() {
    if (!quote || !user) return;
    setProcessing(true);
    setError(null);

    // Save card if requested (and not using saved card)
    if (saveCardForFuture && !selectedSavedCard && selectedMethod === 'card') {
      await saveNewCard();
    }

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Insert payment record
    const { error: payError } = await supabase.from('payments').insert({
      quote_id: quote.id,
      user_id: user.id,
      amount: quote.amount,
      currency: quote.currency,
      status: 'succeeded'
    });

    if (payError) {
      setError(payError.message);
      setProcessing(false);
      setShowConfirmation(false);
      return;
    }

    // Update quote status
    const { error: quoteError } = await supabase
      .from('quotes')
      .update({ status: 'accepted' })
      .eq('id', quote.id);

    if (quoteError) {
      setError(quoteError.message);
      setProcessing(false);
      setShowConfirmation(false);
      return;
    }

    setProcessing(false);
    navigate(`/payment-success?quote=${quote.id}`);
  }

  const paymentMethods = [
    { id: 'card', label: 'Credit/Debit Card', icon: '💳' },
    { id: 'upi', label: 'UPI', icon: '📱' },
    { id: 'netbanking', label: 'Net Banking', icon: '🏦' },
    { id: 'wallet', label: 'Wallet', icon: '👛' }
  ];

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin text-4xl mb-4">⚙️</div>
        <p className="text-gray-600 dark:text-gray-300">Loading checkout...</p>
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
        <button onClick={() => navigate('/quotes')} className="btn btn-outline">
          ← Back to Quotes
        </button>
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate('/quotes')} className="nav-link text-sm">
          ← Back to Quotes
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Payment Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-2xl font-bold mb-6 gradient-text">Secure Checkout</h2>

            {/* Payment Method Selection */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3">Select Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map(method => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id as PaymentMethod)}
                    className={`p-4 rounded-lg border-2 transition ${
                      selectedMethod === method.id
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-brand-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">{method.icon}</div>
                    <div className="text-sm font-medium">{method.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Card Payment Form */}
            {selectedMethod === 'card' && (
              <div className="space-y-4">
                {/* Saved Cards Selection */}
                {savedCards.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-3">Use Saved Card</label>
                    <div className="space-y-2">
                      {savedCards.map(card => (
                        <button
                          key={card.id}
                          onClick={() => {
                            setSelectedSavedCard(card.id === selectedSavedCard ? null : card.id);
                            // Clear new card fields when selecting saved card
                            if (card.id !== selectedSavedCard) {
                              setCardNumber('');
                              setCardName('');
                              setCardExpiry('');
                              setCardCVV('');
                            }
                          }}
                          className={`w-full p-4 rounded-lg border-2 transition text-left ${
                            selectedSavedCard === card.id
                              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-brand-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-2xl">
                                {card.card_brand === 'visa' ? '💳' : 
                                 card.card_brand === 'mastercard' ? '💳' :
                                 card.card_brand === 'amex' ? '💳' : '💳'}
                              </div>
                              <div>
                                <div className="font-medium capitalize">{card.card_brand} •••• {card.card_last4}</div>
                                <div className="text-xs text-gray-500">{card.card_holder_name}</div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              Expires {card.expiry_month}/{card.expiry_year}
                              {card.is_default && (
                                <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                                  Default
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                      {selectedSavedCard && (
                        <button
                          onClick={() => setSelectedSavedCard(null)}
                          className="text-sm text-brand-600 dark:text-brand-400 hover:underline"
                        >
                          + Use a new card instead
                        </button>
                      )}
                    </div>
                    {selectedSavedCard && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium mb-2">CVV (Security Code)</label>
                        <input
                          type="password"
                          value={cardCVV}
                          onChange={(e) => setCardCVV(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="123"
                          className="input w-48"
                          maxLength={4}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* New Card Form (only show if no saved card selected) */}
                {!selectedSavedCard && (
                  <>
                    {savedCards.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
                        <p className="text-sm font-semibold mb-3">Or enter a new card</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium mb-2">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                          setCardNumber(formatted.slice(0, 19));
                        }}
                        placeholder="1234 5678 9012 3456"
                        className="input w-full"
                        maxLength={19}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Cardholder Name</label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="John Doe"
                        className="input w-full"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Expiry Date</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.length >= 2) {
                              val = val.slice(0, 2) + '/' + val.slice(2, 4);
                            }
                            setCardExpiry(val.slice(0, 5));
                          }}
                          placeholder="MM/YY"
                          className="input w-full"
                          maxLength={5}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">CVV</label>
                        <input
                          type="password"
                          value={cardCVV}
                          onChange={(e) => setCardCVV(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="123"
                          className="input w-full"
                          maxLength={4}
                        />
                      </div>
                    </div>

                    {/* Save Card Checkbox */}
                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <input
                        type="checkbox"
                        id="saveCard"
                        checked={saveCardForFuture}
                        onChange={(e) => setSaveCardForFuture(e.target.checked)}
                        className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                      />
                      <label htmlFor="saveCard" className="text-sm cursor-pointer">
                        💾 Save this card for faster checkout next time
                      </label>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* UPI Payment Form */}
            {selectedMethod === 'upi' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">UPI ID</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@upi"
                    className="input w-full"
                  />
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    📱 Enter your UPI ID and you'll receive a payment request on your UPI app.
                  </p>
                </div>
              </div>
            )}

            {/* Net Banking */}
            {selectedMethod === 'netbanking' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Bank</label>
                  <select className="input w-full">
                    <option>Select your bank</option>
                    <option>State Bank of India</option>
                    <option>HDFC Bank</option>
                    <option>ICICI Bank</option>
                    <option>Axis Bank</option>
                    <option>Kotak Mahindra Bank</option>
                  </select>
                </div>
              </div>
            )}

            {/* Wallet */}
            {selectedMethod === 'wallet' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {['Paytm', 'PhonePe', 'Google Pay', 'Amazon Pay'].map(wallet => (
                    <button
                      key={wallet}
                      className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-brand-300 transition"
                    >
                      <div className="text-sm font-medium">{wallet}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Security Badges */}
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <span>🔒</span>
              <span>SSL Encrypted</span>
            </div>
            <div className="flex items-center gap-1">
              <span>✓</span>
              <span>PCI Compliant</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🛡️</span>
              <span>Secure Payment</span>
            </div>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-1">
          <div className="card sticky top-20">
            <h3 className="text-lg font-bold mb-4">Order Summary</h3>

            <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3 mb-3">
                <div className="text-3xl">
                  {quote.repair_requests?.devices?.type === 'phone' ? '📱' :
                   quote.repair_requests?.devices?.type === 'laptop' ? '💻' : '🔧'}
                </div>
                <div>
                  <h4 className="font-semibold text-sm">
                    {quote.repair_requests?.devices?.brand} {quote.repair_requests?.devices?.model}
                  </h4>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {quote.repair_requests?.description}
                  </p>
                </div>
              </div>
            </div>

            {quote.breakdown?.items && (
              <div className="space-y-2 mb-4">
                <div className="text-sm font-semibold mb-2">Bill Details</div>
                {quote.breakdown.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{item.description}</span>
                    <span className="font-medium">₹{Number(item.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {quote.breakdown?.notes && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                  💬 {quote.breakdown.notes}
                </p>
              </div>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">Total Amount</span>
                <span className="text-2xl font-bold gradient-text">₹{quote.amount.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Inclusive of all taxes</p>
            </div>

            <button
              onClick={handleProceedToConfirm}
              disabled={processing}
              className="btn btn-primary w-full text-lg py-3"
            >
              {processing ? 'Processing...' : `Pay ₹${quote.amount.toFixed(2)}`}
            </button>

            <p className="text-xs text-center text-gray-500 mt-3">
              By proceeding, you agree to our terms and conditions
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🔐</div>
              <h3 className="text-xl font-bold mb-2">Confirm Payment</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                You are about to pay <span className="font-bold gradient-text">₹{quote.amount.toFixed(2)}</span> for your repair
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Payment Method</span>
                <span className="font-medium capitalize">{selectedMethod}</span>
              </div>
              {selectedMethod === 'card' && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Card</span>
                  <span className="font-medium">**** {cardNumber.slice(-4)}</span>
                </div>
              )}
              {selectedMethod === 'upi' && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">UPI ID</span>
                  <span className="font-medium">{upiId}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Amount</span>
                <span className="font-bold">INR {quote.amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                disabled={processing}
                className="btn btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={processing}
                className="btn btn-primary flex-1"
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⚙️</span>
                    Processing...
                  </span>
                ) : (
                  'Confirm & Pay'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
