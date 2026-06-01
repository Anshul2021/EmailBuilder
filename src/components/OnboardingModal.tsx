"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image1 from "@/Assets/01.webp";
import Image2 from "@/Assets/02.webp";
import Image3 from "@/Assets/03.webp";
import EnergeticImg from "@/Assets/energetic.webp";
import ExhaustedImg from "@/Assets/sad.webp";
import confetti from "canvas-confetti";

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    startWithTutorial?: boolean;
    onRegistrationSuccess?: (name: string, contact: string) => void;
    readOnly?: boolean;
    initialName?: string;
    initialContact?: string;
}

type OnboardingView = "contact" | "sad_skip" | "tutorial";

export function OnboardingModal({ 
    isOpen, 
    onClose, 
    startWithTutorial = false, 
    onRegistrationSuccess,
    readOnly = false,
    initialName = "",
    initialContact = ""
}: OnboardingModalProps) {
    const [view, setView] = useState<OnboardingView>("contact");
    const [currentStep, setCurrentStep] = useState(0);
    const [name, setName] = useState(initialName);
    const [contactInfo, setContactInfo] = useState(initialContact);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sync view state when modal opens
    useEffect(() => {
        if (isOpen) {
            setView(startWithTutorial ? "tutorial" : "contact");
            setCurrentStep(0);
            setName(initialName);
            setContactInfo(initialContact);
        }
    }, [isOpen, startWithTutorial, initialName, initialContact]);

    const steps = [
        {
            title: "Go to any email template website",
            description: "Browse your favorite email design galleries or template sites to find inspiration.",
            image: Image1,
            badge: "Step 1"
        },
        {
            title: "Copy the template you like",
            description: "Simply copy the template structure, design, or layout to prepare it for editing.",
            image: Image2,
            badge: "Step 2"
        },
        {
            title: "Paste it here & click generate",
            description: "Paste the template inside our smart prompt bar, and watch the editor make it fully editable.",
            image: Image3,
            badge: "Step 3"
        }
    ];

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = () => {
        try {
            localStorage.setItem("ai_email_builder_onboarded", "true");
        } catch (e) {
            console.warn(e);
        }
        onClose();
    };

    const handleRegister = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        // In readOnly mode, we don't save anything, just proceed to tutorial
        if (readOnly) {
            setView("tutorial");
            return;
        }

        // If the user attempts to proceed without adding details, redirect to sad_skip view
        if (!name.trim() && !contactInfo.trim()) {
            setView("sad_skip");
            return;
        }

        setIsSubmitting(true);
        try {
            await fetch("/api/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), contact_info: contactInfo.trim() }),
            });
            if (onRegistrationSuccess) {
                onRegistrationSuccess(name.trim(), contactInfo.trim());
            }
        } catch (err) {
            console.error("Error saving onboarding contact info:", err);
        } finally {
            setIsSubmitting(false);
            
            // Trigger a beautiful, celebratory confetti burst
            confetti({
                particleCount: 120,
                spread: 80,
                origin: { y: 0.6 },
                colors: ["#7c3aed", "#a78bfa", "#f43f5e", "#fb7185", "#38bdf8", "#60a5fa"]
            });

            // Transition to tutorial
            setView("tutorial");
        }
    };

    const handleProceedWithoutDetails = async () => {
        setIsSubmitting(true);
        try {
            // Silently record the IP to avoid prompt in future sessions
            await fetch("/api/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "", contact_info: "" }),
            });
            if (onRegistrationSuccess) {
                onRegistrationSuccess("", "");
            }
        } catch (err) {
            console.error("Error skipping onboarding registration:", err);
        } finally {
            setIsSubmitting(false);
            setView("tutorial");
        }
    };

    const handleClose = async () => {
        // Silently complete registration on exit so we never nag them again
        if (view !== "tutorial" && !readOnly) {
            try {
                fetch("/api/onboarding", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: "", contact_info: "" }),
                });
                if (onRegistrationSuccess) {
                    onRegistrationSuccess("", "");
                }
            } catch (e) {
                console.warn(e);
            }
        }
        handleComplete();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-transparent"
                />

                <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 16 }}
                    transition={{ type: "spring", duration: 0.5, bounce: 0.1 }}
                    className="relative bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden max-w-lg w-full border border-slate-100 z-10"
                >
                    {/* Close button */}
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors z-20"
                        title="Skip onboarding"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <AnimatePresence mode="wait">
                        {view === "contact" && (
                            <motion.div
                                key="contact-form"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.25 }}
                                className="pt-4 p-6 flex flex-col items-center"
                            >
                                {/* Cute Mascot Gentle Bobbing Animation */}
                                <motion.div
                                    animate={{
                                        y: [0, -8, 0],
                                        rotate: [-1.5, 1.5, -1.5]
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="w-20 h-20 md:w-24 md:h-24 mb-4 select-none pointer-events-none drop-shadow-md"
                                >
                                    <img
                                        src={EnergeticImg.src}
                                        alt="Welcome"
                                        className="w-full h-full object-contain"
                                    />
                                </motion.div>

                                <div className="text-center mb-6 space-y-1 w-full">
                                    <h3 className="text-xl md:text-2xl font-bold text-slate-900">
                                        Welcome to AI Email Builder! 👋
                                    </h3>
                                    <p className="text-xs md:text-sm text-slate-500 leading-relaxed whitespace-normal md:whitespace-nowrap w-full text-center">
                                        Before we show you around, we'd love to know who you are!
                                    </p>
                                </div>

                                <form onSubmit={handleRegister} className="w-full space-y-4 max-w-sm">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            disabled={readOnly}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g. Gyan Sharma"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-slate-800 placeholder-slate-400 disabled:bg-slate-100 disabled:opacity-70"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                            Contact Info
                                        </label>
                                        <input
                                            type="text"
                                            value={contactInfo}
                                            disabled={readOnly}
                                            onChange={(e) => setContactInfo(e.target.value)}
                                            placeholder="Email, LinkedIn, or Twitter handle"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all text-slate-800 placeholder-slate-400 disabled:bg-slate-100 disabled:opacity-70"
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
                                        >
                                            {isSubmitting ? (
                                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <span>{readOnly ? "Continue" : ((name.trim() || contactInfo.trim()) ? "Submit & Continue" : "Continue")}</span>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {view === "sad_skip" && (
                            <motion.div
                                key="sad-skip"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.25 }}
                                className="pt-4 p-6 flex flex-col items-center"
                            >
                                {/* Exhausted Mascot Gentle Bobbing Animation */}
                                <motion.div
                                    animate={{
                                        y: [0, -6, 0],
                                        rotate: [-1.5, 1.5, -1.5]
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="w-20 h-20 md:w-24 md:h-24 mb-4 select-none pointer-events-none drop-shadow-md"
                                >
                                    <img
                                        src={ExhaustedImg.src}
                                        alt="Sad mascot"
                                        className="w-full h-full object-contain"
                                    />
                                </motion.div>

                                <div className="text-center mb-6 space-y-1 w-full">
                                    <h3 className="text-xl md:text-2xl font-bold text-slate-900">
                                        No worries!
                                    </h3>
                                    <p className="text-xs md:text-sm text-slate-500 leading-relaxed whitespace-normal md:whitespace-nowrap w-full text-center">
                                        Just enjoy the platform!
                                    </p>
                                </div>

                                <div className="w-full max-w-sm pt-2 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setView("contact")}
                                        className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-semibold flex items-center justify-center transition-all active:scale-[0.99]"
                                    >
                                        <span>Go Back</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleProceedWithoutDetails}
                                        disabled={isSubmitting}
                                        className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center transition-all active:scale-[0.99] disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <span>Proceed</span>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {view === "tutorial" && (
                            <motion.div
                                key="tutorial-steps"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.25 }}
                                className="pt-4 p-6 flex flex-col items-center"
                            >
                                {/* Current step visual container */}
                                <div className="w-full relative h-[200px] md:h-[280px] bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden mb-6 group shadow-inner">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={currentStep}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.25, ease: "easeInOut" }}
                                            className="w-full h-full flex items-center justify-center p-4"
                                        >
                                            <img
                                                src={steps[currentStep].image.src}
                                                alt={steps[currentStep].title}
                                                className="max-w-full max-h-full object-contain rounded-lg shadow-sm hover:scale-[1.02] transition-transform duration-300 select-none pointer-events-none"
                                            />
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                {/* Title & Description with Badge */}
                                <div className="w-full text-center space-y-2 select-none min-h-[90px] flex flex-col items-center">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={currentStep}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            transition={{ duration: 0.2 }}
                                            className="space-y-2"
                                        >
                                            <h3 className="text-base md:text-lg font-bold text-slate-800 tracking-tight leading-tight">
                                                {steps[currentStep].title}
                                            </h3>
                                            <p className="text-xs md:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                                                {steps[currentStep].description}
                                            </p>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                {/* Footer Controls */}
                                <div className="w-full border-t border-slate-100 mt-6 pt-5 flex items-center justify-between">
                                    {/* Step indicators */}
                                    <div className="flex gap-1.5">
                                        {steps.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setCurrentStep(idx)}
                                                className={`h-2 rounded-full transition-all duration-300 ${
                                                    idx === currentStep ? "w-6 bg-violet-600" : "w-2 bg-slate-200 hover:bg-slate-300"
                                                }`}
                                            />
                                        ))}
                                    </div>

                                    {/* Navigation buttons */}
                                    <div className="flex gap-2">
                                        {currentStep > 0 ? (
                                            <button
                                                type="button"
                                                onClick={handleBack}
                                                className="h-8 md:h-9 px-4 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 flex items-center gap-1.5 transition-colors active:scale-[0.98]"
                                            >
                                                <ChevronLeft className="w-3.5 h-3.5" />
                                                <span>Back</span>
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleComplete}
                                                className="h-8 md:h-9 px-4 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                Skip
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={handleNext}
                                            className="h-8 md:h-9 px-5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all active:scale-[0.98] hover:shadow-lg"
                                        >
                                            <span>{currentStep === steps.length - 1 ? "Get Started" : "Next"}</span>
                                            {currentStep === steps.length - 1 ? (
                                                <Check className="w-3.5 h-3.5" />
                                            ) : (
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
