import { useState } from "react";
import { Send, AlertCircle, Zap, ArrowLeft, GraduationCap, Lightbulb, HandHeart, Calendar, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ActivityFormProps {
  text: string;
  onChange: (text: string) => void;
  onSubmit: (finalText: string) => void;
  isWalletConnected: boolean;
  isSubmitting: boolean;
  onBack?: () => void;
}

const STEPS = [
  { id: 1, label: "Details" },
  { id: 2, label: "Description" },
  { id: 3, label: "Evidence" },
];

const CATEGORIES = [
  {
    id: "tutoring",
    label: "Tutoring",
    desc: "Mentoring & peer support",
    xlm: 5,
    icon: GraduationCap,
    hint: "I tutored a classmate in math today for 2 hours. We covered calculus limits and worked through practice problems."
  },
  {
    id: "workshop",
    label: "Workshop",
    desc: "Skill-building sessions",
    xlm: 8,
    icon: Lightbulb,
    hint: "I attended a workshop on blockchain development today. I learned about Stellar and Soroban smart contracts."
  },
  {
    id: "volunteering",
    label: "Volunteering",
    desc: "Community service",
    xlm: 10,
    icon: HandHeart,
    hint: "I volunteered at the campus library today for 3 hours. I helped organize the science section and assisted visitors."
  },
  {
    id: "event",
    label: "Event Participation",
    desc: "Attending official events",
    xlm: 3,
    icon: Calendar,
    hint: "I participated in the university debate championship today. Our team discussed public policy and critical debate rules."
  }
];

// Custom Coin Icon representing Stellar XLM
const CoinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v8" />
    <path d="M14.5 10H11a1.5 1.5 0 0 0 0 3h2a1.5 1.5 0 0 1 0 3H9.5" />
  </svg>
);

