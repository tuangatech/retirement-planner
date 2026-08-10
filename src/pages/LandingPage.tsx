import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Footer } from '../components/common/Footer';

function Logo({ size = 'md', variant = 'full' }: { size?: 'sm' | 'md' | 'lg', variant?: 'full' | 'icon' }) {
    const heights = { sm: 'h-7', md: 'h-9', lg: 'h-14' };
    const h = `${heights[size]} w-auto`;

    if (variant === 'icon') {
        return <img src="/logo.png" alt="Will It Last?" className={h} />;
    }

    return <img src="/logo-app.png" alt="Will It Last? Retirement Planner" className={h} />;
}

export default function LandingPage() {
    const navigate = useNavigate();

    const handleStart = () => {
        navigate('/wizard/1');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
            {/* Navigation */}
            <nav className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex justify-between items-center h-16">
                        <Logo size="lg" variant="full" />
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleStart}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                            >
                                Start Planning
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="max-w-6xl mx-auto px-4 pt-20 pb-16">
                <div className="text-center max-w-4xl mx-auto">
                    <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
                        Retirement Simulator That Shows Its Work
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-600 mb-4">
                        A free retirement simulator that's upfront about <span className="font-semibold text-slate-900">what it models</span> and <span className="font-semibold text-blue-600">how it works</span>.
                    </p>

                    <p className="text-lg text-slate-500 mb-10">
                        Built for early retirees, FIRE planners, and skeptics who've been burned by oversimplified tools.
                    </p>

                    {/* Trust Bar */}
                    <div className="flex flex-wrap justify-center gap-6 mb-10 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span>No signup required</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span>No data collection</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span>Every term explained as you go</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span>100% free forever</span>
                        </div>
                    </div>

                    {/* CTA Button */}
                    <button
                        onClick={handleStart}
                        className="group inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all transform hover:scale-105 text-lg font-semibold shadow-lg hover:shadow-xl"
                    >
                        Start Your Free Retirement Analysis
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <p className="text-sm text-slate-500 mt-4">
                        Takes 2 minutes • See results instantly • Save scenarios locally
                    </p>
                </div>
            </section>

            {/* See It In Action */}
            <section className="bg-white py-20">
                <div className="max-w-6xl mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 mb-4">
                        See It In Action
                    </h2>
                    <p className="text-lg text-slate-600 text-center mb-12 max-w-3xl mx-auto">
                        Real results from the simulator — success odds, cash flow, and the full year-by-year breakdown.
                    </p>

                    <ScreenshotCarousel />
                </div>
            </section>

            {/* Who This Is For */}
            <section className="bg-white py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-center text-slate-900 mb-10">
                        Who This Is For (And Who It's Not)
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-3">Good fit</p>
                            <ul className="space-y-2 text-slate-700">
                                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" /><span>Early retirees &amp; FIRE planners (age 40–65)</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" /><span>DIY investors who want to stress-test their plan</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" /><span>Anyone with pre-Medicare healthcare exposure</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" /><span>Couples filing jointly (accounts modeled as pooled)</span></li>
                                <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" /><span>Skeptics who want to see the math</span></li>
                            </ul>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-3">Not the right tool for</p>
                            <ul className="space-y-2 text-slate-700">
                                <li className="flex items-start gap-2"><XCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-1" /><span>Survivor benefits or per-spouse account strategies</span></li>
                                <li className="flex items-start gap-2"><XCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-1" /><span>Long-term care or estate planning</span></li>
                                <li className="flex items-start gap-2"><XCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-1" /><span>Replacing a CFP or professional advice</span></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="bg-gradient-to-br from-blue-50 to-slate-50 py-20">
                <div className="max-w-6xl mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 mb-4">
                        How It Works
                    </h2>
                    <p className="text-lg text-slate-600 text-center mb-12 max-w-3xl mx-auto">
                        A simple 4-step wizard guides you through your retirement plan
                    </p>

                    <div className="grid md:grid-cols-3 gap-8 mb-12">
                        <StepCard number="1" title="Your Plan" description="Filing status, your state, your retirement timeline, and planned spending across three retirement phases" />
                        <StepCard number="2" title="Savings & Income" description="Add your investment accounts (401k, Roth, HSA, taxable) and income sources (Social Security, pensions)" />
                        <StepCard number="3-4" title="Healthcare & Strategy" description="Model pre-Medicare and Medicare costs, set your federal tax rate and withdrawal order, then run Monte Carlo analysis" />
                    </div>

                </div>
            </section>

            {/* Final CTA */}
            <section className="bg-gradient-to-br from-blue-600 to-blue-700 py-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                        Ready to Plan Your Retirement Honestly?
                    </h2>
                    <p className="text-xl text-blue-100 mb-8">
                        No signup. No data collection. Just honest, transparent retirement planning.
                    </p>
                    <button
                        onClick={handleStart}
                        className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-all transform hover:scale-105 text-lg font-semibold shadow-lg hover:shadow-xl"
                    >
                        Start Your Free Analysis Now
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <p className="text-sm text-blue-200 mt-6">
                        Takes 2 minutes • See results instantly • 100% free forever
                    </p>
                    <p className="text-sm text-blue-100 mt-4">
                        Just want to compare state taxes to pick the right state for your retirement?{' '}
                        <Link to="/state-tax-comparison" className="font-semibold text-white underline hover:no-underline">
                            Compare state income taxes →
                        </Link>
                    </p>
                </div>
            </section>

            <Footer />
        </div>
    );
}


