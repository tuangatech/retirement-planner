// src/App.tsx - Main Application Component

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { InputsProvider } from '@/contexts/InputsContext';
import { ResultsProvider } from '@/contexts/ResultsContext';
import LandingPage from '@/pages/LandingPage';
import WizardPage from '@/pages/WizardPage';
import ResultsPage from '@/pages/ResultsPage';
import ScenariosPage from './pages/ScenariosPage';
import ComparisonPage from './pages/ComparisonPage';
import StateTaxComparisonPage from './pages/StateTaxComparisonPage';

// Trackpad/mouse-wheel scroll over a focused number input steps its value instead of
// scrolling the page (Chrome/Safari default). Blur it on wheel so scroll always scrolls.
function useBlurNumberInputOnWheel() {
    useEffect(() => {
        function handleWheel() {
            const el = document.activeElement;
            if (el instanceof HTMLInputElement && el.type === 'number') {
                el.blur();
            }
        }
        document.addEventListener('wheel', handleWheel, { passive: true });
        return () => document.removeEventListener('wheel', handleWheel);
    }, []);
}

// Client-side navigation (<Link>, navigate()) doesn't reset scroll position the way a full
// page load does, so a new route can render wherever the previous page was scrolled to.
// WizardPage already smooth-scrolls itself between steps, so it's excluded here.
function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        if (!pathname.startsWith('/wizard')) {
            window.scrollTo(0, 0);
        }
    }, [pathname]);
    return null;
}

function App() {
    useBlurNumberInputOnWheel();

    return (
        <BrowserRouter>
            <InputsProvider>
                <ResultsProvider>
                    <ScrollToTop />
                    <Routes>
                        {/* Landing page at root */}
                        <Route path="/" element={<LandingPage />} />

                        {/* Wizard with step parameter */}
                        <Route path="/wizard/:step" element={<WizardPage />} />

                        {/* Redirect /wizard to /wizard/1 */}
                        <Route path="/wizard" element={<Navigate to="/wizard/1" replace />} />

                        {/* Results page */}
                        <Route path="/results" element={<ResultsPage />} />

                        {/* Catch-all redirect to landing */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                        
                        <Route path="/scenarios" element={<ScenariosPage />} />
                        <Route path="/compare" element={<ComparisonPage />} />
                        <Route path="/state-tax-comparison" element={<StateTaxComparisonPage />} />
                    </Routes>
                </ResultsProvider>
            </InputsProvider>
        </BrowserRouter>
    );
}

export default App;