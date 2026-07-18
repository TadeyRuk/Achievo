import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AVATAR_OPTIONS } from './avatarOptions';

interface AvatarPickerModalProps {
  open: boolean;
  userAvatar: string;
  onSelect: (avatarPath: string) => void;
  onClose: () => void;
}

export function AvatarPickerModal({
  open,
  userAvatar,
  onSelect,
  onClose,
}: AvatarPickerModalProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(1);

  const itemsPerPage = 9;
  const totalPages = Math.ceil(AVATAR_OPTIONS.length / itemsPerPage);
  const paginatedAvatars = AVATAR_OPTIONS.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage,
  );

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setDirection(-1);
      setCurrentPage((p) => p - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setDirection(1);
      setCurrentPage((p) => p + 1);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-[#00162b]/65 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.96, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 480, damping: 28 }}
            className="bg-white rounded-[32px] w-full max-w-[360px] p-6 shadow-2xl relative border border-slate-100 flex flex-col"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <h3 className="text-[17px] font-extrabold text-[#00162b] font-display">
                Choose Avatar
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>

            <div className="relative overflow-hidden py-5 min-h-[300px] flex items-center justify-center shrink-0">
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={currentPage}
                  custom={direction}
                  variants={{
                    enter: (dir: number) => ({
                      x: dir > 0 ? 120 : -120,
                      opacity: 0,
                    }),
                    center: { x: 0, opacity: 1 },
                    exit: (dir: number) => ({
                      x: dir > 0 ? -120 : 120,
                      opacity: 0,
                    }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 450, damping: 32 },
                    opacity: { duration: 0.12 },
                  }}
                  className="grid grid-cols-3 gap-4 w-full"
                >
                  {paginatedAvatars.map((avatar) => {
                    const isSelected = userAvatar === avatar.path;
                    return (
                      <motion.button
                        key={avatar.path}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => {
                          onSelect(avatar.path);
                          onClose();
                        }}
                        className={`relative w-full aspect-square rounded-[20px] overflow-hidden border bg-[var(--dah-surface-low)] cursor-pointer transition-all p-2.5 flex items-center justify-center ${
                          isSelected
                            ? "border-[var(--dah-primary)] ring-2 ring-[var(--dah-primary)]/30 ring-offset-1"
                            : "border-slate-100 hover:border-slate-300"
                        }`}
                      >
                        <img
                          src={avatar.path}
                          alt={avatar.label}
                          className="w-full h-full object-contain block"
                          loading="lazy"
                        />
                      </motion.button>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between px-1 py-3 border-t border-b border-slate-100 shrink-0">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                  currentPage === 0
                    ? "border-slate-100 text-slate-300 cursor-not-allowed"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <ChevronLeft className="w-4.5 h-4.5" strokeWidth={2.5} />
              </motion.button>

              <span className="text-[12.5px] font-bold text-slate-500 font-display">
                Page <span className="text-[#00162b] font-extrabold">{currentPage + 1}</span> of{" "}
                {totalPages}
              </span>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleNextPage}
                disabled={currentPage === totalPages - 1}
                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                  currentPage === totalPages - 1
                    ? "border-slate-100 text-slate-300 cursor-not-allowed"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <ChevronRight className="w-4.5 h-4.5" strokeWidth={2.5} />
              </motion.button>
            </div>

            <div className="pt-4 shrink-0">
              <button
                onClick={onClose}
                className="w-full py-3 bg-[var(--dah-primary)] hover:bg-[#061d32] text-white rounded-full font-extrabold text-[13px] font-display uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