const SCREENSHOTS = [
    {
        src: '/screenshots/summary.png',
        title: 'Summary Dashboard',
        description: 'Your success probability at a glance, with portfolio outcomes across worst/median/best-case scenarios.',
    },
    {
        src: '/screenshots/cash-flow.png',
        title: 'Cash Flow',
        description: 'Every dollar in and out, year by year — income, expenses, taxes, and portfolio balance.',
    },
    {
        src: '/screenshots/annual-breakdown.png',
        title: 'Annual Breakdown',
        description: 'The full year-by-year table behind every projection, exportable to CSV or JSON.',
    },
];

const AUTOPLAY_MS = 5000;

function ScreenshotCarousel() {
    const [index, setIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const total = SCREENSHOTS.length;
    const goTo = (i: number) => setIndex((i + total) % total);
    const slide = SCREENSHOTS[index];

    // Re-running on every `index` change (manual or auto) means a manual click
    // naturally restarts the countdown instead of the next tick landing early.
    useEffect(() => {
        if (isPaused) return;
        const timer = setTimeout(() => goTo(index + 1), AUTOPLAY_MS);
        return () => clearTimeout(timer);
    }, [index, isPaused]);

    return (
        <div
            className="max-w-4xl mx-auto"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
        >
            <div className="relative bg-slate-50 border-2 border-slate-200 rounded-2xl overflow-hidden shadow-lg h-[420px] sm:h-[520px] flex items-center justify-center">
                <img src={slide.src} alt={slide.title} className="max-w-full max-h-full object-contain" />
                <button
                    type="button"
                    onClick={() => goTo(index - 1)}
                    aria-label="Previous screenshot"
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-700 rounded-full p-2 shadow-md transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                    type="button"
                    onClick={() => goTo(index + 1)}
                    aria-label="Next screenshot"
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-700 rounded-full p-2 shadow-md transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            <div className="text-center mt-6 min-h-[64px]">
                <h3 className="text-xl font-bold text-slate-900 mb-1">{slide.title}</h3>
                <p className="text-slate-600">{slide.description}</p>
            </div>

            <div className="flex justify-center gap-2 mt-4">
                {SCREENSHOTS.map((s, i) => (
                    <button
                        key={s.src}
                        type="button"
                        onClick={() => goTo(i)}
                        aria-label={`Go to ${s.title}`}
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${i === index ? 'bg-blue-600' : 'bg-slate-300 hover:bg-slate-400'}`}
                    />
                ))}
            </div>
        </div>
    );
}

function StepCard({ number, title, description }: { number: string, title: string, description: string }) {
    return (
        <div className="bg-white rounded-xl border-2 border-blue-200 p-6 hover:shadow-lg transition-shadow text-center">
            <div className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-sm font-bold px-4 py-1.5 rounded-full mb-4">
                <span>Step {number}</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-slate-600 mb-4">{description}</p>
        </div>
    );
}