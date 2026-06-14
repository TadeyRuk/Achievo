import { useState } from "react";
import { Copy, Mail, MoreHorizontal, HelpCircle, Users, UserCheck, Gift, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ReferFriendProps {
  userName: string;
}

export function ReferFriend({ userName }: ReferFriendProps) {
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Generate a mock unique referral code based on the username
  const referralCode = `ACH-${userName.slice(0, 3).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
  const referralUrl = `https://achievo.app/join?ref=${referralCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    showToast("Referral code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleShare = (platform: "whatsapp" | "twitter" | "email" | "more") => {
    const text = `Join me on Achievo to earn XLM rewards for student achievements! Use my referral code: ${referralCode}`;
    const url = referralUrl;

    if (platform === "whatsapp") {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + url)}`, "_blank");
    } else if (platform === "twitter") {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
    } else if (platform === "email") {
      window.open(`mailto:?subject=${encodeURIComponent("Join Achievo and earn XLM!")}&body=${encodeURIComponent(text + "\n\n" + url)}`);
    } else {
      if (navigator.share) {
        navigator.share({
          title: "Achievo Referral",
          text: text,
          url: url,
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(url);
        showToast("Referral link copied to clipboard!");
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col min-h-full bg-[#faf9ff]"
    >
      {/* Scrollable Content — pt clears the persistent app Navbar (~64px) */}
      <div className="flex-1 p-5 pt-20 space-y-6 pb-32">
        {/* Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute top-18 left-5 right-5 z-50 bg-[#061d32] text-white px-4 py-3 rounded-full flex items-center justify-center gap-2 shadow-lg border border-white/10"
            >
              <Check className="w-4 h-4 text-emerald-400" strokeWidth={3} />
              <span className="text-[12px] font-extrabold tracking-wide font-display">{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Banner Card */}
        <div className="bg-[var(--dah-primary-container)] rounded-[32px] p-6 text-white relative overflow-hidden shadow-lg flex flex-col items-center text-center shadow-[var(--dah-primary-container)]/15">
          {/* Background Decorative Blobs */}
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-white/5 rounded-full pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full pointer-events-none" />

          {/* Double Rewards Pill Badge */}
          <div className="bg-[#ffbe42] text-[#00162b] text-[10px] font-black uppercase tracking-[0.1em] px-3.5 py-1.5 rounded-full flex items-center gap-1 shadow-sm">
            <span className="text-xs">★</span> Double Rewards
          </div>

          <h3 className="text-[24px] font-black tracking-tight leading-tight font-display mt-4">
            Give 150 XLM, Get 150 XLM
          </h3>

          <p className="text-[12px] text-white/75 font-semibold leading-relaxed mt-2.5 max-w-[280px]">
            Invite your friends to Achievo. When they join and complete their first verified activity, you both earn 150 XLM directly to your wallets.
          </p>

          {/* Gift Icon Circle */}
          <div className="mt-6 w-36 h-36 shrink-0 rounded-full bg-[#ffbe42]/20 border-4 border-white/90 shadow-md flex items-center justify-center">
            <div className="w-20 h-20 bg-[#ffbe42] rounded-full flex items-center justify-center shadow-lg">
              <Gift className="w-10 h-10 text-[#00162b]" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Referral Code Card */}
        <div className="bg-white rounded-[32px] p-6 border border-[var(--dah-outline-variant)]/40 shadow-sm flex flex-col items-center space-y-4">
          <span className="text-[13px] font-extrabold text-[#00162b] font-display uppercase tracking-[0.06em]">
            Your Referral Code
          </span>

          {/* Dashed Referral Code Box */}
          <div className="w-full max-w-[280px] py-4 rounded-[24px] border-2 border-dashed border-[#0f3b8c]/30 bg-[#f8faff] flex items-center justify-center">
            <span className="text-[28px] font-black text-[#001540] tracking-[0.15em] font-display select-all pl-3">
              {referralCode}
            </span>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopyCode}
            className="w-full max-w-[280px] py-3.5 bg-[#001540] hover:bg-[#000f30] text-white rounded-full font-bold text-[14px] flex items-center justify-center gap-2 transition-all active:scale-98 shadow-sm cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" strokeWidth={3} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        {/* Share Link Card */}
        <div className="bg-white rounded-[32px] p-6 border border-[var(--dah-outline-variant)]/40 shadow-sm flex flex-col items-center space-y-4">
          <div className="text-center">
            <span className="text-[14px] font-extrabold text-[#00162b] font-display">
              Share Link
            </span>
            <p className="text-[12px] text-gray-500 font-semibold mt-1">
              Send your unique link directly to friends.
            </p>
          </div>

          {/* Platform Share Buttons */}
          <div className="flex items-center justify-around w-full max-w-[320px] pt-1">
            {/* WhatsApp */}
            <div className="flex flex-col items-center space-y-1.5">
              <button
                onClick={() => handleShare("whatsapp")}
                className="w-12 h-12 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              >
                <svg className="w-5.5 h-5.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>
              <span className="text-[10px] font-bold text-gray-500">WhatsApp</span>
            </div>

            {/* Twitter / X */}
            <div className="flex flex-col items-center space-y-1.5">
              <button
                onClick={() => handleShare("twitter")}
                className="w-12 h-12 rounded-full bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </button>
              <span className="text-[10px] font-bold text-gray-500">Twitter</span>
            </div>

            {/* Email */}
            <div className="flex flex-col items-center space-y-1.5">
              <button
                onClick={() => handleShare("email")}
                className="w-12 h-12 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              >
                <Mail className="w-5.5 h-5.5" />
              </button>
              <span className="text-[10px] font-bold text-gray-500">Email</span>
            </div>

            {/* More */}
            <div className="flex flex-col items-center space-y-1.5">
              <button
                onClick={() => handleShare("more")}
                className="w-12 h-12 rounded-full bg-slate-500/10 hover:bg-slate-500/20 text-slate-600 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              >
                <MoreHorizontal className="w-5.5 h-5.5" />
              </button>
              <span className="text-[10px] font-bold text-gray-500">More</span>
            </div>
          </div>
        </div>

        {/* How it Works Section */}
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2 px-1">
            <div className="w-6 h-6 rounded-full bg-[#001540] flex items-center justify-center">
              <HelpCircle className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <h4 className="text-[15px] font-black text-[#00162b] tracking-tight font-display">How it works</h4>
          </div>

          {/* Step Cards Row */}
          <div className="grid grid-cols-3 gap-3">

            {/* Step 1 */}
            <div className="flex flex-col items-center text-center bg-white rounded-[24px] p-4 border border-gray-100 shadow-sm">
              <div className="w-7 h-7 rounded-full bg-gray-900 text-white text-[11px] font-black flex items-center justify-center mb-3">
                1
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-gray-500" strokeWidth={1.8} />
              </div>
              <p className="text-[11px] font-bold text-gray-900 leading-snug">Invite a friend</p>
              <p className="text-[10px] text-gray-400 font-medium mt-1 leading-snug">Share your link or code</p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center bg-white rounded-[24px] p-4 border border-gray-100 shadow-sm">
              <div className="w-7 h-7 rounded-full bg-gray-900 text-white text-[11px] font-black flex items-center justify-center mb-3">
                2
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <UserCheck className="w-6 h-6 text-gray-500" strokeWidth={1.8} />
              </div>
              <p className="text-[11px] font-bold text-gray-900 leading-snug">They join & complete</p>
              <p className="text-[10px] text-gray-400 font-medium mt-1 leading-snug">First verified activity</p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center bg-white rounded-[24px] p-4 border border-gray-100 shadow-sm">
              <div className="w-7 h-7 rounded-full bg-gray-900 text-white text-[11px] font-black flex items-center justify-center mb-3">
                3
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <Gift className="w-6 h-6 text-gray-500" strokeWidth={1.8} />
              </div>
              <p className="text-[11px] font-bold text-gray-900 leading-snug">Both get rewarded</p>
              <p className="text-[10px] text-gray-400 font-medium mt-1 leading-snug">150 XLM each!</p>
            </div>

          </div>
        </div>

      </div>
    </motion.div>
  );
}