// Dynamic, non-hardcoded Step Tracker Component
export function StepTracker({ currentStep }: { currentStep: number }) {
  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex items-center w-full max-w-[280px] relative px-2">
        {/* Connecting Lines */}
        <div className="absolute top-[16px] left-[20px] right-[20px] h-[3px] bg-[#e3e5eb] -z-10" />
        
        {/* Active Line Progress */}
        <div
          className="absolute top-[16px] left-[20px] h-[3px] bg-[#001540] transition-all duration-500 ease-out -z-10"
          style={{
            width:
              currentStep === 1
                ? "0%"
                : currentStep === 2
                ? "50%"
                : "100%",
          }}
        />

        {/* Step Nodes */}
        <div className="flex justify-between w-full">
          {STEPS.map((step) => {
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            
            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[13px] transition-all duration-300 ${
                    isCompleted || isActive
                      ? "bg-[#001540] text-white"
                      : "bg-[#e3e5eb] text-[#8e95a5]"
                  } ${
                    isActive ? "ring-[6px] ring-[#001540]/10 shadow-sm" : ""
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" strokeWidth={3} />
                  ) : (
                    step.id
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between w-full max-w-[320px] px-1 mt-2">
        {STEPS.map((step) => {
          const isActive = currentStep === step.id;
          return (
            <span
              key={step.id}
              className={`text-[11px] font-bold tracking-wide w-24 text-center transition-colors duration-300 ${
                isActive ? "text-[#001540] font-extrabold" : "text-[#8e95a5]"
              }`}
            >
              {step.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function ActivityForm({
  text,
  onChange,
  onSubmit,
  isWalletConnected,
  isSubmitting,
  onBack,
}: ActivityFormProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [evidenceLink, setEvidenceLink] = useState<string>("");

  const handleCategorySelect = (catId: string, hint: string) => {
    setSelectedCategory(catId);
    // Fill the description text template if it is currently empty or has a different category hint
    if (!text.trim() || CATEGORIES.some(c => c.hint === text)) {
      onChange(hint);
    }
    setCurrentStep(2);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const handleNextToEvidence = () => {
    if (text.trim().length >= 10) {
      setCurrentStep(3);
    }
  };

  const handleFormSubmit = () => {
    const cleanCategory = selectedCategory || "unknown";
    const cleanText = text.trim();
    const cleanEvidence = evidenceLink.trim();
    
    // Combine fields into the unified activityText format expected by agents
    const combinedText = `[${cleanCategory}] ${cleanText}${cleanEvidence ? ` (Evidence: ${cleanEvidence})` : ""}`;
    onSubmit(combinedText);
  };

  const currentCategoryObj = CATEGORIES.find(c => c.id === selectedCategory);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="p-5 space-y-6 flex flex-col min-h-[500px]"
    >
      {/* Header with ArrowLeft */}
      <div className="flex items-center justify-between pb-1 border-b border-gray-100/50">
        <button
          onClick={handleBack}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-[#00162b] active:scale-95"
        >
          <ArrowLeft className="w-5.5 h-5.5" strokeWidth={2.5} />
        </button>
        <h2 className="text-[18px] font-extrabold text-[#00162b] font-display text-center flex-1 pr-6">
          Submit Activity
        </h2>
      </div>

      {/* Step Tracker */}
      <StepTracker currentStep={currentStep} />

      {/* Animated Step Content */}
      <div className="flex-1 flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step-categories"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {/* Category selector titles */}
              <div className="text-center py-2">
                <h3 className="text-[17px] font-extrabold text-[#00162b] font-display">
                  What did you do?
                </h3>
                <p className="text-[13px] text-gray-500 font-semibold leading-relaxed mt-1.5 px-4">
                  Select the category that best matches your activity.
                </p>
              </div>

              {/* Category Cards */}
              <div className="space-y-4 pb-4">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <motion.div
                      key={cat.id}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleCategorySelect(cat.id, cat.hint)}
                      className={`bg-white rounded-[28px] p-5 border flex flex-col gap-4 shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 ${
                        isSelected ? "border-[#001540] ring-2 ring-[#001540]/5 bg-[#fcfdff]" : "border-[#e5e7eb] hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="w-11 h-11 rounded-full bg-[#eef2ff] flex items-center justify-center text-[#0f3b8c] shrink-0 shadow-inner">
                          <Icon className="w-5.5 h-5.5" strokeWidth={2.2} />
                        </div>
                        <div className="flex-1 ml-4 text-left">
                          <h4 className="text-[16px] font-bold text-[#00162b]">{cat.label}</h4>
                          <p className="text-[12px] text-gray-500 font-semibold mt-0.5">{cat.desc}</p>
                        </div>
                      </div>

                      {/* Reward button inside card */}
                      <div className="flex items-center justify-center gap-1.5 py-2.5 bg-[#ffbe42] hover:brightness-105 text-[#00162b] font-extrabold text-[12px] uppercase tracking-wider rounded-full shadow-sm">
                        <CoinIcon />
                        <span>+{cat.xlm} XLM</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step-description"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div className="text-center py-2">
                <h3 className="text-[17px] font-extrabold text-[#00162b] font-display">
                  Describe your activity
                </h3>
                <p className="text-[13px] text-gray-500 font-semibold leading-relaxed mt-1.5 px-4">
                  Describe your contribution — our agents process and reward you on-chain instantly.
                </p>
              </div>

              {/* Text Area Card */}
              <div className="bg-white rounded-[28px] border border-gray-200 p-5 shadow-sm space-y-4">
                <textarea
                  value={text}
                  onChange={(e) => onChange(e.target.value)}
                  disabled={isSubmitting || !isWalletConnected}
                  placeholder="e.g., I volunteered at the local animal shelter for 3 hours yesterday."
                  rows={6}
                  className="w-full px-4 py-3 rounded-[20px] bg-gray-50/50 border border-gray-200 text-[#00162b] placeholder:text-gray-400 focus:outline-none focus:border-[#001540] focus:ring-2 focus:ring-[#001540]/10 focus:bg-white transition-all resize-none text-[14px] leading-relaxed"
                />

                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#ffbe42] shrink-0" strokeWidth={2.5} />
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Must be at least 10 characters
                  </span>
                </div>
              </div>

              {/* Navigation button */}
              <button
                onClick={handleNextToEvidence}
                disabled={text.trim().length < 10}
                className="w-full bg-[#001540] hover:bg-[#000f30] disabled:bg-gray-200 disabled:text-gray-400 text-white py-4 rounded-[24px] font-extrabold text-[14px] uppercase tracking-wider transition-all active:scale-[0.98] cursor-pointer shadow-md shadow-[#001540]/10"
              >
                Continue to Evidence
              </button>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step-evidence"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div className="text-center py-2">
                <h3 className="text-[17px] font-extrabold text-[#00162b] font-display">
                  Provide evidence
                </h3>
                <p className="text-[13px] text-gray-500 font-semibold leading-relaxed mt-1.5 px-4">
                  Add proof details or links and review your activity before submission.
                </p>
              </div>

              {/* Evidence input card */}
              <div className="bg-white rounded-[28px] border border-gray-200 p-5 shadow-sm space-y-3">
                <label className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider px-1">
                  Evidence Link (Optional)
                </label>
                <input
                  type="text"
                  value={evidenceLink}
                  onChange={(e) => setEvidenceLink(e.target.value)}
                  placeholder="e.g. https://github.com/... or Google Drive link"
                  className="w-full px-4 py-3 rounded-[20px] bg-gray-50/50 border border-gray-200 text-[#00162b] placeholder:text-gray-400 focus:outline-none focus:border-[#001540] focus:ring-2 focus:ring-[#001540]/10 focus:bg-white transition-all text-[14px]"
                />
              </div>

              {/* Review card */}
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-[28px] p-5 space-y-3.5 shadow-inner">
                <h4 className="text-[11px] font-extrabold text-[#001540] uppercase tracking-wider px-1">
                  Submission Summary
                </h4>
                
                <div className="space-y-2.5 text-[13px]">
                  <div className="flex justify-between items-baseline border-b border-gray-200/50 pb-2">
                    <span className="text-gray-500 font-semibold">Category:</span>
                    <span className="font-bold text-[#00162b]">
                      {currentCategoryObj?.label || "Unknown"}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline border-b border-gray-200/50 pb-2">
                    <span className="text-gray-500 font-semibold">Est. Reward:</span>
                    <span className="font-extrabold text-[#001540] bg-[#ffbe42]/20 px-2.5 py-0.5 rounded-full text-[12px] flex items-center gap-1">
                      <CoinIcon />
                      +{currentCategoryObj?.xlm || 0} XLM
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 border-b border-gray-200/50 pb-2.5">
                    <span className="text-gray-500 font-semibold">Description:</span>
                    <p className="text-gray-700 italic bg-white/50 border border-gray-100 p-3 rounded-[16px] text-[12.5px] leading-relaxed line-clamp-3">
                      "{text}"
                    </p>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-semibold">Evidence:</span>
                    <span className="text-[12px] text-gray-700 truncate max-w-[180px] font-mono bg-white px-2 py-0.5 rounded border border-gray-100">
                      {evidenceLink.trim() ? evidenceLink.trim() : "None provided"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit warning */}
              {!isWalletConnected && (
                <div className="flex items-start gap-3 p-4 rounded-[20px] bg-red-50 border border-red-100 text-red-800">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0 text-red-500 mt-0.5" />
                  <p className="text-[12px] font-semibold leading-relaxed">
                    Wallet disconnected. Please connect on the Wallet tab to sign and execute this on-chain transaction.
                  </p>
                </div>
              )}

              {/* Submit CTA */}
              <button
                onClick={handleFormSubmit}
                disabled={!isWalletConnected || isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-[#ffbe42] hover:brightness-105 disabled:bg-gray-200 disabled:text-gray-400 text-[#00162b] py-4 rounded-[24px] font-extrabold text-[15px] uppercase tracking-wider transition-all active:scale-[0.98] disabled:cursor-not-allowed shadow-md shadow-[#ffbe42]/10 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[#00162b]/30 border-t-[#00162b] rounded-full animate-spin" />
                    <span>Submitting to Pipeline…</span>
                  </>
                ) : (
                  <>
                    <span>Submit to Soroban</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
