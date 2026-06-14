import { useState } from "react";
import { ArrowLeft, Copy, Share2, Mail, MessageCircle, HelpCircle, Users, UserCheck, Gift, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ReferFriendProps {
  onBack: () => void;
  userName: string;
}

export function ReferFriend({ onBack, userName }: ReferFriendProps) {
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
      {/* Sticky Header */}
      <header
        className="px-6 py-4 flex items-center justify-between sticky top-0 z-50 border-b border-[var(--dah-outline-variant)]/25"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-[#00162b] active:scale-95"
          >
            <ArrowLeft className="w-6 h-6" strokeWidth={2.5} />
          </button>
          <h2 className="text-[18px] font-extrabold text-[#00162b] font-display">
            Refer a Friend
          </h2>
        </div>

        <img
          src="/only_logo.png"
          alt="Achievo Logo"
          className="h-7 w-7 object-contain rounded-full border border-slate-100 shadow-sm"
        />
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 p-5 space-y-6 overflow-y-auto pb-12 custom-scrollbar">
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
        <div className="bg-gradient-to-br from-[#0c2774] via-[#0f3b8c] to-[#061d32] rounded-[32px] p-6 text-white relative overflow-hidden shadow-lg flex flex-col items-center text-center">
          {/* Background Decorative Blobs */}
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-blue-400/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />

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

          {/* Round Illustration */}
          <div className="relative mt-6 w-44 h-44 shrink-0 rounded-full border-4 border-white/95 shadow-md overflow-hidden bg-white/5">
            <img
              src="/refer_illustration.jpg"
              alt="Friends High Fiving"
              className="w-full h-full object-cover"
            />
            {/* Gold Gift Badge overlay */}
            <div className="absolute bottom-1 right-1 w-11 h-11 bg-[#ffbe42] rounded-full flex items-center justify-center text-[#00162b] border-2 border-white shadow-md">
              <Gift className="w-5.5 h-5.5" strokeWidth={2.2} />
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
                <MessageCircle className="w-5.5 h-5.5 fill-current" />
              </button>
              <span className="text-[10px] font-bold text-gray-500">WhatsApp</span>
            </div>

            {/* Twitter / X */}
            <div className="flex flex-col items-center space-y-1.5">
              <button
                onClick={() => handleShare("twitter")}
                className="w-12 h-12 rounded-full bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              >
                <Share2 className="w-5.5 h-5.5" />
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
                <span className="text-xl font-bold leading-none -mt-1">•••</span>
              </button>
              <span className="text-[10px] font-bold text-gray-500">More</span>
            </div>
          </div>
        </div>

        {/* How it Works Section */}
        <div className="bg-[#f5f6fa] rounded-[32px] p-5 border border-[#eef1f6] space-y-5">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-1">
            <HelpCircle className="w-5 h-5 text-[#0f3b8c]" strokeWidth={2.2} />
            <h4 className="text-[16px] font-extrabold text-[#00162b] font-display">
              How it works
            </h4>
          </div>

          {/* Step Timeline */}
          <div className="space-y-6 relative pl-3">
            {/* Timeline connection line */}
            <div className="absolute left-[25px] top-4 bottom-4 w-[2px] bg-[#0f3b8c]/15" />

            {/* Step 1 */}
            <div className="relative flex items-start gap-4">
              {/* Step circle */}
              <div className="w-6 h-6 rounded-full bg-[#001540] text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 z-10 mt-1">
                1
              </div>
              {/* Step info card */}
              <div className="bg-white rounded-[24px] p-4 flex items-center gap-3.5 shadow-sm border border-white/5 flex-1">
                <div className="w-11 h-11 rounded-full bg-[#ffbe42]/15 flex items-center justify-center text-[#ffbe42] shrink-0">
                  <Users className="w-5.5 h-5.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-[13px] font-extrabold text-[#00162b]">Invite a friend</h5>
                  <p className="text-[11.5px] text-gray-500 font-semibold leading-normal mt-0.5">
                    Share your unique referral link or code with someone new to Achievo.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative flex items-start gap-4">
              {/* Step circle */}
              <div className="w-6 h-6 rounded-full bg-[#001540] text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 z-10 mt-1">
                2
              </div>
              {/* Step info card */}
              <div className="bg-white rounded-[24px] p-4 flex items-center gap-3.5 shadow-sm border border-white/5 flex-1">
                <div className="w-11 h-11 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-600 shrink-0">
                  <UserCheck className="w-5.5 h-5.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-[13px] font-extrabold text-[#00162b]">Friend joins & completes activity</h5>
                  <p className="text-[11.5px] text-gray-500 font-semibold leading-normal mt-0.5">
                    They sign up using your code and complete their first verified task or quest.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative flex items-start gap-4">
              {/* Step circle */}
              <div className="w-6 h-6 rounded-full bg-[#ffbe42] text-[#00162b] font-black text-[11px] flex items-center justify-center shrink-0 z-10 mt-1">
                3
              </div>
              {/* Step info card */}
              <div className="bg-white rounded-[24px] p-4 flex items-center gap-3.5 shadow-sm border border-white/5 flex-1">
                <div className="w-11 h-11 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-600 shrink-0">
                  <Gift className="w-5.5 h-5.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-[13px] font-extrabold text-[#00162b]">You both get rewarded</h5>
                  <p className="text-[11.5px] text-gray-500 font-semibold leading-normal mt-0.5">
                    150 XLM is instantly deposited into both of your wallets. Enjoy!
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </motion.div>
  );
}
