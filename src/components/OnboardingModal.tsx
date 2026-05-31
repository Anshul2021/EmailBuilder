"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image1 from "@/Assets/01.png";
import Image2 from "@/Assets/02.png";
import Image3 from "@/Assets/03.png";

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
    const [currentStep, setCurrentStep] = useState(0);

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

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleComplete}
                    className="absolute inset-0 bg-transparent"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 16 }}
                    transition={{ type: "spring", duration: 0.45, bounce: 0.1 }}
                    className="relative bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden max-w-xl w-full border border-slate-100 z-10"
                >
                    {/* Close button */}
                    <button
                        onClick={handleComplete}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors z-20"
                        title="Skip onboarding"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="p-6 md:p-8 flex flex-col items-center">
                        {/* Current step visual container */}
                        <div className="w-full relative h-[240px] md:h-[280px] bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden mb-6 group shadow-inner">
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
                        <div className="w-full text-center space-y-2 select-none min-h-[100px] flex flex-col items-center">
                         <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-1.5"
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
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
