import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check } from "lucide-react";
import { AVATAR_OPTIONS, setUserName } from '../features/profile';

interface LoginProps {
  onComplete: (name: string, avatar: string) => void;
}

const DEFAULT_AVATAR = AVATAR_OPTIONS[0].path;
const GRID_PREVIEW_COUNT = 9;

export function Login({ onComplete }: LoginProps) {
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATAR);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && trimmedName.length <= 40;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setUserName(trimmedName);
    onComplete(trimmedName, selectedAvatar);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      style={{ position: "absolute", inset: 0, zIndex: 9998 }}
      className="bg-[#faf9ff] flex flex-col items-center justify-center px-6"
    >
      <div className="w-full max-w-[340px] space-y-6">
        <div className="text-center space-y-1.5">
          <img src="/only_logo.png" alt="Achievo logo" className="w-16 h-16 mx-auto mb-3" />
          <h1 className="text-[22px] font-extrabold text-[var(--dah-primary)] font-display tracking-tight">
            Welcome to Achievo
          </h1>
          <p className="text-[13px] text-[var(--dah-on-surface-variant)] font-semibold">
            What should we call you?
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAvatarModal(true)}
          className="w-20 h-20 mx-auto rounded-full overflow-hidden border border-gray-100 shadow-sm bg-[var(--dah-surface-low)] cursor-pointer relative group block"
          aria-label="Choose avatar"
        >
          <img
            src={selectedAvatar}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            alt="Selected avatar"
          />
          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </button>

        <div className="space-y-2">
          <label
            htmlFor="login-name"
            className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--dah-on-surface-variant)]"
          >
            Your name
          </label>
          <input
            id="login-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="e.g. Xander"
            className="w-full rounded-2xl border border-[#e1e3e8] bg-white px-4 py-3.5 text-[15px] text-[var(--dah-primary)] placeholder:text-[#9aa3b2] focus:outline-none focus:ring-2 focus:ring-[var(--dah-secondary)]/40"
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-4 rounded-full bg-[var(--dah-primary)] text-white font-extrabold text-[14px] font-display uppercase tracking-wider shadow-md shadow-[var(--dah-primary)]/15 disabled:opacity-40 active:scale-[0.98] transition-all"
        >
          Get started
        </button>
      </div>

      <AnimatePresence>
        {showAvatarModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9999] bg-[#00162b]/65 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowAvatarModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 480, damping: 28 }}
              className="bg-white rounded-[32px] w-full max-w-[360px] p-6 shadow-2xl border border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[17px] font-extrabold text-[#00162b] font-display pb-4 border-b border-slate-100">
                Choose Avatar
              </h3>
              <div className="grid grid-cols-3 gap-4 py-5">
                {AVATAR_OPTIONS.slice(0, GRID_PREVIEW_COUNT).map((avatar) => {
                  const isSelected = selectedAvatar === avatar.path;
                  return (
                    <button
                      key={avatar.path}
                      type="button"
                      onClick={() => { setSelectedAvatar(avatar.path); setShowAvatarModal(false); }}
                      className={`relative w-full aspect-square rounded-[20px] overflow-hidden border bg-[var(--dah-surface-low)] cursor-pointer transition-all p-2.5 flex items-center justify-center ${
                        isSelected
                          ? "border-[var(--dah-primary)] ring-2 ring-[var(--dah-primary)]/30 ring-offset-1"
                          : "border-slate-100 hover:border-slate-300"
                      }`}
                    >
                      <img src={avatar.path} alt={avatar.label} className="w-full h-full object-contain block" loading="lazy" />
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[var(--dah-primary)] flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-center text-[var(--dah-on-surface-variant)] font-semibold">
                More avatars available later from your Profile tab.
              </p>
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="w-full mt-4 py-3 bg-[var(--dah-primary)] hover:bg-[#061d32] text-white rounded-full font-extrabold text-[13px] font-display uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
