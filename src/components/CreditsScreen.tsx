import { useState } from 'react';
import { Check, CheckCircle2, Coins, CreditCard, X } from 'lucide-react';
import type { TranslationDictionary } from '../i18n/translations';
import { CREDIT_PACKAGES, formatCurrency } from '../services/storage';
import type {
  CountryCode,
  CreditPackage,
  CreditTransaction,
  Locale,
} from '../types';

interface CreditsScreenProps {
  t: TranslationDictionary;
  locale: Locale;
  defaultCountry: CountryCode;
  credits: number;
  transactions: CreditTransaction[];
  onPurchase: (
    pkg: CreditPackage,
    country: CountryCode,
    paymentMethod: string,
    packageLabel: string
  ) => void;
}

export function CreditsScreen({
  t,
  locale,
  defaultCountry,
  credits,
  transactions,
  onPurchase,
}: CreditsScreenProps) {
  const [currencyCountry, setCurrencyCountry] =
    useState<CountryCode>(defaultCountry);
  const [checkoutPkg, setCheckoutPkg] = useState<CreditPackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>(
    defaultCountry === 'PY' ? 'transfer_py' : 'pix'
  );
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getPackageCopy = (pkg: CreditPackage) => {
    if (pkg.id === 'avulso') {
      return {
        name: t.credits.avulsoName,
        audience: t.credits.avulsoAudience,
        desc: t.credits.avulsoDesc,
        badge: t.credits.oneTimeBadge,
      };
    }
    return {
      name: t.credits.profissionalName,
      audience: t.credits.profissionalAudience,
      desc: t.credits.profissionalDesc,
      badge: t.credits.monthlyBadge,
    };
  };

  const handleConfirmPurchase = () => {
    if (!checkoutPkg) return;
    const copy = getPackageCopy(checkoutPkg);
    const methodLabel =
      paymentMethod === 'pix'
        ? t.credits.methodPix
        : paymentMethod === 'card'
          ? t.credits.methodCard
          : t.credits.methodTransferPY;

    onPurchase(checkoutPkg, currencyCountry, methodLabel, copy.name);
    setCheckoutPkg(null);
    setSuccessMsg(t.credits.purchaseSuccess);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-8">
      {/* Header & Country Currency Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 tracking-tight">
            {t.credits.title}
          </h1>
          <p className="text-sm text-slate-600 mt-1">{t.credits.subtitle}</p>
        </div>

        <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl self-start">
          <button
            type="button"
            onClick={() => {
              setCurrencyCountry('BR');
              setPaymentMethod('pix');
            }}
            className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              currencyCountry === 'BR'
                ? 'bg-white text-navy-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.common.brasil} (R$)
          </button>
          <button
            type="button"
            onClick={() => {
              setCurrencyCountry('PY');
              setPaymentMethod('transfer_py');
            }}
            className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              currencyCountry === 'PY'
                ? 'bg-white text-navy-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.common.paraguay} (Gs.)
          </button>
        </div>
      </div>

      {/* Balance Banner */}
      <section className="bg-navy-900 text-white rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-300">
            {t.credits.currentBalance}
          </p>
          <div className="flex items-baseline gap-2.5 mt-1">
            <span className="text-4xl font-bold tabular-nums">{credits}</span>
            <span className="text-sm font-medium text-emerald-400">
              {credits === 1 ? t.common.creditSingular : t.common.creditsUnit}
            </span>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md">
          {t.credits.consumptionRule}
        </p>
      </section>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Packages */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">
          {t.credits.packagesTitle}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {CREDIT_PACKAGES.map((pkg) => {
            const copy = getPackageCopy(pkg);
            const price =
              currencyCountry === 'PY' ? pkg.pricePYG : pkg.priceBRL;
            const unitPrice = price / pkg.credits;
            const isPro = pkg.id === 'profissional';

            return (
              <div
                key={pkg.id}
                className={`bg-white rounded-2xl p-6 border flex flex-col justify-between gap-6 ${
                  isPro
                    ? 'border-emerald-600 ring-1 ring-emerald-600/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-emerald-700">
                        {copy.audience}
                      </p>
                      <h3 className="text-xl font-bold text-navy-900 mt-1">
                        {copy.name}
                      </h3>
                    </div>
                    <span className="text-xs font-semibold text-navy-900 tabular-nums shrink-0">
                      {copy.badge}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600">{copy.desc}</p>

                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-navy-900 tabular-nums">
                        {formatCurrency(price, currencyCountry)}
                      </span>
                      {pkg.isMonthly && (
                        <span className="text-xs text-slate-500">/ mês</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 tabular-nums mt-1">
                      {pkg.credits} {t.credits.contractsIncluded} ·{' '}
                      {formatCurrency(unitPrice, currencyCountry)}{' '}
                      {t.credits.perContract}
                    </p>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-700 pt-1">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>
                        {pkg.credits} {t.credits.contractsIncluded}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{t.credits.consumptionRule}</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => setCheckoutPkg(pkg)}
                  className={`w-full min-h-[46px] px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                    isPro
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-navy-900 hover:bg-navy-800 text-white'
                  }`}
                >
                  {t.credits.buyBtn}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Transaction History */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-navy-900">
          {t.credits.historyTitle}
        </h2>

        {transactions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-500">
            {t.credits.historyEmpty}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="px-5 py-3.5 flex items-center justify-between gap-4 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">
                    {tx.description}
                  </p>
                  <p className="text-xs text-slate-500 tabular-nums">
                    {new Date(tx.createdAt).toLocaleDateString(
                      locale === 'es-PY' ? 'es-PY' : 'pt-BR'
                    )}
                    {tx.priceDisplay ? ` · ${tx.priceDisplay}` : ''}
                    {tx.paymentMethod ? ` · ${tx.paymentMethod}` : ''}
                  </p>
                </div>

                <span
                  className={`font-mono font-semibold tabular-nums shrink-0 ${
                    tx.amount > 0 ? 'text-emerald-700' : 'text-slate-700'
                  }`}
                >
                  {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Simulated Checkout Modal */}
      {checkoutPkg && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4"
        >
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Coins className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-navy-900">
                  {t.credits.checkoutTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutPkg(null)}
                aria-label={t.common.close}
                className="min-h-[38px] min-w-[38px] rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-navy-900">
                  {getPackageCopy(checkoutPkg).name}
                </p>
                <p className="text-xs text-slate-500 tabular-nums">
                  +{checkoutPkg.credits} {t.credits.contractsIncluded}
                </p>
              </div>
              <p className="text-lg font-bold text-navy-900 tabular-nums">
                {formatCurrency(
                  currencyCountry === 'PY'
                    ? checkoutPkg.pricePYG
                    : checkoutPkg.priceBRL,
                  currencyCountry
                )}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                {t.credits.paymentMethod}
              </label>
              <div className="space-y-2">
                {(currencyCountry === 'BR'
                  ? [
                      { id: 'pix', label: t.credits.methodPix },
                      { id: 'card', label: t.credits.methodCard },
                    ]
                  : [
                      { id: 'transfer_py', label: t.credits.methodTransferPY },
                      { id: 'card', label: t.credits.methodCard },
                    ]
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl border text-sm font-medium flex items-center justify-between cursor-pointer ${
                      paymentMethod === m.id
                        ? 'border-emerald-600 bg-emerald-50/60 text-navy-900'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-slate-500" />
                      <span>{m.label}</span>
                    </span>
                    {paymentMethod === m.id && (
                      <Check className="h-4 w-4 text-emerald-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-500">
              {t.credits.checkoutSimulatedNote}
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => setCheckoutPkg(null)}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 cursor-pointer"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmPurchase}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
              >
                {t.credits.confirmPurchase}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
