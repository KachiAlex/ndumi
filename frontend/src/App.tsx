import { useState, useEffect } from "react";
import { useReveal } from "./hooks/useReveal";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { Channels } from "./components/Channels";
import { Languages } from "./components/Languages";
import { CallFlow } from "./components/CallFlow";
import { WhatsApp } from "./components/WhatsApp";
import { Developer } from "./components/Developer";
import { CTABand } from "./components/CTABand";
import { Footer } from "./components/Footer";
import { MeetingRoom } from "./components/MeetingRoom";

export default function App() {
  useReveal();

  const [route, setRoute] = useState<string>(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const isMeeting = route === "#meeting" || route === "#/meeting";

  if (isMeeting) {
    return <MeetingRoom onLeave={() => { window.location.hash = ""; }} />;
  }

  return (
    <div className="min-h-screen bg-bg text-text font-sans">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-panel focus:border focus:border-line focus:px-4 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Hero />
        <Channels />
        <Languages />
        <CallFlow />
        <WhatsApp />
        <Developer />
        <CTABand />
      </main>
      <Footer />
    </div>
  );
}
